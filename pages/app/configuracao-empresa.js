import {
  Alert,
  Box,
  Button,
  Chip,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { authenticatedFetch, getAuthToken } from "../../hooks/useSession";
import { useDataStore } from "../../hooks/useDataStore";

const integracoesIniciais = {
  asaas: { chave: "", configurado: false, editando: true },
  resend: { chave: "", configurado: false, editando: true },
};

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
const FEEDBACK_STATUS_OPTIONS = {
  PROGRAMADO: {
    label: "Programado",
    color: "warning",
  },
  FINALIZADO: {
    label: "Finalizado",
    color: "success",
  },
};

const toDateInputValue = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createNovoFeedbackInicial = () => ({
  data: toDateInputValue(),
  nome_pagina: "",
  descricao: "",
  anexo_base64: "",
  anexo_nome: "",
});

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
  const router = useRouter();
  const [tab, setTab] = useState("estoque");
  const [faixas, setFaixas] = useState([]);
  const [integracoes, setIntegracoes] = useState(integracoesIniciais);
  const [feedbackItens, setFeedbackItens] = useState([]);
  const [feedbackFiltroStatus, setFeedbackFiltroStatus] = useState("todos");
  const [feedbackCarregando, setFeedbackCarregando] = useState(false);
  const [feedbackAdminMode, setFeedbackAdminMode] = useState(false);
  const [feedbackNovoAberto, setFeedbackNovoAberto] = useState(false);
  const [novoFeedback, setNovoFeedback] = useState(createNovoFeedbackInicial);
  const [feedback, setFeedback] = useState({
    open: false,
    severity: "success",
    message: "",
  });
  const [codigoAuditoriaInput, setCodigoAuditoriaInput] = useState("");
  const [codigoAuditoriaBusca, setCodigoAuditoriaBusca] = useState("");
  const [auditoriaRealizada, setAuditoriaRealizada] = useState(false);
  const [swaggerErro, setSwaggerErro] = useState("");
  const swaggerContainerRef = useRef(null);

  const hydrated = useDataStore((state) => state.hydrated);
  const vendas = useDataStore((state) => state.vendas);
  const vendaItens = useDataStore((state) => state.vendaItens);
  const vendaDetalhes = useDataStore((state) => state.vendaDetalhes);
  const contasPagar = useDataStore((state) => state.contasPagar);
  const contasPagarParcelas = useDataStore((state) => state.contasPagarParcelas);
  const contasReceber = useDataStore((state) => state.contasReceber);
  const contasReceberParcelas = useDataStore(
    (state) => state.contasReceberParcelas,
  );
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
      counters[registro.sourceLabel] = (counters[registro.sourceLabel] || 0) + 1;
    });
    return Object.entries(counters).sort((a, b) => b[1] - a[1]);
  }, [auditoriaRegistros]);
  const isAdminFeedbackMode = String(router.query?.admin || "") === "1";

  const loadFaixas = async () => {
    try {
      const response = await authenticatedFetch("/api/v1/configuracao-empresa/estoque");
      if (!response.ok) return;
      const data = await response.json();
      setFaixas(data.faixas || []);
    } catch (error) {
      setFaixas([]);
    }
  };

  const loadIntegracoes = async () => {
    try {
      const response = await authenticatedFetch("/api/v1/configuracao-empresa/integracoes");
      if (!response.ok) return;
      const data = await response.json();

      setIntegracoes((prev) => {
        const next = { ...prev };
        for (const integracao of data.integracoes || []) {
          const provedor = integracao.provedor;
          next[provedor] = {
            ...prev[provedor],
            configurado: Boolean(integracao.configurado),
            editando: !integracao.configurado,
            chave: "",
          };
        }
        return next;
      });
    } catch (error) {
      setIntegracoes(integracoesIniciais);
    }
  };

  const loadFeedbacks = useCallback(async () => {
    setFeedbackCarregando(true);
    try {
      const params = new URLSearchParams();
      if (feedbackFiltroStatus !== "todos") {
        params.set("status", feedbackFiltroStatus);
      }
      if (isAdminFeedbackMode) {
        params.set("admin", "1");
      }

      const queryString = params.toString();
      const response = await authenticatedFetch(
        `/api/v1/configuracao-empresa/feedback${
          queryString ? `?${queryString}` : ""
        }`,
      );
      const data = await response.json();

      if (!response.ok) {
        setFeedback({
          open: true,
          severity: "error",
          message: data.error || "Não foi possível carregar os feedbacks.",
        });
        setFeedbackItens([]);
        setFeedbackAdminMode(isAdminFeedbackMode);
        return;
      }

      setFeedbackItens(data.feedbacks || []);
      setFeedbackAdminMode(Boolean(data.admin));
    } catch (error) {
      setFeedbackItens([]);
      setFeedbackAdminMode(isAdminFeedbackMode);
      setFeedback({
        open: true,
        severity: "error",
        message: "Erro ao carregar os feedbacks.",
      });
    } finally {
      setFeedbackCarregando(false);
    }
  }, [feedbackFiltroStatus, isAdminFeedbackMode]);

  useEffect(() => {
    loadFaixas();
    loadIntegracoes();
  }, []);

  useEffect(() => {
    if (tab !== "feedback") return;
    loadFeedbacks();
  }, [tab, loadFeedbacks]);

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
          script.src = "https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js";
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const token = getAuthToken();
      if (!token || !swaggerContainerRef.current || !window.SwaggerUIBundle) return;

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

  const handleIntegracaoField = (provedor) => (event) => {
    const value = event.target.value;
    setIntegracoes((prev) => ({
      ...prev,
      [provedor]: {
        ...prev[provedor],
        chave: value,
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
    const chave = integracoes[provedor]?.chave?.trim();

    if (!chave) {
      setFeedback({
        open: true,
        severity: "error",
        message: "Informe a chave da integração antes de salvar.",
      });
      return;
    }

    try {
      const response = await authenticatedFetch("/api/v1/configuracao-empresa/integracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provedor, chave }),
      });
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
        },
      }));
      setFeedback({
        open: true,
        severity: "success",
        message: `Integração ${provedor.toUpperCase()} salva com sucesso.`,
      });
    } catch (error) {
      setFeedback({
        open: true,
        severity: "error",
        message: "Erro ao salvar integração.",
      });
    }
  };

  const handleSaveFaixas = async () => {
    try {
      const response = await authenticatedFetch("/api/v1/configuracao-empresa/estoque", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faixas }),
      });
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

  const handleNovoFeedbackField = (field) => (event) => {
    const value = event.target.value;
    setNovoFeedback((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNovoFeedbackAnexo = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setNovoFeedback((prev) => ({
        ...prev,
        anexo_base64: "",
        anexo_nome: "",
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNovoFeedback((prev) => ({
        ...prev,
        anexo_base64: String(reader.result || ""),
        anexo_nome: file.name,
      }));
    };
    reader.onerror = () => {
      setFeedback({
        open: true,
        severity: "error",
        message: "Não foi possível processar o anexo.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFecharNovoFeedback = () => {
    setFeedbackNovoAberto(false);
    setNovoFeedback(createNovoFeedbackInicial());
  };

  const handleSalvarNovoFeedback = async () => {
    const descricao = novoFeedback.descricao.trim();
    if (!descricao) {
      setFeedback({
        open: true,
        severity: "error",
        message: "Descrição é obrigatória para registrar feedback.",
      });
      return;
    }

    try {
      const response = await authenticatedFetch("/api/v1/configuracao-empresa/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: novoFeedback.data,
          nome_pagina: novoFeedback.nome_pagina,
          descricao,
          anexo_base64: novoFeedback.anexo_base64,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setFeedback({
          open: true,
          severity: "error",
          message: data.error || "Não foi possível salvar o feedback.",
        });
        return;
      }

      setFeedback({
        open: true,
        severity: "success",
        message: "Feedback criado com sucesso.",
      });
      handleFecharNovoFeedback();
      loadFeedbacks();
    } catch (error) {
      setFeedback({
        open: true,
        severity: "error",
        message: "Erro ao salvar feedback.",
      });
    }
  };

  const handleFinalizarFeedback = async (id) => {
    try {
      const response = await authenticatedFetch(
        `/api/v1/configuracao-empresa/feedback/${id}/finalizar`,
        { method: "PATCH" },
      );
      const data = await response.json();
      if (!response.ok) {
        setFeedback({
          open: true,
          severity: "error",
          message: data.error || "Não foi possível finalizar o feedback.",
        });
        return;
      }

      setFeedback({
        open: true,
        severity: "success",
        message: "Feedback finalizado com sucesso.",
      });
      loadFeedbacks();
    } catch (error) {
      setFeedback({
        open: true,
        severity: "error",
        message: "Erro ao finalizar feedback.",
      });
    }
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
          <Tab value="feedback" label="Feedback" />
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
              Configure as chaves das integrações. Por segurança, a chave não é
              exibida novamente depois de salva.
            </Typography>

            {Object.entries(integracoes).map(([provedor, integracao]) => {
              const bloqueado = integracao.configurado && !integracao.editando;
              return (
                <Grid container spacing={2} key={provedor} alignItems="center">
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
                        bloqueado ? "••••••••••••" : "Digite a chave"
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
                onChange={(event) => setCodigoAuditoriaInput(event.target.value)}
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
                          <Typography key={label} variant="body2" color="text.secondary">
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
                          {auditFieldLabels[registro.matchedField] || registro.matchedField} ={" "}
                          {registro.matchedValue}
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

      {tab === "feedback" ? (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Registre sugestões e pendências com data, descrição obrigatória e
              print opcional (anexo em base64).
            </Typography>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  variant={feedbackNovoAberto ? "outlined" : "contained"}
                  onClick={() =>
                    feedbackNovoAberto
                      ? handleFecharNovoFeedback()
                      : setFeedbackNovoAberto(true)
                  }
                >
                  {feedbackNovoAberto ? "Cancelar" : "Novo Feedback"}
                </Button>
                <FormControl sx={{ minWidth: 220 }} size="small">
                  <InputLabel id="feedback-status-label">Filtrar status</InputLabel>
                  <Select
                    labelId="feedback-status-label"
                    label="Filtrar status"
                    value={feedbackFiltroStatus}
                    onChange={(event) => setFeedbackFiltroStatus(event.target.value)}
                  >
                    <MenuItem value="todos">Todos</MenuItem>
                    <MenuItem value="programado">Programado</MenuItem>
                    <MenuItem value="finalizado">Finalizado</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              {feedbackAdminMode ? (
                <Chip label="Modo admin ativo" color="info" variant="outlined" />
              ) : null}
            </Stack>

            {feedbackNovoAberto ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Data"
                        InputLabelProps={{ shrink: true }}
                        value={novoFeedback.data}
                        onChange={handleNovoFeedbackField("data")}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Nome da página"
                        placeholder="Ex.: Configuração da Empresa"
                        value={novoFeedback.nome_pagina}
                        onChange={handleNovoFeedbackField("nome_pagina")}
                      />
                    </Grid>
                    <Grid item xs={12} md={5}>
                      <Button component="label" variant="outlined" fullWidth>
                        {novoFeedback.anexo_nome
                          ? `Anexo: ${novoFeedback.anexo_nome}`
                          : "Selecionar print (opcional)"}
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={handleNovoFeedbackAnexo}
                        />
                      </Button>
                    </Grid>
                  </Grid>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Descrição *"
                    placeholder="Descreva o feedback..."
                    value={novoFeedback.descricao}
                    onChange={handleNovoFeedbackField("descricao")}
                  />
                  <Box>
                    <Button variant="contained" onClick={handleSalvarNovoFeedback}>
                      Salvar feedback
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            ) : null}

            {feedbackCarregando ? (
              <Alert severity="info">Carregando feedbacks...</Alert>
            ) : null}

            {!feedbackCarregando && !feedbackItens.length ? (
              <Alert severity="info">
                Nenhum feedback encontrado para o filtro selecionado.
              </Alert>
            ) : null}

            <Stack spacing={1.5}>
              {feedbackItens.map((item) => {
                const statusMeta =
                  FEEDBACK_STATUS_OPTIONS[item.status] ||
                  FEEDBACK_STATUS_OPTIONS.PROGRAMADO;
                return (
                  <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "center" }}
                        spacing={1}
                      >
                        <Typography variant="subtitle1" fontWeight={700}>
                          {item.nome_pagina || "Página não informada"}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            size="small"
                            label={statusMeta.label}
                            color={statusMeta.color}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Data: {toDateInputValue(item.data)}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Typography variant="body2">{item.descricao}</Typography>

                      {item.anexo_base64 ? (
                        <Box>
                          <Button
                            component="a"
                            href={item.anexo_base64}
                            target="_blank"
                            rel="noreferrer"
                            size="small"
                          >
                            Ver anexo
                          </Button>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Sem anexo.
                        </Typography>
                      )}

                      {feedbackAdminMode && item.status === "PROGRAMADO" ? (
                        <Box>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleFinalizarFeedback(item.id)}
                          >
                            Finalizar
                          </Button>
                        </Box>
                      ) : null}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
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
