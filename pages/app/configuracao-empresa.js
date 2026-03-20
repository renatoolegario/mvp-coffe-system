import {
  Alert,
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
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
    webhook_url: "",
    webhook_registered_at: "",
    webhook_error: "",
  },
  resend: {
    chave: "",
    configurado: false,
    editando: true,
    from_email: "",
    notification_recipients_text: "",
  },
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
  const [tab, setTab] = useState("estoque");
  const [faixas, setFaixas] = useState([]);
  const [integracoes, setIntegracoes] = useState(integracoesIniciais);
  const [feedback, setFeedback] = useState({
    open: false,
    severity: "success",
    message: "",
  });
  const [codigoAuditoriaInput, setCodigoAuditoriaInput] = useState("");
  const [codigoAuditoriaBusca, setCodigoAuditoriaBusca] = useState("");
  const [auditoriaRealizada, setAuditoriaRealizada] = useState(false);
  const [swaggerErro, setSwaggerErro] = useState("");
  const [appOrigin, setAppOrigin] = useState("");
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

  const defaultWebhookUrl = useMemo(
    () =>
      appOrigin
        ? `${appOrigin}/api/v1/integracoes/asaas/webhook`
        : "",
    [appOrigin],
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

  const loadFaixas = async () => {
    try {
      const response = await authenticatedFetch(
        "/api/v1/configuracao-empresa/estoque",
      );
      if (!response.ok) return;
      const data = await response.json();
      setFaixas(data.faixas || []);
    } catch (error) {
      setFaixas([]);
    }
  };

  const loadIntegracoes = async () => {
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
                  webhook_url: config.webhook_url || "",
                  webhook_registered_at: config.webhook_registered_at || "",
                  webhook_error: config.webhook_error || "",
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
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAppOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    loadFaixas();
    loadIntegracoes();
  }, []);

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

  const handleIntegracaoField = (provedor, field = "chave") => (event) => {
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

  const handleSalvarIntegracao = async (provedor) => {
    const integracao = integracoes[provedor];
    const chave = integracao?.chave?.trim();

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
      config.webhook_url = integracao.webhook_url || defaultWebhookUrl;
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
                webhook_url:
                  data.config?.webhook_url || config.webhook_url || "",
                webhook_registered_at:
                  data.config?.webhook_registered_at || "",
                webhook_error: data.config?.webhook_error || "",
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
      setFeedback({
        open: true,
        severity: "success",
        message:
          provedor === "asaas" && data.webhook?.error
            ? `Integração ${provedor.toUpperCase()} salva, mas o webhook precisa ser revisado.`
            : `Integração ${provedor.toUpperCase()} salva com sucesso.`,
      });
    } catch (error) {
      setFeedback({
        open: true,
        severity: "error",
        message: "Erro ao salvar integração.",
      });
    }
  };

  const handleCopyWebhook = async (value) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setFeedback({
        open: true,
        severity: "success",
        message: "URL do webhook copiada com sucesso.",
      });
    } catch (error) {
      setFeedback({
        open: true,
        severity: "error",
        message: "Não foi possível copiar a URL do webhook.",
      });
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
      setFaixas(data.faixas || []);
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
              Configure as integrações externas. Por segurança, a chave não é
              exibida novamente depois de salva, mas você pode manter a chave
              atual ao editar apenas os metadados.
            </Typography>

            {Object.entries(integracoes).map(([provedor, integracao]) => {
              const bloqueado = integracao.configurado && !integracao.editando;
              const webhookUrl = integracao.webhook_url || defaultWebhookUrl;
              return (
                <Paper key={provedor} variant="outlined" sx={{ p: 2.5 }}>
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
                          disabled={bloqueado}
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        {bloqueado ? (
                          <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => handleEditarIntegracao(provedor)}
                          >
                            Editar
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={() => handleSalvarIntegracao(provedor)}
                          >
                            Salvar
                          </Button>
                        )}
                      </Grid>
                    </Grid>

                    {provedor === "asaas" ? (
                      <Stack spacing={2}>
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={1.5}
                        >
                          <TextField
                            fullWidth
                            label="URL pública do webhook"
                            value={webhookUrl}
                            InputProps={{ readOnly: true }}
                          />
                          <Button
                            variant="outlined"
                            onClick={() => handleCopyWebhook(webhookUrl)}
                            disabled={!webhookUrl}
                          >
                            Copiar URL
                          </Button>
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                          Cole essa URL no cadastro de webhook do ASAAS. Ao
                          salvar a integração, o sistema também tenta fazer esse
                          vínculo automaticamente via API.
                        </Typography>

                        {integracao.webhook_registered_at ? (
                          <Alert severity="success">
                            Webhook sincronizado em{" "}
                            {formatAuditDateTime(
                              integracao.webhook_registered_at,
                            )}
                            .
                          </Alert>
                        ) : (
                          <Alert severity="info">
                            O webhook ainda não foi confirmado. Você pode usar a
                            URL acima para cadastrar manualmente no ASAAS.
                          </Alert>
                        )}

                        {integracao.webhook_error ? (
                          <Alert severity="warning">
                            Registro automático do webhook:{" "}
                            {integracao.webhook_error}
                          </Alert>
                        ) : null}
                      </Stack>
                    ) : null}

                    {provedor === "resend" ? (
                      <Stack spacing={2}>
                        <TextField
                          fullWidth
                          label="E-mail remetente"
                          placeholder="Ex.: Café Essências do Brasil <financeiro@empresa.com>"
                          value={integracao.from_email}
                          onChange={handleIntegracaoField(
                            "resend",
                            "from_email",
                          )}
                          disabled={bloqueado}
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
                          disabled={bloqueado}
                        />
                      </Stack>
                    ) : null}
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
