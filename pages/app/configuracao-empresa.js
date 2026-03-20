import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { authenticatedFetch, getAuthToken } from "../../hooks/useSession";
import { useDataStore } from "../../hooks/useDataStore";

const integracoesIniciais = {
  asaas: {
    chave: "",
    configurado: false,
    editando: true,
    environment: "production",
    auto_charge_on_credit_sale: false,
    webhook_url: "",
    webhook_registered_at: "",
    webhook_error: "",
    webhook_cleanup_error: "",
  },
  resend: {
    chave: "",
    configurado: false,
    editando: true,
    from_email: "",
    notification_recipients_text: "",
  },
};

const LOG_LIMIT = 80;
const logJsonBoxSx = {
  m: 0,
  p: 1.5,
  borderRadius: 1,
  border: "1px solid",
  borderColor: "divider",
  bgcolor: "background.default",
  fontSize: "0.75rem",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};
const logTypeOptions = [
  { value: "todos", label: "Todos" },
  { value: "cron", label: "Crons" },
  { value: "webhook", label: "Webhooks" },
];
const logStatusOptions = [
  { value: "todos", label: "Todos" },
  { value: "SUCESSO", label: "Sucesso" },
  { value: "PARCIAL", label: "Parcial" },
  { value: "IGNORADO", label: "Ignorado" },
  { value: "NAO_AUTORIZADO", label: "Não autorizado" },
  { value: "ERRO", label: "Erro" },
];
const logStatusLabels = {
  SUCESSO: "Sucesso",
  PARCIAL: "Parcial",
  IGNORADO: "Ignorado",
  NAO_AUTORIZADO: "Não autorizado",
  ERRO: "Erro",
};
const logStatusColors = {
  SUCESSO: "success",
  PARCIAL: "warning",
  IGNORADO: "info",
  NAO_AUTORIZADO: "warning",
  ERRO: "error",
};

