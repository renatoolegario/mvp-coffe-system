import { createHash, createHmac, randomUUID } from "crypto";
import { query, withTransaction } from "../infra/database";
import { decryptIfNeeded } from "../utils/crypto";
import { normalizeCpfCnpj } from "../utils/document";
import { getIntegration } from "./integrations";

const ASAAS_API_BASE = "https://api.asaas.com/v3";
const ASAAS_EXTERNAL_REFERENCE_MAX_LENGTH = 100;

const WEBHOOK_EVENTS = [
  "PAYMENT_CREATED",
  "PAYMENT_UPDATED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
  "PAYMENT_RESTORED",
];

const TERMINAL_PAYMENT_STATUSES = new Set([
  "RECEIVED",
  "CONFIRMED",
  "RECEIVED_IN_CASH",
  "REFUNDED",
  "DELETED",
]);

const RECEIVED_PAYMENT_EVENTS = new Set([
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
]);

const RECEIVED_PAYMENT_STATUSES = new Set([
  "CONFIRMED",
  "RECEIVED",
  "RECEIVED_IN_CASH",
]);

const isValidDateOnly = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());

const toDateOnly = (value) => {
  const raw = String(value || "").trim();
  if (isValidDateOnly(raw)) return raw;
  if (!raw) return "";

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const toTimestampValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (isValidDateOnly(raw)) {
    return new Date(`${raw}T12:00:00-03:00`).toISOString();
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
};

const formatDateInTimeZone = (date, timeZone = "America/Sao_Paulo") => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
};

const getTomorrowDateOnlyInSaoPaulo = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return formatDateInTimeZone(date, "America/Sao_Paulo");
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizePhone = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(-11);

const normalizeOptionalText = (value) => {
  const normalized = String(value || "").trim();
  return normalized || null;
};

const normalizeAsaasBillingType = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (["BOLETO", "PIX", "UNDEFINED"].includes(normalized)) {
    return normalized;
  }

  return "BOLETO";
};

const normalizeAsaasEvent = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const normalizeAsaasStatus = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const isAsaasPaymentSettled = ({ event, status }) =>
  RECEIVED_PAYMENT_EVENTS.has(normalizeAsaasEvent(event)) ||
  RECEIVED_PAYMENT_STATUSES.has(normalizeAsaasStatus(status));

const resolveAsaasReceiptMethod = (value) => {
  switch (normalizeAsaasStatus(value)) {
    case "PIX":
      return "PIX";
    case "BOLETO":
      return "BOLETO";
    case "CREDIT_CARD":
      return "CREDITO";
    case "DEBIT_CARD":
      return "DEBITO";
    case "RECEIVED_IN_CASH":
      return "DINHEIRO";
    case "TRANSFER":
    case "TRANSFERENCIA":
    case "BANK_TRANSFER":
      return "TRANSFERENCIA";
    default:
      return normalizeOptionalText(value) || "ASAAS";
  }
};

const resolveAsaasReceiptAt = (payment = {}) =>
  toTimestampValue(payment?.clientPaymentDate) ||
  toTimestampValue(payment?.paymentDate) ||
  toTimestampValue(payment?.confirmedDate) ||
  toTimestampValue(payment?.creditDate) ||
  new Date().toISOString();

const resolveAsaasChargeOriginalAmount = (payment = {}) => {
  const originalValue = payment?.originalValue;

  if (
    originalValue !== null &&
    originalValue !== undefined &&
    String(originalValue).trim() !== ""
  ) {
    return toNumber(originalValue);
  }

  return toNumber(payment?.value);
};

const resolveAsaasChargeReceivedAmount = ({ payment = {}, event, status }) => {
  if (
    !isAsaasPaymentSettled({
      event,
      status: status || payment?.status,
    })
  ) {
    return null;
  }

  const paidValue = payment?.value;
  if (
    paidValue === null ||
    paidValue === undefined ||
    String(paidValue).trim() === ""
  ) {
    return null;
  }

  return toNumber(paidValue);
};

const resolveAsaasReceivedAmount = (payment = {}, fallbackValue = 0) => {
  const directAmount = toNumber(payment?.value);
  if (directAmount > 0) return directAmount;
  return toNumber(fallbackValue);
};

const parseJsonResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: text };
  }
};

const getAsaasBaseUrl = () => ASAAS_API_BASE;

const buildServiceError = (message, statusCode = 400, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) {
    error.details = details;
  }
  return error;
};

