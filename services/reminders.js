import { query } from "../infra/database";
import { decryptIfNeeded } from "../utils/crypto";
import {
  buildCobrancasAsaasHojeTemplate,
  buildContasReceberHojeTemplate,
  buildEntregasHojeTemplate,
} from "./email-templates";
import { getResendRuntime, sendResendEmail } from "./resend";
import { isAsaasChargePending } from "./asaas";

const TODAY_SQL = "timezone('America/Sao_Paulo', now())::date";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateLabel = (value = new Date()) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);

const getReferenceDate = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const wasNotificationSent = async ({
  categoria,
  referenciaData,
  destinatario,
}) => {
  const result = await query(
    `
      SELECT 1
      FROM email_notificacoes
      WHERE categoria = $1
        AND referencia_data = $2
        AND destinatario = $3
        AND status = 'ENVIADO'
      LIMIT 1
    `,
    [categoria, referenciaData, destinatario],
  );

  return Boolean(result.rows[0]);
};

const registerNotificationResult = async ({
  categoria,
  referenciaData,
  destinatario,
  providerMessageId,
  status,
  erro,
  payload,
}) => {
  await query(
    `
      INSERT INTO email_notificacoes (
        categoria,
        referencia_data,
        destinatario,
        provider_message_id,
        status,
        erro,
        payload,
        criado_em,
        atualizado_em
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, now(), now())
      ON CONFLICT (categoria, referencia_data, destinatario)
      DO UPDATE SET
        provider_message_id = EXCLUDED.provider_message_id,
        status = EXCLUDED.status,
        erro = EXCLUDED.erro,
        payload = EXCLUDED.payload,
        atualizado_em = now()
    `,
    [
      categoria,
      referenciaData,
      destinatario,
      providerMessageId || null,
      status,
      erro || null,
      JSON.stringify(payload || {}),
    ],
  );
};

const sendSummaryToRecipients = async ({
  categoria,
  subject,
  html,
  payload,
  tags,
}) => {
  const resend = await getResendRuntime();
  const referenciaData = getReferenceDate();
  const results = [];

  for (const destinatario of resend.config.notification_recipients) {
    if (
      await wasNotificationSent({
        categoria,
        referenciaData,
        destinatario,
      })
    ) {
      results.push({
        destinatario,
        status: "IGNORADO",
        reason: "Email já enviado hoje para este destinatário.",
      });
      continue;
    }

    try {
      const response = await sendResendEmail({
        to: destinatario,
        subject,
        html,
        tags,
      });

      await registerNotificationResult({
        categoria,
        referenciaData,
        destinatario,
        providerMessageId: response?.id || null,
        status: "ENVIADO",
        erro: null,
        payload,
      });

      results.push({
        destinatario,
        status: "ENVIADO",
        messageId: response?.id || null,
      });
    } catch (error) {
      await registerNotificationResult({
        categoria,
        referenciaData,
        destinatario,
        providerMessageId: null,
        status: "ERRO",
        erro: error.message,
        payload,
      });

      results.push({
        destinatario,
        status: "ERRO",
        error: error.message,
      });
    }
  }

  return results;
};

const decodeClienteFields = (row) => ({
  ...row,
  cliente_nome: decryptIfNeeded(row.cliente_nome),
  cliente_email: decryptIfNeeded(row.cliente_email),
});

const loadContasReceberHoje = async () => {
  const result = await query(
    `
      SELECT
        crp.id AS parcela_id,
        cr.id AS conta_id,
        crp.parcela_num,
        crp.vencimento,
        COALESCE(crp.valor_programado, crp.valor) AS valor,
        cr.origem_tipo,
        cr.origem_id,
        c.nome AS cliente_nome,
        c.email AS cliente_email
      FROM contas_receber_parcelas crp
      JOIN contas_receber cr ON cr.id = crp.conta_receber_id
      LEFT JOIN clientes c ON c.id = cr.cliente_id
      WHERE COALESCE(crp.status, 'ABERTA') = 'ABERTA'
        AND timezone('America/Sao_Paulo', crp.vencimento)::date = ${TODAY_SQL}
      ORDER BY crp.vencimento ASC, crp.parcela_num ASC
    `,
  );

  return result.rows.map((row) => {
    const decoded = decodeClienteFields(row);
    return {
      ...decoded,
      valor: toNumber(decoded.valor),
      parcela_label: `${decoded.parcela_num || "-"} / ${String(
        decoded.parcela_id || "",
      ).slice(0, 8)}`,
      origem_label:
        decoded.origem_tipo && decoded.origem_id
          ? `${decoded.origem_tipo}:${decoded.origem_id}`
          : decoded.origem_tipo || "-",
    };
  });
};