const parseRecipientsInput = (value) =>
  Array.from(
    new Set(
      String(value || "")
        .split(/[\n,;]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

const auditFieldLabels = {
  id: "ID",
  origem_id: "Origem (Ref)",
  referencia_id: "Referência (Ref)",
  conta_pagar_id: "Conta a pagar",
  conta_receber_id: "Conta a receber",
  conta_receber_parcela_id: "Parcela de conta a receber",
  conta_pagar_parcela_id: "Parcela de conta a pagar",
  producao_id: "Produção",
  venda_id: "Venda",
};

const normalizeAuditValue = (value) => String(value ?? "").trim();
const toAuditComparable = (value) => normalizeAuditValue(value).toLowerCase();

const resolveAuditTimeline = (row = {}, dateFields = []) => {
  for (const field of dateFields) {
    const rawValue = row[field];
    if (!rawValue) continue;
    const timestamp = new Date(rawValue).getTime();
    if (Number.isFinite(timestamp)) {
      return { rawValue, timestamp };
    }
  }
  return { rawValue: "", timestamp: 0 };
};

const formatAuditDateTime = (value) => {
  if (!value) return "Sem data";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Sem data";
  return new Date(value).toLocaleString("pt-BR");
};

const safeJsonStringify = (value) => {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch (error) {
    return JSON.stringify(
      { erro: "Nao foi possivel renderizar o JSON." },
      null,
      2,
    );
  }
};

const hasJsonContent = (value) => {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(String(value).trim());
};

const resolveLogStatusLabel = (status) =>
  logStatusLabels[
    String(status || "")
      .trim()
      .toUpperCase()
  ] ||
  status ||
  "Info";

const resolveLogStatusColor = (status) =>
  logStatusColors[
    String(status || "")
      .trim()
      .toUpperCase()
  ] || "default";

const buildLogPreview = (log = {}) => {
  const summary = [];
  const response = log.response_payload || {};

  if (log.tipo === "cron") {
    if (log.evento) {
      summary.push(log.evento);
    }
    if (Number.isFinite(Number(response.total)) && Number(response.total) > 0) {
      summary.push(`${Number(response.total)} item(ns) processado(s)`);
    }
    if (Array.isArray(response.deliveries) && response.deliveries.length) {
      summary.push(`${response.deliveries.length} envio(s) registrado(s)`);
    }
    if (response.reason) {
      summary.push(response.reason);
    }
  } else {
    if (log.evento) {
      summary.push(`Evento ${log.evento}`);
    }
    if (log.referencia) {
      summary.push(`Ref ${log.referencia}`);
    }
    if (response.charge_status) {
      summary.push(`Cobrança ${response.charge_status}`);
    }
  }

  if (log.erro) {
    summary.push(log.erro);
  }

  return summary.join(" • ") || "Execução registrada para auditoria.";
};

const buildLogSearchableText = (log = {}) =>
  [
    log.tipo,
    log.chave,
    log.descricao,
    log.endpoint,
    log.metodo,
    log.origem,
    log.status,
    log.evento,
    log.referencia,
    log.erro,
    safeJsonStringify(log.response_payload),
    safeJsonStringify(log.metadados),
  ]
    .map((item) => String(item || "").toLowerCase())
    .join(" ");

const buildAuditTrail = (referenceCode, sources = []) => {
  const normalizedReference = normalizeAuditValue(referenceCode);
  if (!normalizedReference) return [];

  const entries = [];
  for (const source of sources) {
    for (const row of source.rows || []) {
      const traceValues = (source.traceFields || [])
        .map((field) => ({
          field,
          value: normalizeAuditValue(row?.[field]),
        }))
        .filter((item) => item.value);

      if (!traceValues.length) continue;

      const { rawValue, timestamp } = resolveAuditTimeline(
        row,
        source.dateFields || [],
      );

      entries.push({
        sourceKey: source.key,
        sourceLabel: source.label,
        row,
        traceValues,
        timelineRawValue: rawValue,
        timelineTimestamp: timestamp,
      });
    }
  }

  const linkedReferences = new Set([toAuditComparable(normalizedReference)]);
  const includedIndexes = new Set();
  const matchedByIndex = new Map();

  let changed = true;
  while (changed) {
    changed = false;

    entries.forEach((entry, index) => {
      if (includedIndexes.has(index)) return;

      const matchedField = entry.traceValues.find((trace) =>
        linkedReferences.has(toAuditComparable(trace.value)),
      );
      if (!matchedField) return;

      includedIndexes.add(index);
      matchedByIndex.set(index, matchedField);
      changed = true;

      entry.traceValues.forEach((trace) => {
        linkedReferences.add(toAuditComparable(trace.value));
      });
    });
  }

  return Array.from(includedIndexes)
    .map((index) => {
      const entry = entries[index];
      const matchedField = matchedByIndex.get(index);

      return {
        ...entry,
        matchedField: matchedField?.field || "",
        matchedValue: matchedField?.value || "",
        timelineLabel: formatAuditDateTime(entry.timelineRawValue),
      };
    })
    .sort((a, b) => {
      if (a.timelineTimestamp !== b.timelineTimestamp) {
        return b.timelineTimestamp - a.timelineTimestamp;
      }
      const bySource = a.sourceLabel.localeCompare(b.sourceLabel, "pt-BR");
      if (bySource !== 0) return bySource;
      return normalizeAuditValue(a.row?.id).localeCompare(
        normalizeAuditValue(b.row?.id),
        "pt-BR",
      );
    });
};

const ConfiguracaoEmpresaPage = () => {
  const empresaConfiguracaoEstoque = useDataStore(
    (state) => state.empresaConfiguracaoEstoque,
  );
  const setEmpresaConfiguracaoEstoque = useDataStore(
    (state) => state.setEmpresaConfiguracaoEstoque,
  );
  const [tab, setTab] = useState("estoque");
  const [faixas, setFaixas] = useState([]);
  const [integracoes, setIntegracoes] = useState(integracoesIniciais);
  const [feedback, setFeedback] = useState({
    open: false,
    severity: "success",
    message: "",
  });
  const [savingIntegracoes, setSavingIntegracoes] = useState({});
  const [codigoAuditoriaInput, setCodigoAuditoriaInput] = useState("");
  const [codigoAuditoriaBusca, setCodigoAuditoriaBusca] = useState("");
  const [auditoriaRealizada, setAuditoriaRealizada] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [logsWarning, setLogsWarning] = useState("");
  const [logsFilters, setLogsFilters] = useState({
    tipo: "todos",
    status: "todos",
    busca: "",
  });
  const [swaggerErro, setSwaggerErro] = useState("");
  const swaggerContainerRef = useRef(null);

  const hydrated = useDataStore((state) => state.hydrated);
  const vendas = useDataStore((state) => state.vendas);
  const vendaItens = useDataStore((state) => state.vendaItens);
  const vendaDetalhes = useDataStore((state) => state.vendaDetalhes);
  const contasPagar = useDataStore((state) => state.contasPagar);
  const contasPagarParcelas = useDataStore(
    (state) => state.contasPagarParcelas,
  );
  const contasReceber = useDataStore((state) => state.contasReceber);
  const contasReceberParcelas = useDataStore(
    (state) => state.contasReceberParcelas,
  );
  const asaasCobrancas = useDataStore((state) => state.asaasCobrancas || []);
  const producoes = useDataStore((state) => state.producoes);
  const detalhesProducao = useDataStore((state) => state.detalhesProducao);
  const custosAdicionaisProducao = useDataStore(
    (state) => state.custosAdicionaisProducao,
  );
  const movimentoProducao = useDataStore((state) => state.movimentoProducao);
  const transferencias = useDataStore((state) => state.transferencias);

  const auditSources = useMemo(
    () => [
      {
        key: "vendas",
        label: "Vendas",
        rows: vendas,
        traceFields: ["id"],
        dateFields: ["data_venda", "criado_em"],
      },
      {
        key: "venda_itens",
        label: "Itens da venda",
        rows: vendaItens,
        traceFields: ["id", "venda_id"],
        dateFields: ["criado_em"],
      },
      {
        key: "venda_detalhes",
        label: "Histórico da venda",
        rows: vendaDetalhes,
        traceFields: ["id", "venda_id", "conta_receber_parcela_id"],
        dateFields: ["data_evento", "criado_em"],
      },
      {
        key: "contas_pagar",
        label: "Contas a pagar",
        rows: contasPagar,
        traceFields: ["id", "origem_id"],
        dateFields: ["data_emissao", "criado_em"],
      },
      {
        key: "contas_pagar_parcelas",
        label: "Parcelas de contas a pagar",
        rows: contasPagarParcelas,
        traceFields: ["id", "conta_pagar_id"],
        dateFields: ["vencimento", "data_pagamento", "criado_em"],
      },
      {
        key: "contas_receber",
        label: "Contas a receber",
        rows: contasReceber,
        traceFields: ["id", "origem_id"],
        dateFields: ["data_emissao", "criado_em"],
      },
      {
        key: "contas_receber_parcelas",
        label: "Parcelas de contas a receber",
        rows: contasReceberParcelas,
        traceFields: ["id", "conta_receber_id"],
        dateFields: ["vencimento", "data_recebimento", "criado_em"],
      },
      {
        key: "asaas_cobrancas",
        label: "Cobranças ASAAS",
        rows: asaasCobrancas,
        traceFields: [
          "id",
          "asaas_payment_id",
          "venda_id",
          "conta_receber_id",
          "conta_receber_parcela_id",
          "external_reference",
        ],
        dateFields: ["due_date", "last_event_at", "atualizado_em", "criado_em"],
      },
      {
        key: "producao",
        label: "Produção",
        rows: producoes,
        traceFields: ["id"],
        dateFields: ["data_producao", "criado_em"],
      },
      {
        key: "detalhes_producao",
        label: "Detalhes da produção",
        rows: detalhesProducao,
        traceFields: ["id", "producao_id"],
        dateFields: ["criado_em"],
      },
      {
        key: "custos_adicionais_producao",
        label: "Custos adicionais da produção",
        rows: custosAdicionaisProducao,
        traceFields: ["id", "producao_id"],
        dateFields: ["criado_em", "data_pagamento"],
      },
      {
        key: "movimento_producao",
        label: "Movimentações de estoque",
        rows: movimentoProducao,
        traceFields: ["id", "referencia_id"],
        dateFields: ["data_movimentacao", "criado_em"],
      },
      {
        key: "transferencias",
        label: "Transferências",
        rows: transferencias,
        traceFields: ["id"],
        dateFields: ["data_transferencia", "criado_em"],
      },
    ],
    [
      asaasCobrancas,
      contasPagar,
      contasPagarParcelas,
      contasReceber,
      contasReceberParcelas,
      custosAdicionaisProducao,
      detalhesProducao,
      movimentoProducao,
      producoes,
      transferencias,
      vendaDetalhes,
      vendaItens,
      vendas,
    ],
  );

  const auditoriaRegistros = useMemo(
    () => buildAuditTrail(codigoAuditoriaBusca, auditSources),
    [codigoAuditoriaBusca, auditSources],
  );

  const auditoriaResumo = useMemo(() => {
    const counters = {};
    auditoriaRegistros.forEach((registro) => {
      counters[registro.sourceLabel] =
        (counters[registro.sourceLabel] || 0) + 1;
    });
    return Object.entries(counters).sort((a, b) => b[1] - a[1]);
  }, [auditoriaRegistros]);

  const logsFiltrados = useMemo(() => {
    const busca = String(logsFilters.busca || "")
      .trim()
      .toLowerCase();

    if (!busca) {
      return logs;
    }

    return logs.filter((log) => buildLogSearchableText(log).includes(busca));
  }, [logs, logsFilters.busca]);

  const resumoLogs = useMemo(() => {
    const counters = {};

    logs.forEach((log) => {
      const status = resolveLogStatusLabel(log.status);
      counters[status] = (counters[status] || 0) + 1;
    });

    return Object.entries(counters).sort((a, b) => b[1] - a[1]);
  }, [logs]);

  const loadFaixas = useCallback(async () => {
    try {
      const response = await authenticatedFetch(
        "/api/v1/configuracao-empresa/estoque",
      );
      if (!response.ok) return;
      const data = await response.json();
      const nextFaixas = data.faixas || [];
      setFaixas(nextFaixas);
      setEmpresaConfiguracaoEstoque(nextFaixas);
    } catch (error) {
      setFaixas(empresaConfiguracaoEstoque || []);
    }
  }, [empresaConfiguracaoEstoque, setEmpresaConfiguracaoEstoque]);

  const loadIntegracoes = useCallback(async () => {
    try {
      const response = await authenticatedFetch(
        "/api/v1/configuracao-empresa/integracoes",
      );
      if (!response.ok) return;
      const data = await response.json();

      setIntegracoes((prev) => {
        const next = { ...prev };
        for (const integracao of data.integracoes || []) {
          const provedor = integracao.provedor;
          const config = integracao.config || {};
          next[provedor] = {
            ...prev[provedor],
            configurado: Boolean(integracao.configurado),
            editando: !integracao.configurado,
            chave: "",
            ...(provedor === "asaas"
              ? {
                  environment: "production",
                  auto_charge_on_credit_sale: Boolean(
                    config.auto_charge_on_credit_sale,
                  ),
                  webhook_url: config.webhook_url || "",
                  webhook_registered_at: config.webhook_registered_at || "",
                  webhook_error: config.webhook_error || "",
                  webhook_cleanup_error: config.webhook_cleanup_error || "",
                }
              : {}),
            ...(provedor === "resend"
              ? {
                  from_email: config.from_email || "",
                  notification_recipients_text: Array.isArray(
                    config.notification_recipients,
                  )
                    ? config.notification_recipients.join(", ")
                    : "",
                }
              : {}),
          };
        }
        return next;
      });
    } catch (error) {
      setIntegracoes(integracoesIniciais);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError("");
    setLogsWarning("");

    try {
      const params = new URLSearchParams({
        limit: String(LOG_LIMIT),
      });

      if (logsFilters.tipo !== "todos") {
        params.set("tipo", logsFilters.tipo);
      }

      if (logsFilters.status !== "todos") {
        params.set("status", logsFilters.status);
      }

      const response = await authenticatedFetch(
        `/api/v1/configuracao-empresa/logs?${params.toString()}`,
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "Não foi possível carregar os logs de auditoria.",
        );
      }

      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setLogsWarning(data.warning || "");
    } catch (error) {
      setLogsError(
        error.message || "Não foi possível carregar os logs de auditoria.",
      );
    } finally {
      setLogsLoading(false);
    }
  }, [logsFilters.status, logsFilters.tipo]);

  useEffect(() => {
    loadFaixas();
    loadIntegracoes();
  }, [loadFaixas, loadIntegracoes]);

  useEffect(() => {
    if (tab !== "logs") return;
    loadLogs();
  }, [loadLogs, tab]);

  useEffect(() => {
    if (!hydrated || faixas.length || !empresaConfiguracaoEstoque.length) {
      return;
    }
    setFaixas(empresaConfiguracaoEstoque);
  }, [empresaConfiguracaoEstoque, faixas.length, hydrated]);

  useEffect(() => {
    if (tab !== "apis") return;

    const ensureSwaggerAssets = async () => {
      if (typeof window === "undefined") return;
      setSwaggerErro("");

      const cssId = "swagger-ui-css";
      if (!document.getElementById(cssId)) {
        const link = document.createElement("link");
        link.id = cssId;
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css";
        document.head.appendChild(link);
      }

      if (!window.SwaggerUIBundle) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js";
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const token = getAuthToken();
      if (!token || !swaggerContainerRef.current || !window.SwaggerUIBundle)
        return;

      swaggerContainerRef.current.innerHTML = "";
      window.SwaggerUIBundle({
        url: "/api/v1/docs/openapi",
        domNode: swaggerContainerRef.current,
        deepLinking: true,
        requestInterceptor: (request) => ({
          ...request,
          headers: {
            ...(request.headers || {}),
            Authorization: `Bearer ${token}`,
          },
        }),
      });
    };

    ensureSwaggerAssets().catch(() => {
      setSwaggerErro("Não foi possível carregar a documentação Swagger.");
    });
  }, [tab]);

  const handleFaixaChange = (index, field) => (event) => {
    const value = event.target.value;
    setFaixas((prev) =>
      prev.map((faixa, idx) =>
        idx === index
          ? {
              ...faixa,
              [field]:
                field === "label" ? value : value === "" ? "" : Number(value),
            }
          : faixa,
      ),
    );
  };

  const handleIntegracaoField =
    (provedor, field = "chave") =>
    (event) => {
      const value = event.target.value;
      setIntegracoes((prev) => ({
        ...prev,
        [provedor]: {
          ...prev[provedor],
          [field]: value,
        },
      }));
    };

  const handleEditarIntegracao = (provedor) => {
    setIntegracoes((prev) => ({
      ...prev,
      [provedor]: {
        ...prev[provedor],
        chave: "",
        editando: true,
      },
    }));
  };

  const setIntegracaoSaving = (provedor, value) => {
    setSavingIntegracoes((prev) => ({
      ...prev,
      [provedor]: value,
    }));
  };

  const applySavedIntegracao = (provedor, data, integracao, config) => {
    setIntegracoes((prev) => ({
      ...prev,
      [provedor]: {
        ...prev[provedor],
        configurado: true,
        editando: false,
        chave: "",
        ...(provedor === "asaas"
          ? {
              environment: "production",
              auto_charge_on_credit_sale: Boolean(
                data.config?.auto_charge_on_credit_sale,
              ),
              webhook_url: data.config?.webhook_url || "",
              webhook_registered_at: data.config?.webhook_registered_at || "",
              webhook_error: data.config?.webhook_error || "",
              webhook_cleanup_error: data.config?.webhook_cleanup_error || "",
            }
          : {}),
        ...(provedor === "resend"
          ? {
              from_email: data.config?.from_email || config.from_email || "",
              notification_recipients_text: Array.isArray(
                data.config?.notification_recipients,
              )
                ? data.config.notification_recipients.join(", ")
                : integracao.notification_recipients_text,
            }
          : {}),
      },
    }));
  };

  const persistAsaasAutoChargeSetting = async (nextValue) => {
    const response = await authenticatedFetch(
      "/api/v1/configuracao-empresa/integracoes",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provedor: "asaas",
          chave: "",
          config: {
            environment: "production",
            auto_charge_on_credit_sale: Boolean(nextValue),
          },
        }),
      },
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || "Não foi possível atualizar a automação do ASAAS.",
      );
    }

    applySavedIntegracao("asaas", data, integracoes.asaas, {});

    return data;
  };

  const handleAsaasAutoChargeToggle = async (event) => {
    const nextValue = event.target.checked;
    const previousValue = Boolean(
      integracoes.asaas?.auto_charge_on_credit_sale,
    );

    setIntegracoes((prev) => ({
      ...prev,
      asaas: {
        ...prev.asaas,
        auto_charge_on_credit_sale: nextValue,
      },
    }));

    if (!integracoes.asaas?.configurado || integracoes.asaas?.editando) {
      return;
    }

    setIntegracaoSaving("asaas", true);

    try {
      await persistAsaasAutoChargeSetting(nextValue);
      setFeedback({
        open: true,
        severity: "success",
        message: nextValue
          ? "Cobrança automática do ASAAS ativada com sucesso."
          : "Cobrança automática do ASAAS desativada com sucesso.",
      });
    } catch (error) {
      setIntegracoes((prev) => ({
        ...prev,
        asaas: {
          ...prev.asaas,
          auto_charge_on_credit_sale: previousValue,
        },
      }));
      setFeedback({
        open: true,
        severity: "error",
        message:
          error.message || "Não foi possível atualizar a automação do ASAAS.",
      });
    } finally {
      setIntegracaoSaving("asaas", false);
    }
  };

  const handleSalvarIntegracao = async (provedor) => {
    const integracao = integracoes[provedor];
    const chave = integracao?.chave?.trim();

    if (provedor === "asaas" && integracao?.editando && !chave) {
      setFeedback({
        open: true,
        severity: "error",
        message: integracao?.configurado
          ? "Informe a nova chave do ASAAS para atualizar a integração."
          : "Informe a chave da integração antes de salvar.",
      });
      return;
    }

    if (!chave && !integracao?.configurado) {
      setFeedback({
        open: true,
        severity: "error",
        message: "Informe a chave da integração antes de salvar.",
      });
      return;
    }

    const config = {};

    if (provedor === "asaas") {
      config.environment = "production";
      config.auto_charge_on_credit_sale = Boolean(
        integracao.auto_charge_on_credit_sale,
      );
    }

    if (provedor === "resend") {
      const fromEmail = String(integracao.from_email || "")
        .trim()
        .toLowerCase();
      const recipients = parseRecipientsInput(
        integracao.notification_recipients_text,
      );

      if (!fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
        setFeedback({
          open: true,
          severity: "error",
          message: "Informe um remetente válido para o Resend.",
        });
        return;
      }

      if (!recipients.length) {
        setFeedback({
          open: true,
          severity: "error",
          message: "Informe ao menos um destinatário para os lembretes.",
        });
        return;
      }

      config.from_email = fromEmail;
      config.notification_recipients = recipients;
    }

    try {
      setIntegracaoSaving(provedor, true);
      const response = await authenticatedFetch(
        "/api/v1/configuracao-empresa/integracoes",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provedor, chave, config }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        setFeedback({
          open: true,
          severity: "error",
          message: data.error || "Não foi possível salvar a integração.",
        });
        return;
      }

      applySavedIntegracao(provedor, data, integracao, config);
      setFeedback({
        open: true,
        severity:
          provedor === "asaas" &&
          (data.webhook?.error || data.config?.webhook_cleanup_error)
            ? "warning"
            : "success",
        message:
          provedor === "asaas" && data.config?.webhook_cleanup_error
            ? "Integração ASAAS salva, mas a remoção do webhook anterior precisa ser revisada."
            : provedor === "asaas" && data.webhook?.error
              ? "Integração ASAAS salva, mas o novo webhook precisa ser revisado."
              : `Integração ${provedor.toUpperCase()} salva com sucesso.`,
      });
    } catch (error) {
      setFeedback({
        open: true,
        severity: "error",
        message: "Erro ao salvar integração.",
      });
    } finally {
      setIntegracaoSaving(provedor, false);
    }
  };

  const handleSaveFaixas = async () => {
    try {
      const response = await authenticatedFetch(
        "/api/v1/configuracao-empresa/estoque",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ faixas }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setFeedback({
          open: true,
          severity: "error",
          message: data.error || "Não foi possível salvar as faixas.",
        });
        return;
      }
      setFeedback({
        open: true,
        severity: "success",
        message: "Configuração de estoque salva com sucesso.",
      });
      const nextFaixas = data.faixas || [];
      setFaixas(nextFaixas);
      setEmpresaConfiguracaoEstoque(nextFaixas);
    } catch (error) {
      setFeedback({
        open: true,
        severity: "error",
        message: "Erro ao salvar configuração.",
      });
    }
  };

  const handleBuscarAuditoria = () => {
    const codigo = codigoAuditoriaInput.trim();
    if (!codigo) {
      setFeedback({
        open: true,
        severity: "error",
        message: "Informe o código Origem (Ref) para pesquisar.",
      });
      return;
    }
    setCodigoAuditoriaBusca(codigo);
    setAuditoriaRealizada(true);
  };

  const handleLimparAuditoria = () => {
    setCodigoAuditoriaInput("");
    setCodigoAuditoriaBusca("");
    setAuditoriaRealizada(false);
  };

  const handleLogFilterChange = (field) => (event) => {
    const value = event.target.value;
    setLogsFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <AppLayout>
      <PageHeader
        title="Configuração da Empresa"
        subtitle="Defina as regras de estoque e as integrações externas do sistema."
      />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)}>
          <Tab value="estoque" label="Status de Estoque" />
          <Tab value="integracoes" label="Integrações" />
          <Tab value="auditoria" label="Auditoria" />
          <Tab value="logs" label="Logs" />
          <Tab value="apis" label="APIs Internas" />
        </Tabs>
      </Paper>

      {tab === "estoque" ? (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Defina os intervalos percentuais sem sobreposição. Ex.: Crítico 0
              a 30, Normal 30 a 80, Elevado 80 a 130 e Excesso acima de 130.
            </Typography>

            {faixas.map((faixa, index) => (
              <Grid container spacing={2} key={faixa.chave}>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Nome"
                    value={faixa.label}
                    onChange={handleFaixaChange(index, "label")}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Mínimo (%)"
                    type="number"
                    value={faixa.percentual_min ?? ""}
                    onChange={handleFaixaChange(index, "percentual_min")}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Máximo (%)"
                    type="number"
                    value={faixa.percentual_max ?? ""}
                    onChange={handleFaixaChange(index, "percentual_max")}
                    fullWidth
                    helperText="Deixe em branco para faixa aberta"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Ordem"
                    type="number"
                    value={faixa.ordem ?? ""}
                    onChange={handleFaixaChange(index, "ordem")}
                    fullWidth
                  />
                </Grid>
              </Grid>
            ))}

            <Box>
              <Button variant="contained" onClick={handleSaveFaixas}>
                Salvar configuração
              </Button>
            </Box>
          </Stack>
        </Paper>
      ) : null}

      {tab === "integracoes" ? (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              Configure as integrações externas. No ASAAS, o webhook é
              registrado automaticamente ao salvar a chave e é recriado quando a
              chave for alterada.
            </Typography>

            {Object.entries(integracoes).map(([provedor, integracao]) => {
              const bloqueado = integracao.configurado && !integracao.editando;
              const asaasTemPendencia = Boolean(
                integracao.webhook_error || integracao.webhook_cleanup_error,
              );
              const salvandoIntegracao = Boolean(savingIntegracoes[provedor]);
              return (
                <Paper key={provedor} variant="outlined" sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    {provedor === "asaas" ? (
                      <Stack spacing={2}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={4}>
                            <Typography fontWeight={700}>ASAAS</Typography>
                          </Grid>
                          {bloqueado ? (
                            <Grid item xs={12} md={8}>
                              <Button
                                variant="outlined"
                                fullWidth
                                onClick={() => handleEditarIntegracao(provedor)}
                                disabled={salvandoIntegracao}
                              >
                                Alterar chave
                              </Button>
                            </Grid>
                          ) : (
                            <>
                              <Grid item xs={12} md={5}>
                                <TextField
                                  fullWidth
                                  type="password"
                                  label={
                                    integracao.configurado
                                      ? "Nova chave da integração"
                                      : "Chave da integração"
                                  }
                                  placeholder={
                                    integracao.configurado
                                      ? "Digite a nova chave"
                                      : "Digite a chave"
                                  }
                                  value={integracao.chave}
                                  onChange={handleIntegracaoField(provedor)}
                                  disabled={salvandoIntegracao}
                                />
                              </Grid>
                              <Grid item xs={12} md={3}>
                                <Button
                                  variant="contained"
                                  fullWidth
                                  onClick={() =>
                                    handleSalvarIntegracao(provedor)
                                  }
                                  disabled={salvandoIntegracao}
                                >
                                  {salvandoIntegracao
                                    ? "Salvando..."
                                    : integracao.configurado
                                      ? "Atualizar chave"
                                      : "Salvar"}
                                </Button>
                              </Grid>
                            </>
                          )}
                        </Grid>

                        <Typography variant="body2" color="text.secondary">
                          Quando a chave do ASAAS for salva, o sistema registra
                          o webhook automaticamente. Se a chave for trocada, o
                          webhook anterior é removido antes do novo cadastro.
                        </Typography>

                        <FormControlLabel
                          control={
                            <Switch
                              checked={Boolean(
                                integracao.auto_charge_on_credit_sale,
                              )}
                              onChange={handleAsaasAutoChargeToggle}
                              disabled={salvandoIntegracao}
                            />
                          }
                          label="Cobrar automaticamente vendas a prazo no ASAAS"
                        />

                        <Alert severity="info">
                          {integracao.auto_charge_on_credit_sale
                            ? "Cada venda a prazo já emite automaticamente uma cobrança ASAAS por parcela, sem perguntar ao usuário."
                            : "Cada venda a prazo continua perguntando ao usuário, ao final do cadastro, se deseja emitir as cobranças ASAAS das parcelas."}
                        </Alert>

                        {salvandoIntegracao ? (
                          <Alert severity="info">
                            Salvando a configuração do ASAAS e sincronizando a
                            automação.
                          </Alert>
                        ) : null}

                        {integracao.configurado && bloqueado ? (
                          <Alert
                            severity={asaasTemPendencia ? "warning" : "success"}
                          >
                            {asaasTemPendencia
                              ? "ASAAS salvo, mas a sincronização do webhook precisa de revisão."
                              : "ASAAS integrado com sucesso."}
                          </Alert>
                        ) : null}

                        {integracao.webhook_registered_at ? (
                          <Alert severity="success">
                            Webhook sincronizado em{" "}
                            {formatAuditDateTime(
                              integracao.webhook_registered_at,
                            )}
                            .
                          </Alert>
                        ) : null}

                        {integracao.webhook_error ? (
                          <Alert severity="warning">
                            Registro automático do webhook:{" "}
                            {integracao.webhook_error}
                          </Alert>
                        ) : null}

                        {integracao.webhook_cleanup_error ? (
                          <Alert severity="warning">
                            Remoção do webhook anterior:{" "}
                            {integracao.webhook_cleanup_error}
                          </Alert>
                        ) : null}

                        {!integracao.webhook_registered_at &&
                        !asaasTemPendencia &&
                        !integracao.configurado ? (
                          <Alert severity="info">
                            Salve a chave para concluir a integração do ASAAS.
                          </Alert>
                        ) : null}
                      </Stack>
                    ) : (
                      <Stack spacing={2}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={4}>
                            <Typography fontWeight={700}>
                              {provedor.toUpperCase()}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={5}>
                            <TextField
                              fullWidth
                              type="password"
                              label="Chave da integração"
                              placeholder={
                                bloqueado
                                  ? "••••••••••••"
                                  : integracao.configurado
                                    ? "Deixe em branco para manter a chave atual"
                                    : "Digite a chave"
                              }
                              value={bloqueado ? "" : integracao.chave}
                              onChange={handleIntegracaoField(provedor)}
                              disabled={bloqueado || salvandoIntegracao}
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            {bloqueado ? (
                              <Button
                                variant="outlined"
                                fullWidth
                                onClick={() => handleEditarIntegracao(provedor)}
                                disabled={salvandoIntegracao}
                              >
                                Editar
                              </Button>
                            ) : (
                              <Button
                                variant="contained"
                                fullWidth
                                onClick={() => handleSalvarIntegracao(provedor)}
                                disabled={salvandoIntegracao}
                              >
                                {salvandoIntegracao ? "Salvando..." : "Salvar"}
                              </Button>
                            )}
                          </Grid>
                        </Grid>

                        <TextField
                          fullWidth
                          label="E-mail remetente"
                          placeholder="Ex.: Café Essências do Brasil <financeiro@empresa.com>"
                          value={integracao.from_email}
                          onChange={handleIntegracaoField(
                            "resend",
                            "from_email",
                          )}
                          disabled={bloqueado || salvandoIntegracao}
                        />
                        <TextField
                          fullWidth
                          multiline
                          minRows={2}
                          label="Destinatários dos lembretes"
                          placeholder="Separe por vírgula, ponto e vírgula ou quebra de linha"
                          value={integracao.notification_recipients_text}
                          onChange={handleIntegracaoField(
                            "resend",
                            "notification_recipients_text",
                          )}
                          disabled={bloqueado || salvandoIntegracao}
                        />
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      ) : null}

      {tab === "auditoria" ? (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Cole o código de Origem (Ref) para localizar todo o histórico
              vinculado em vendas, produção, contas e movimentações.
            </Typography>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <TextField
                fullWidth
                label="Origem (Ref)"
                placeholder="Ex.: 2b5f... ou crp-0004"
                value={codigoAuditoriaInput}
                onChange={(event) =>
                  setCodigoAuditoriaInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleBuscarAuditoria();
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleBuscarAuditoria}
                disabled={!hydrated}
              >
                Buscar histórico
              </Button>
              <Button variant="outlined" onClick={handleLimparAuditoria}>
                Limpar
              </Button>
            </Stack>

            {!hydrated ? (
              <Alert severity="info">
                Aguarde: os dados do sistema ainda estão carregando.
              </Alert>
            ) : null}

            {auditoriaRealizada && hydrated ? (
              auditoriaRegistros.length ? (
                <Stack spacing={2}>
                  <Alert severity="success">
                    {auditoriaRegistros.length} registro(s) encontrado(s) para{" "}
                    <strong>{codigoAuditoriaBusca}</strong>.
                  </Alert>

                  {auditoriaResumo.length ? (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" mb={1}>
                        Resumo por origem de dados
                      </Typography>
                      <Stack spacing={0.5}>
                        {auditoriaResumo.map(([label, total]) => (
                          <Typography
                            key={label}
                            variant="body2"
                            color="text.secondary"
                          >
                            {label}: {total}
                          </Typography>
                        ))}
                      </Stack>
                    </Paper>
                  ) : null}

                  {auditoriaRegistros.map((registro, index) => (
                    <Paper
                      key={`${registro.sourceKey}-${registro.row?.id || index}`}
                      variant="outlined"
                      sx={{ p: 2 }}
                    >
                      <Stack spacing={1}>
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", md: "center" }}
                          spacing={0.5}
                        >
                          <Typography variant="subtitle2" fontWeight={700}>
                            {registro.sourceLabel}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {registro.timelineLabel}
                          </Typography>
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                          ID: {normalizeAuditValue(registro.row?.id) || "-"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Vínculo:{" "}
                          {auditFieldLabels[registro.matchedField] ||
                            registro.matchedField}{" "}
                          = {registro.matchedValue}
                        </Typography>

                        <Box
                          component="pre"
                          sx={{
                            m: 0,
                            p: 1.5,
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "background.default",
                            fontSize: "0.75rem",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {JSON.stringify(registro.row, null, 2)}
                        </Box>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Alert severity="info">
                  Nenhum registro vinculado ao código{" "}
                  <strong>{codigoAuditoriaBusca}</strong>.
                </Alert>
              )
            ) : null}
          </Stack>
        </Paper>
      ) : null}

      {tab === "logs" ? (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Consulte as execuções mais recentes de webhooks e crons para
              auditoria operacional. Os dados abaixo são persistidos no banco e
              mostram payload, resposta, origem da chamada e possíveis falhas.
            </Typography>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel id="logs-tipo-label">Tipo</InputLabel>
                <Select
                  labelId="logs-tipo-label"
                  label="Tipo"
                  value={logsFilters.tipo}
                  onChange={handleLogFilterChange("tipo")}
                >
                  {logTypeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel id="logs-status-label">Status</InputLabel>
                <Select
                  labelId="logs-status-label"
                  label="Status"
                  value={logsFilters.status}
                  onChange={handleLogFilterChange("status")}
                >
                  {logStatusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                size="small"
                label="Buscar"
                placeholder="Evento, endpoint, referência ou erro"
                value={logsFilters.busca}
                onChange={handleLogFilterChange("busca")}
              />

              <Button
                variant="outlined"
                onClick={loadLogs}
                disabled={logsLoading}
              >
                {logsLoading ? "Atualizando..." : "Atualizar"}
              </Button>
            </Stack>

            {logsError ? <Alert severity="error">{logsError}</Alert> : null}
            {logsWarning ? (
              <Alert severity="warning">{logsWarning}</Alert>
            ) : null}

            {!logsError ? (
              <Alert severity="info">
                {logsFiltrados.length} log(s) exibido(s) de {logs.length}{" "}
                registro(s) carregado(s).
              </Alert>
            ) : null}

            {resumoLogs.length ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" mb={1}>
                  Resumo por status
                </Typography>
                <Stack spacing={0.5}>
                  {resumoLogs.map(([label, total]) => (
                    <Typography
                      key={label}
                      variant="body2"
                      color="text.secondary"
                    >
                      {label}: {total}
                    </Typography>
                  ))}
                </Stack>
              </Paper>
            ) : null}

            {logsFiltrados.length ? (
              <Stack spacing={1.5}>
                {logsFiltrados.map((log) => (
                  <Accordion key={log.id} disableGutters>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack spacing={1} sx={{ width: "100%" }}>
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", md: "center" }}
                          spacing={1}
                        >
                          <Typography variant="subtitle2" fontWeight={700}>
                            {log.descricao}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip
                              size="small"
                              label={log.tipo === "cron" ? "Cron" : "Webhook"}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              label={resolveLogStatusLabel(log.status)}
                              color={resolveLogStatusColor(log.status)}
                            />
                          </Stack>
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                          {buildLogPreview(log)}
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                          {formatAuditDateTime(log.executado_em)} • {log.metodo}{" "}
                          {log.endpoint}
                        </Typography>
                      </Stack>
                    </AccordionSummary>

                    <AccordionDetails>
                      <Stack spacing={2}>
                        <Grid container spacing={1.5}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">
                              Chave: {log.chave || "-"}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">
                              Origem da chamada: {log.origem || "-"}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">
                              Evento: {log.evento || "-"}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">
                              Referência: {log.referencia || "-"}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">
                              HTTP: {log.http_status ?? "-"}
                            </Typography>
                          </Grid>
                        </Grid>

                        {log.erro ? (
                          <Alert
                            severity={
                              resolveLogStatusColor(log.status) === "error"
                                ? "error"
                                : "warning"
                            }
                          >
                            {log.erro}
                          </Alert>
                        ) : null}

                        {hasJsonContent(log.request_headers) ? (
                          <Box>
                            <Typography variant="subtitle2" mb={0.5}>
                              Headers sanitizados
                            </Typography>
                            <Box component="pre" sx={logJsonBoxSx}>
                              {safeJsonStringify(log.request_headers)}
                            </Box>
                          </Box>
                        ) : null}

                        {hasJsonContent(log.request_payload) ? (
                          <Box>
                            <Typography variant="subtitle2" mb={0.5}>
                              Payload recebido
                            </Typography>
                            <Box component="pre" sx={logJsonBoxSx}>
                              {safeJsonStringify(log.request_payload)}
                            </Box>
                          </Box>
                        ) : null}

                        {hasJsonContent(log.response_payload) ? (
                          <Box>
                            <Typography variant="subtitle2" mb={0.5}>
                              Resposta registrada
                            </Typography>
                            <Box component="pre" sx={logJsonBoxSx}>
                              {safeJsonStringify(log.response_payload)}
                            </Box>
                          </Box>
                        ) : null}

                        {hasJsonContent(log.metadados) ? (
                          <Box>
                            <Typography variant="subtitle2" mb={0.5}>
                              Metadados
                            </Typography>
                            <Box component="pre" sx={logJsonBoxSx}>
                              {safeJsonStringify(log.metadados)}
                            </Box>
                          </Box>
                        ) : null}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            ) : !logsLoading && !logsError ? (
              <Alert severity="info">
                Nenhum log encontrado para os filtros atuais.
              </Alert>
            ) : null}
          </Stack>
        </Paper>
      ) : null}

      {tab === "apis" ? (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Documentação técnica dos endpoints internos protegidos por token.
            </Typography>
            {swaggerErro ? <Alert severity="error">{swaggerErro}</Alert> : null}
            <Box ref={swaggerContainerRef} sx={{ minHeight: 560 }} />
          </Stack>
        </Paper>
      ) : null}

      <Snackbar
        open={feedback.open}
        autoHideDuration={4000}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={feedback.severity}
          variant="filled"
          onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default ConfiguracaoEmpresaPage;