const getAsaasRuntime = async () => {
  const integration = await getIntegration("asaas");

  if (!integration.configured || !integration.key) {
    throw buildServiceError(
      "Integração ASAAS não configurada.",
      400,
    );
  }

  return {
    apiKey: integration.key,
    environment: "production",
    config: integration.config,
  };
};

const asaasRequest = async ({
  apiKey,
  environment,
  method = "GET",
  path,
  searchParams,
  body,
}) => {
  const url = new URL(`${getAsaasBaseUrl()}${path}`);

  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || String(value).trim() === "") {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      access_token: apiKey,
    },
    body: method === "GET" || body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const apiMessage =
      payload?.errors?.[0]?.description ||
      payload?.message ||
      payload?.error ||
      "Erro ao comunicar com a API do ASAAS.";
    throw buildServiceError(apiMessage, response.status, payload);
  }

  return payload;
};

const getListData = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const loadClienteById = async (clienteId) => {
  const result = await query(
    `
      SELECT
        id,
        nome,
        email,
        cpf_cnpj,
        telefone,
        endereco,
        asaas_customer_id
      FROM clientes
      WHERE id = $1
      LIMIT 1
    `,
    [clienteId],
  );

  const row = result.rows[0];
  if (!row) {
    throw buildServiceError("Cliente não encontrado.", 404);
  }

  return {
    ...row,
    nome: decryptIfNeeded(row.nome),
    email: decryptIfNeeded(row.email),
    cpf_cnpj: decryptIfNeeded(row.cpf_cnpj),
    telefone: decryptIfNeeded(row.telefone),
    endereco: decryptIfNeeded(row.endereco),
    asaas_customer_id: String(row.asaas_customer_id || "").trim(),
  };
};

const saveClienteAsaasId = async (clienteId, asaasCustomerId) => {
  await query(
    "UPDATE clientes SET asaas_customer_id = $2 WHERE id = $1",
    [clienteId, asaasCustomerId],
  );
};

const customerMatchesCliente = (customer, cliente) => {
  const customerCpfCnpj = normalizeCpfCnpj(customer?.cpfCnpj);
  const clienteCpfCnpj = normalizeCpfCnpj(cliente?.cpf_cnpj);
  const customerEmail = normalizeEmail(customer?.email);
  const clienteEmail = normalizeEmail(cliente?.email);
  const customerName = String(customer?.name || "")
    .trim()
    .toLowerCase();
  const clienteName = String(cliente?.nome || "")
    .trim()
    .toLowerCase();

  if (customerCpfCnpj && clienteCpfCnpj && customerCpfCnpj === clienteCpfCnpj) {
    return true;
  }

  if (customerEmail && clienteEmail && customerEmail === clienteEmail) {
    return true;
  }

  return Boolean(customerName && clienteName && customerName === clienteName);
};

const findExistingAsaasCustomer = async ({
  apiKey,
  environment,
  cliente,
}) => {
  if (cliente.asaas_customer_id) {
    try {
      const byId = await asaasRequest({
        apiKey,
        environment,
        path: `/customers/${cliente.asaas_customer_id}`,
      });
      if (byId?.id) {
        return byId;
      }
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error;
      }
    }
  }

  const cpfCnpj = normalizeCpfCnpj(cliente.cpf_cnpj);
  const attempts = cpfCnpj
    ? [{ cpfCnpj }]
    : [
        {
          email: normalizeEmail(cliente.email),
        },
        {
          name: String(cliente.nome || "").trim(),
        },
      ];

  for (const params of attempts) {
    const hasFilter = Object.values(params).some(Boolean);
    if (!hasFilter) continue;

    const response = await asaasRequest({
      apiKey,
      environment,
      path: "/customers",
      searchParams: {
        ...params,
        limit: 100,
      },
    });

    const match = getListData(response).find((customer) =>
      customerMatchesCliente(customer, cliente),
    );

    if (match) {
      return match;
    }
  }

  return null;
};

const buildCustomerPayload = (cliente) => {
  const payload = {
    name: String(cliente.nome || "").trim(),
    cpfCnpj: normalizeCpfCnpj(cliente.cpf_cnpj),
    email: normalizeEmail(cliente.email) || undefined,
  };

  const phone = normalizePhone(cliente.telefone);
  if (phone) {
    payload.mobilePhone = phone;
  }

  return payload;
};