const loadAsaasChargesHoje = async () => {
  const result = await query(
    `
      SELECT
        ac.*,
        c.nome AS cliente_nome,
        c.email AS cliente_email
      FROM asaas_cobrancas ac
      LEFT JOIN clientes c ON c.id = ac.cliente_id
      WHERE ac.deleted = false
        AND ac.due_date = ${TODAY_SQL}
      ORDER BY ac.due_date ASC, ac.value DESC
    `,
  );

  return result.rows
    .map((row) => ({
      ...decodeClienteFields(row),
      value: toNumber(row.value),
    }))
    .filter((row) => isAsaasChargePending(row.status));
};

const loadEntregasHoje = async () => {
  const result = await query(
    `
      SELECT
        v.id AS venda_id,
        v.data_programada_entrega,
        v.valor_total,
        v.status_entrega,
        c.nome AS cliente_nome,
        c.email AS cliente_email,
        COUNT(crp.id)::int AS parcelas_total,
        COUNT(*) FILTER (WHERE crp.status = 'RECEBIDA')::int AS parcelas_recebidas
      FROM vendas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN contas_receber cr
        ON cr.origem_tipo = 'venda'
       AND cr.origem_id = v.id
      LEFT JOIN contas_receber_parcelas crp
        ON crp.conta_receber_id = cr.id
      WHERE COALESCE(v.status_entrega, 'PENDENTE') <> 'ENTREGUE'
        AND v.data_programada_entrega = ${TODAY_SQL}
      GROUP BY
        v.id,
        v.data_programada_entrega,
        v.valor_total,
        v.status_entrega,
        c.nome,
        c.email
      ORDER BY v.data_programada_entrega ASC, v.id ASC
    `,
  );

  return result.rows.map((row) => ({
    ...decodeClienteFields(row),
    valor_total: toNumber(row.valor_total),
    parcelas_total: Number(row.parcelas_total) || 0,
    parcelas_recebidas: Number(row.parcelas_recebidas) || 0,
  }));
};

const buildJobSummary = (items, valueField) => ({
  totalItens: items.length,
  totalValor: items.reduce(
    (acc, item) => acc + toNumber(item[valueField] || 0),
    0,
  ),
  dateLabel: formatDateLabel(),
});

const runReminderJob = async ({
  categoria,
  subject,
  loader,
  valueField,
  templateBuilder,
  tag,
}) => {
  const items = await loader();

  if (!items.length) {
    return {
      ok: true,
      skipped: true,
      reason: "Nenhum registro encontrado para hoje.",
      categoria,
      total: 0,
      deliveries: [],
    };
  }

  const summary = buildJobSummary(items, valueField);
  const html = templateBuilder({
    ...summary,
    items,
  });

  let deliveries = [];
  try {
    deliveries = await sendSummaryToRecipients({
      categoria,
      subject,
      html,
      payload: {
        totalItens: summary.totalItens,
        totalValor: summary.totalValor,
      },
      tags: [{ name: "job", value: tag }],
    });
  } catch (error) {
    if (Number(error?.statusCode) >= 400 && Number(error?.statusCode) < 500) {
      return {
        ok: true,
        skipped: true,
        categoria,
        total: summary.totalItens,
        totalValor: summary.totalValor,
        reason: error.message,
        deliveries: [],
      };
    }
    throw error;
  }

  return {
    ok: deliveries.every((delivery) => delivery.status !== "ERRO"),
    skipped: false,
    categoria,
    total: summary.totalItens,
    totalValor: summary.totalValor,
    deliveries,
  };
};

export const runContasReceberReminderJob = async () =>
  runReminderJob({
    categoria: "contas_receber_hoje",
    subject: `Contas a receber de hoje • ${formatDateLabel()}`,
    loader: loadContasReceberHoje,
    valueField: "valor",
    templateBuilder: buildContasReceberHojeTemplate,
    tag: "contas-receber-hoje",
  });

export const runAsaasChargesReminderJob = async () =>
  runReminderJob({
    categoria: "cobrancas_asaas_hoje",
    subject: `Cobranças ASAAS de hoje • ${formatDateLabel()}`,
    loader: loadAsaasChargesHoje,
    valueField: "value",
    templateBuilder: buildCobrancasAsaasHojeTemplate,
    tag: "cobrancas-asaas-hoje",
  });

export const runDeliveriesReminderJob = async () =>
  runReminderJob({
    categoria: "entregas_hoje",
    subject: `Entregas programadas para hoje • ${formatDateLabel()}`,
    loader: loadEntregasHoje,
    valueField: "valor_total",
    templateBuilder: buildEntregasHojeTemplate,
    tag: "entregas-hoje",
  });