export const ensureClienteAsaasCustomer = async (clienteId) => {
  const cliente = await loadClienteById(clienteId);
  const { apiKey, environment } = await getAsaasRuntime();

  let customer = await findExistingAsaasCustomer({
    apiKey,
    environment,
    cliente,
  });

  if (!customer) {
    customer = await asaasRequest({
      apiKey,
      environment,
      method: "POST",
      path: "/customers",
      body: buildCustomerPayload(cliente),
    });
  }

  if (!customer?.id) {
    throw buildServiceError(
      "Não foi possível identificar o cliente no ASAAS.",
      500,
    );
  }

  await saveClienteAsaasId(cliente.id, customer.id);

  return {
    cliente_id: cliente.id,
    asaas_customer_id: customer.id,
    customer,
  };
};

const EXTERNAL_REFERENCE_SHORT_PREFIX_REVERSE = {
  V: "VENDA",
  M: "MANUAL",
};

const decodeExternalReferenceValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("u")) {
    try {
      const hex = Buffer.from(raw.slice(1), "base64url").toString("hex");
      if (hex.length === 32) {
        return [
          hex.slice(0, 8),
          hex.slice(8, 12),
          hex.slice(12, 16),
          hex.slice(16, 20),
          hex.slice(20),
        ].join("-");
      }
    } catch (error) {
      return "";
    }
  }

  if (raw.startsWith("t")) {
    try {
      return Buffer.from(raw.slice(1), "base64url").toString("utf8");
    } catch (error) {
      return "";
    }
  }

  return raw;
};

export const buildAsaasExternalReference = ({
  localChargeId,
}) => {
  const normalizedLocalChargeId = String(localChargeId || "").trim();

  if (!normalizedLocalChargeId) {
    throw buildServiceError(
      "Não foi possível gerar a referência externa da cobrança sem o identificador local.",
      400,
    );
  }

  if (normalizedLocalChargeId.length > ASAAS_EXTERNAL_REFERENCE_MAX_LENGTH) {
    throw buildServiceError(
      "Não foi possível gerar a referência externa da cobrança dentro do limite aceito pelo ASAAS.",
      400,
    );
  }

  return normalizedLocalChargeId;
};

export const parseAsaasExternalReference = (value) => {
  const normalizedReference = String(value || "").trim();

  if (!normalizedReference) {
    return {};
  }

  if (!normalizedReference.includes("=")) {
    return {
      local: normalizedReference,
    };
  }

  return normalizedReference.split("|").reduce((acc, part) => {
    const [key, rawValue] = part.split("=");
    const normalizedKey = String(key || "").trim().toLowerCase();
    if (!normalizedKey || !rawValue) return acc;
    const normalizedValue = decodeExternalReferenceValue(rawValue);

    if (normalizedKey === "o") {
      return {
        ...acc,
        origem:
          EXTERNAL_REFERENCE_SHORT_PREFIX_REVERSE[rawValue] || rawValue,
      };
    }

    if (normalizedKey === "v") {
      return {
        ...acc,
        venda: normalizedValue,
      };
    }

    if (normalizedKey === "p") {
      return {
        ...acc,
        parcela: normalizedValue,
      };
    }

    if (normalizedKey === "l") {
      return {
        ...acc,
        local: normalizedValue,
      };
    }

    return {
      ...acc,
      [normalizedKey]: normalizedValue,
    };
  }, {});
};

const findLinkedContaReceberId = async (contaReceberParcelaId) => {
  if (!contaReceberParcelaId) return "";

  const result = await query(
    `
      SELECT conta_receber_id
      FROM contas_receber_parcelas
      WHERE id = $1
      LIMIT 1
    `,
    [contaReceberParcelaId],
  );

  return String(result.rows[0]?.conta_receber_id || "").trim();
};

const findClienteIdByAsaasCustomer = async (asaasCustomerId) => {
  if (!asaasCustomerId) return "";

  const result = await query(
    `
      SELECT id
      FROM clientes
      WHERE asaas_customer_id = $1
      LIMIT 1
    `,
    [asaasCustomerId],
  );

  return String(result.rows[0]?.id || "").trim();
};

const loadExistingChargeByIdentifier = async (identifier) => {
  if (!identifier) return null;

  const result = await query(
    `
      SELECT *
      FROM asaas_cobrancas
      WHERE id = $1 OR asaas_payment_id = $1
      LIMIT 1
    `,
    [identifier],
  );

  return result.rows[0] || null;
};

const toChargeRecordValues = async ({
  id,
  payment,
  event,
  clienteId,
  vendaId,
  contaReceberId,
  contaReceberParcelaId,
  origemTipo,
}) => {
  const externalReference = String(payment?.externalReference || "").trim();
  const parsedReference = parseAsaasExternalReference(externalReference);
  const linkedLocalChargeId = String(parsedReference.local || "").trim();
  const linkedParcelaId =
    contaReceberParcelaId ||
    String(parsedReference.parcela || "").trim();
  const linkedVendaId =
    vendaId || String(parsedReference.venda || "").trim();
  const linkedContaReceberId =
    contaReceberId || (await findLinkedContaReceberId(linkedParcelaId));
  const linkedClienteId =
    clienteId || (await findClienteIdByAsaasCustomer(payment?.customer));

  return {
    id: id || linkedLocalChargeId || randomUUID(),
    asaas_payment_id: String(payment?.id || "").trim(),
    asaas_customer_id: String(payment?.customer || "").trim(),
    cliente_id: linkedClienteId || null,
    venda_id: linkedVendaId || null,
    conta_receber_id: linkedContaReceberId || null,
    conta_receber_parcela_id: linkedParcelaId || null,
    origem_tipo:
      origemTipo ||
      String(parsedReference.origem || "").trim().toUpperCase() ||
      "MANUAL",
    descricao: String(payment?.description || "").trim() || null,
    billing_type: String(payment?.billingType || "").trim().toUpperCase() || "BOLETO",
    status: String(payment?.status || "").trim().toUpperCase() || "PENDING",
    due_date: toDateOnly(payment?.dueDate) || null,
    value: resolveAsaasChargeOriginalAmount(payment),
    received_value: resolveAsaasChargeReceivedAmount({
      payment,
      event,
      status: payment?.status,
    }),
    external_reference: externalReference || null,
    invoice_url: String(payment?.invoiceUrl || "").trim() || null,
    bank_slip_url:
      String(payment?.bankSlipUrl || payment?.bankSlipUrl || "").trim() || null,
    pix_payload: String(payment?.pixTransaction || "").trim() || null,
    deleted:
      String(payment?.deleted || "").toLowerCase() === "true" ||
      String(payment?.status || "").trim().toUpperCase() === "DELETED",
    last_event: String(event || "").trim() || null,
    last_event_at: new Date().toISOString(),
    raw_payload: payment,
  };
};

export const upsertAsaasChargeRecord = async ({
  id,
  payment,
  event,
  clienteId,
  vendaId,
  contaReceberId,
  contaReceberParcelaId,
  origemTipo,
}) => {
  const values = await toChargeRecordValues({
    id,
    payment,
    event,
    clienteId,
    vendaId,
    contaReceberId,
    contaReceberParcelaId,
    origemTipo,
  });

  if (!values.asaas_payment_id) {
    throw buildServiceError(
      "Resposta do ASAAS sem identificador de cobrança.",
      500,
    );
  }

  const result = await query(
    `
      INSERT INTO asaas_cobrancas (
        id,
        asaas_payment_id,
        asaas_customer_id,
        cliente_id,
        venda_id,
        conta_receber_id,
        conta_receber_parcela_id,
        origem_tipo,
        descricao,
        billing_type,
        status,
        due_date,
        value,
        received_value,
        external_reference,
        invoice_url,
        bank_slip_url,
        pix_payload,
        deleted,
        last_event,
        last_event_at,
        raw_payload,
        criado_em,
        atualizado_em
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22::jsonb, now(), now()
      )
      ON CONFLICT (asaas_payment_id)
      DO UPDATE SET
        asaas_customer_id = EXCLUDED.asaas_customer_id,
        cliente_id = COALESCE(EXCLUDED.cliente_id, asaas_cobrancas.cliente_id),
        venda_id = COALESCE(EXCLUDED.venda_id, asaas_cobrancas.venda_id),
        conta_receber_id = COALESCE(EXCLUDED.conta_receber_id, asaas_cobrancas.conta_receber_id),
        conta_receber_parcela_id = COALESCE(
          EXCLUDED.conta_receber_parcela_id,
          asaas_cobrancas.conta_receber_parcela_id
        ),
        origem_tipo = COALESCE(EXCLUDED.origem_tipo, asaas_cobrancas.origem_tipo),
        descricao = COALESCE(EXCLUDED.descricao, asaas_cobrancas.descricao),
        billing_type = COALESCE(EXCLUDED.billing_type, asaas_cobrancas.billing_type),
        status = COALESCE(EXCLUDED.status, asaas_cobrancas.status),
        due_date = COALESCE(EXCLUDED.due_date, asaas_cobrancas.due_date),
        value = COALESCE(EXCLUDED.value, asaas_cobrancas.value),
        received_value = COALESCE(
          EXCLUDED.received_value,
          asaas_cobrancas.received_value
        ),
        external_reference = COALESCE(
          EXCLUDED.external_reference,
          asaas_cobrancas.external_reference
        ),
        invoice_url = COALESCE(EXCLUDED.invoice_url, asaas_cobrancas.invoice_url),
        bank_slip_url = COALESCE(EXCLUDED.bank_slip_url, asaas_cobrancas.bank_slip_url),
        pix_payload = COALESCE(EXCLUDED.pix_payload, asaas_cobrancas.pix_payload),
        deleted = EXCLUDED.deleted,
        last_event = COALESCE(EXCLUDED.last_event, asaas_cobrancas.last_event),
        last_event_at = COALESCE(EXCLUDED.last_event_at, asaas_cobrancas.last_event_at),
        raw_payload = COALESCE(EXCLUDED.raw_payload, asaas_cobrancas.raw_payload),
        atualizado_em = now()
      RETURNING *
    `,
    [
      values.id,
      values.asaas_payment_id,
      values.asaas_customer_id,
      values.cliente_id,
      values.venda_id,
      values.conta_receber_id,
      values.conta_receber_parcela_id,
      values.origem_tipo,
      values.descricao,
      values.billing_type,
      values.status,
      values.due_date,
      values.value,
      values.received_value,
      values.external_reference,
      values.invoice_url,
      values.bank_slip_url,
      values.pix_payload,
      values.deleted,
      values.last_event,
      values.last_event_at,
      JSON.stringify(payment || {}),
    ],
  );

  const row = result.rows[0];

  await refreshContaReceberParcelaAsaasSnapshot(
    row?.conta_receber_parcela_id || values.conta_receber_parcela_id,
  );

  return row;
};

const hasActiveChargeForParcela = async (contaReceberParcelaId) => {
  if (!contaReceberParcelaId) return false;

  const result = await query(
    `
      SELECT 1
      FROM asaas_cobrancas
      WHERE conta_receber_parcela_id = $1
        AND deleted = false
        AND status <> ALL ($2::text[])
      LIMIT 1
    `,
    [contaReceberParcelaId, Array.from(TERMINAL_PAYMENT_STATUSES)],
  );

  return Boolean(result.rows[0]);
};

const buildChargeDescription = ({ descricao, cliente, vendaId, parcelaId }) => {
  const normalized = String(descricao || "").trim();
  if (normalized) return normalized;

  const chunks = ["Cobrança ASAAS"];
  if (cliente?.nome) {
    chunks.push(cliente.nome);
  }
  if (vendaId) {
    chunks.push(`venda ${String(vendaId).slice(0, 8)}`);
  }
  if (parcelaId) {
    chunks.push(`parcela ${String(parcelaId).slice(0, 8)}`);
  }
  return chunks.join(" - ").slice(0, 255);
};

const serializeCharge = (row) => ({
  ...row,
  value: toNumber(row.value),
  received_value:
    row.received_value === null ||
    row.received_value === undefined ||
    String(row.received_value).trim() === ""
      ? null
      : toNumber(row.received_value),
});

const resolveAsaasChargeLink = (row = {}) =>
  normalizeOptionalText(
    row.invoice_url ||
      row.invoiceUrl ||
      row.bank_slip_url ||
      row.bankSlipUrl,
  );

const refreshContaReceberParcelaAsaasSnapshot = async (
  contaReceberParcelaId,
) => {
  const parcelaId = String(contaReceberParcelaId || "").trim();
  if (!parcelaId) return;

  const result = await query(
    `
      SELECT
        status,
        deleted,
        invoice_url,
        bank_slip_url
      FROM asaas_cobrancas
      WHERE conta_receber_parcela_id = $1
      ORDER BY deleted ASC, atualizado_em DESC, criado_em DESC
      LIMIT 1
    `,
    [parcelaId],
  );

  const charge = result.rows[0] || null;
  const status = normalizeOptionalText(charge?.status);
  const emitida =
    Boolean(charge) &&
    !charge.deleted &&
    String(charge.status || "").trim().toUpperCase() !== "DELETED";
  const link = resolveAsaasChargeLink(charge || {});

  await query(
    `
      UPDATE contas_receber_parcelas
      SET
        asaas_cobranca_emitida = $2,
        asaas_cobranca_status = $3,
        asaas_cobranca_link = $4
      WHERE id = $1
    `,
    [parcelaId, emitida, status, emitida ? link : null],
  );
};

const syncContaReceberStatus = async (client, contaReceberId) => {
  const safeContaReceberId = String(contaReceberId || "").trim();
  if (!safeContaReceberId) return;

  await client.query(
    `
      UPDATE contas_receber cr
      SET status = CASE
        WHEN EXISTS (
          SELECT 1
          FROM contas_receber_parcelas crp
          WHERE crp.conta_receber_id = cr.id
            AND COALESCE(crp.status, 'ABERTA') <> 'RECEBIDA'
        ) THEN 'ABERTO'
        ELSE 'RECEBIDO'
      END
      WHERE cr.id = $1
    `,
    [safeContaReceberId],
  );
};

const syncParcelaRecebimentoFromAsaas = async ({
  charge,
  payment,
  event,
}) => {
  const parcelaId = String(charge?.conta_receber_parcela_id || "").trim();
  if (!parcelaId) return null;

  if (
    !isAsaasPaymentSettled({
      event,
      status: charge?.status || payment?.status,
    })
  ) {
    return null;
  }

  return withTransaction(async (client) => {
    const parcelaResult = await client.query(
      `
        SELECT
          id,
          conta_receber_id,
          status,
          valor,
          valor_programado
        FROM contas_receber_parcelas
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [parcelaId],
    );

    const parcela = parcelaResult.rows[0];
    if (!parcela) return null;

    const alreadyReceived =
      normalizeAsaasStatus(parcela.status) === "RECEBIDA";
    const receiptMethod = resolveAsaasReceiptMethod(
      payment?.billingType || charge?.billing_type || charge?.status,
    );
    const receiptAt = resolveAsaasReceiptAt(payment);
    const fallbackAmount =
      toNumber(parcela.valor_programado) || toNumber(parcela.valor);

    if (!alreadyReceived) {
      await client.query(
        `
          UPDATE contas_receber_parcelas
          SET
            status = 'RECEBIDA',
            data_recebimento = COALESCE(data_recebimento, $2::timestamptz),
            forma_recebimento = COALESCE(NULLIF(forma_recebimento, ''), $3),
            valor_recebido = COALESCE(valor_recebido, $4),
            forma_recebimento_real = COALESCE(NULLIF(forma_recebimento_real, ''), $3),
            origem_recebimento = CASE
              WHEN COALESCE(NULLIF(origem_recebimento, ''), 'NORMAL') = 'NORMAL'
                THEN 'ASAAS'
              ELSE origem_recebimento
            END,
            observacao_recebimento = COALESCE(
              NULLIF(observacao_recebimento, ''),
              $5
            )
          WHERE id = $1
        `,
        [
          parcela.id,
          receiptAt,
          receiptMethod,
          resolveAsaasReceivedAmount(payment, fallbackAmount),
          `Baixa automática via webhook ASAAS (${normalizeAsaasEvent(event) || "PAYMENT_RECEIVED"}).`,
        ],
      );
    }

    await syncContaReceberStatus(client, parcela.conta_receber_id);

    return {
      parcela_id: parcela.id,
      conta_receber_id: parcela.conta_receber_id,
      marked_as_received: !alreadyReceived,
    };
  });
};

export const createAsaasCharge = async (payload = {}) => {
  const clienteId = String(payload.cliente_id || "").trim();
  if (!clienteId) {
    throw buildServiceError("Informe o cliente da cobrança.", 400);
  }

  const dueDate = toDateOnly(payload.due_date || payload.dueDate);
  if (!dueDate) {
    throw buildServiceError("Informe uma data de vencimento válida.", 400);
  }

  const enforceDueDateD1 = Boolean(
    payload.enforce_due_date_d1 ?? payload.enforceDueDateD1,
  );
  if (enforceDueDateD1) {
    const minDueDate = getTomorrowDateOnlyInSaoPaulo();
    if (dueDate < minDueDate) {
      throw buildServiceError(
        `A data de vencimento deve ser no mínimo ${minDueDate} (D+1).`,
        400,
      );
    }
  }

  const value = toNumber(payload.value);
  if (value <= 0) {
    throw buildServiceError("Informe um valor maior que zero.", 400);
  }

  const billingType = normalizeAsaasBillingType(
    payload.billing_type || payload.billingType,
  );
  const origemTipo = String(payload.origem_tipo || "MANUAL")
    .trim()
    .toUpperCase();
  const vendaId = String(payload.venda_id || "").trim();
  const contaReceberParcelaId = String(
    payload.conta_receber_parcela_id || "",
  ).trim();
  const contaReceberId = String(payload.conta_receber_id || "").trim();

  if (await hasActiveChargeForParcela(contaReceberParcelaId)) {
    throw buildServiceError(
      "Já existe uma cobrança ativa do ASAAS para esta parcela.",
      409,
    );
  }

  const cliente = await loadClienteById(clienteId);
  const customerSync = await ensureClienteAsaasCustomer(cliente.id);
  const { apiKey, environment } = await getAsaasRuntime();
  const localChargeId = randomUUID();

  const payment = await asaasRequest({
    apiKey,
    environment,
    method: "POST",
    path: "/payments",
    body: {
      customer: customerSync.asaas_customer_id,
      billingType: billingType,
      dueDate,
      value,
      description: buildChargeDescription({
        descricao: payload.descricao || payload.description,
        cliente,
        vendaId,
        parcelaId: contaReceberParcelaId,
      }),
      externalReference: buildAsaasExternalReference({
        origemTipo,
        vendaId,
        contaReceberParcelaId,
        localChargeId,
      }),
    },
  });

  const row = await upsertAsaasChargeRecord({
    id: localChargeId,
    payment,
    event: "PAYMENT_CREATED",
    clienteId: cliente.id,
    vendaId,
    contaReceberId,
    contaReceberParcelaId,
    origemTipo,
  });

  return {
    charge: serializeCharge(row),
    customer: customerSync.customer,
  };
};

export const deleteAsaasCharge = async (identifier) => {
  const existing = await loadExistingChargeByIdentifier(identifier);
  if (!existing) {
    throw buildServiceError("Cobrança ASAAS não encontrada.", 404);
  }

  const { apiKey, environment } = await getAsaasRuntime();

  await asaasRequest({
    apiKey,
    environment,
    method: "DELETE",
    path: `/payments/${existing.asaas_payment_id}`,
  });

  const result = await query(
    `
      UPDATE asaas_cobrancas
      SET
        status = 'DELETED',
        deleted = true,
        last_event = 'PAYMENT_DELETED',
        last_event_at = now()::timestamp,
        atualizado_em = now()
      WHERE id = $1
      RETURNING *
    `,
    [existing.id],
  );

  const row = result.rows[0];

  await refreshContaReceberParcelaAsaasSnapshot(
    row?.conta_receber_parcela_id || existing.conta_receber_parcela_id,
  );

  return serializeCharge(row);
};

export const getAsaasChargeByIdentifier = async (identifier) => {
  const row = await loadExistingChargeByIdentifier(identifier);
  if (!row) {
    throw buildServiceError("Cobrança ASAAS não encontrada.", 404);
  }
  return serializeCharge(row);
};

const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export const buildAsaasWebhookAuthToken = (apiKey, environment = "production") => {
  const seed = createHmac(
    "sha256",
    String(process.env.SECRET_KEY || "mvp-coffee-system"),
  )
    .update(`${environment}:${apiKey}`)
    .digest();

  let token = "AsaasHook";
  for (let index = 0; token.length < 40; index += 1) {
    let char = TOKEN_ALPHABET[seed[index % seed.length] % TOKEN_ALPHABET.length];
    const lastChars = token.slice(-3);
    if (lastChars === char.repeat(3)) {
      const altIndex =
        (seed[index % seed.length] + 17) % TOKEN_ALPHABET.length;
      char = TOKEN_ALPHABET[altIndex];
    }
    token += char;
    if ((token.length + 1) % 11 === 0 && token.length < 39) {
      token += "-";
    }
  }

  return token;
};

const loadFallbackWebhookEmail = async () => {
  const resendIntegration = await getIntegration("resend");
  return (
    resendIntegration.config.notification_recipients[0] ||
    "admin@mvpcoffee.local"
  );
};

const resolveAsaasWebhookRuntime = async ({ apiKey, environment } = {}) => {
  const safeApiKey = String(apiKey || "").trim();

  if (!safeApiKey) {
    return getAsaasRuntime();
  }

  return {
    apiKey: safeApiKey,
    environment: String(environment || "production").trim() || "production",
    config: {},
  };
};

const findExistingAsaasWebhook = async ({
  apiKey,
  environment,
  webhookId,
  webhookUrl,
}) => {
  const safeWebhookId = String(webhookId || "").trim();

  if (safeWebhookId) {
    try {
      const webhook = await asaasRequest({
        apiKey,
        environment,
        path: `/webhooks/${safeWebhookId}`,
      });

      if (webhook?.id) {
        return webhook;
      }
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error;
      }
    }
  }

  const safeWebhookUrl = String(webhookUrl || "").trim();
  if (!safeWebhookUrl) {
    return null;
  }

  const list = await asaasRequest({
    apiKey,
    environment,
    path: "/webhooks",
    searchParams: { limit: 100 },
  });

  return (
    getListData(list).find(
      (item) => String(item?.url || "").trim() === safeWebhookUrl,
    ) || null
  );
};

export const ensureAsaasWebhookRegistration = async ({
  webhookUrl,
  fallbackEmail,
  apiKey,
  environment,
}) => {
  const runtime = await resolveAsaasWebhookRuntime({
    apiKey,
    environment,
  });
  const safeWebhookUrl = String(webhookUrl || "").trim();

  if (!safeWebhookUrl) {
    throw buildServiceError(
      "Não foi possível resolver a URL pública do webhook do ASAAS.",
      400,
    );
  }

  const authToken = buildAsaasWebhookAuthToken(
    runtime.apiKey,
    runtime.environment,
  );
  const notificationEmail = fallbackEmail || (await loadFallbackWebhookEmail());

  const existing = await findExistingAsaasWebhook({
    apiKey: runtime.apiKey,
    environment: runtime.environment,
    webhookUrl: safeWebhookUrl,
  });

  const payload = {
    name: "MVP Coffee - Cobranças",
    url: safeWebhookUrl,
    email: notificationEmail,
    enabled: true,
    interrupted: false,
    authToken,
    sendType: "SEQUENTIALLY",
    events: WEBHOOK_EVENTS,
  };

  const webhook = existing?.id
    ? await asaasRequest({
        apiKey: runtime.apiKey,
        environment: runtime.environment,
        method: "PUT",
        path: `/webhooks/${existing.id}`,
        body: payload,
      })
    : await asaasRequest({
        apiKey: runtime.apiKey,
        environment: runtime.environment,
        method: "POST",
        path: "/webhooks",
        body: payload,
      });

  return {
    webhook_id: String(webhook?.id || existing?.id || "").trim(),
    webhook_url: safeWebhookUrl,
    webhook_registered_at: new Date().toISOString(),
    webhook_error: "",
  };
};

export const removeAsaasWebhookRegistration = async ({
  apiKey,
  environment,
  webhookId,
  webhookUrl,
}) => {
  const runtime = await resolveAsaasWebhookRuntime({
    apiKey,
    environment,
  });

  const existing = await findExistingAsaasWebhook({
    apiKey: runtime.apiKey,
    environment: runtime.environment,
    webhookId,
    webhookUrl,
  });

  if (!existing?.id) {
    return {
      removed: false,
      not_found: true,
    };
  }

  await asaasRequest({
    apiKey: runtime.apiKey,
    environment: runtime.environment,
    method: "DELETE",
    path: `/webhooks/${existing.id}`,
  });

  return {
    removed: true,
    webhook_id: String(existing.id || "").trim(),
    webhook_url: String(existing.url || webhookUrl || "").trim(),
  };
};

export const processAsaasWebhookEvent = async (payload = {}) => {
  const event = String(payload.event || "").trim().toUpperCase();
  const payment = payload.payment || null;

  if (!event || !payment?.id) {
    return null;
  }

  const existing = await loadExistingChargeByIdentifier(payment.id);

  const charge = await upsertAsaasChargeRecord({
    id: existing?.id || "",
    payment,
    event,
    clienteId: existing?.cliente_id || "",
    vendaId: existing?.venda_id || "",
    contaReceberId: existing?.conta_receber_id || "",
    contaReceberParcelaId: existing?.conta_receber_parcela_id || "",
    origemTipo: existing?.origem_tipo || "",
  });

  await syncParcelaRecebimentoFromAsaas({
    charge,
    payment,
    event,
  });

  return charge;
};

export const isAsaasChargePending = (status) =>
  !TERMINAL_PAYMENT_STATUSES.has(String(status || "").trim().toUpperCase());

export const getAsaasWebhookEvents = () => [...WEBHOOK_EVENTS];

export const buildAsaasWebhookSignature = (req, apiKey, environment) => {
  const expected = buildAsaasWebhookAuthToken(apiKey, environment);
  const received = String(req.headers["asaas-access-token"] || "").trim();
  return {
    expected,
    received,
    matches: Boolean(received) && received === expected,
  };
};

export const getAsaasWebhookRuntime = async () => {
  const runtime = await getAsaasRuntime();
  return {
    ...runtime,
    authToken: buildAsaasWebhookAuthToken(
      runtime.apiKey,
      runtime.environment,
    ),
  };
};

export const buildAsaasCustomerDiagnosticId = (cliente) =>
  createHash("md5")
    .update(
      JSON.stringify({
        id: cliente?.id,
        cpf_cnpj: normalizeCpfCnpj(cliente?.cpf_cnpj),
        email: normalizeEmail(cliente?.email),
      }),
    )
    .digest("hex");
