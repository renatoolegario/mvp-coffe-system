import {
  Alert,
  Box,
  Button,
  Chip,
  Drawer,
  Grid,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import SearchableSelect from "../../components/atomic/SearchableSelect";
import { useDataStore } from "../../hooks/useDataStore";
import { authenticatedFetch } from "../../hooks/useSession";
import { buildClienteCobrancaBlockMessage } from "../../utils/cliente";
import { formatCurrency, formatDate } from "../../utils/format";

const normalizeSearchValue = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateKey = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTomorrowDateKey = () => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return toDateKey(date);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
};

const readQueryValue = (value) => {
  if (Array.isArray(value)) return value[0] || "";
  if (!value) return "";
  return String(value);
};

const readApiBody = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
};

const isDateWithinRange = (dateKey, start, end) => {
  if (!dateKey) return false;
  if (start && dateKey < start) return false;
  if (end && dateKey > end) return false;
  return true;
};

const getDayDifference = (leftDateKey, rightDateKey) => {
  if (!leftDateKey || !rightDateKey) return 0;
  const left = new Date(`${leftDateKey}T12:00:00`);
  const right = new Date(`${rightDateKey}T12:00:00`);
  return Math.round((left.getTime() - right.getTime()) / 86400000);
};

const matchesSearch = (row, term) => {
  const normalizedTerm = normalizeSearchValue(term);
  if (!normalizedTerm) return true;

  const haystack = normalizeSearchValue(
    [
      row.clienteNome,
      row.contaLabel,
      row.parcelaLabel,
      row.vencimentoLabel,
      row.dataRecebimentoLabel,
      row.status,
      row.formaRecebimentoProgramada,
      row.formaRecebimentoReal,
      row.origemRecebimento,
      row.motivoDiferenca,
      row.asaasCobrancaStatus,
      row.asaasCobrancaEmitidaLabel,
    ].join(" "),
  );

  return haystack.includes(normalizedTerm);
};

const getStatusChipColor = (row) => {
  if (row.status === "RECEBIDA") return "success";
  if (row.isVencida) return "error";
  return "warning";
};

const buildEmptyRowMessage = (tab) =>
  tab === "vencidas"
    ? "Nenhuma conta vencida encontrada para o filtro aplicado."
    : "Nenhuma conta à vencer encontrada para o filtro aplicado.";

const resetRecebimentoForm = (setters, formaInicial) => {
  setters.setFormaRecebimento(formaInicial);
  setters.setFormaRecebimentoReal(formaInicial);
  setters.setValorRecebido("");
  setters.setMotivoDiferenca("");
  setters.setAcaoDiferenca("ACEITAR_ENCERRAR");
  setters.setOrigemRecebimento("NORMAL");
  setters.setFornecedorDestinoId("");
  setters.setObservacao("");
};

const buildAsaasChargeForm = (row) => {
  const minDueDate = getTomorrowDateKey();
  const parcelaDueDate = row?.vencimentoKey || toDateKey(row?.vencimento);
  const dueDate =
    parcelaDueDate && parcelaDueDate >= minDueDate
      ? parcelaDueDate
      : minDueDate;
  const parcelaNumero = Number(row?.parcela_num) || 0;
  const vendaRef =
    row?.conta?.origem_tipo === "venda" && row?.conta?.origem_id
      ? `venda ${String(row.conta.origem_id).slice(0, 8)}`
      : "parcela avulsa";

  return {
    descricao: row?.clienteNome
      ? `Cobrança ASAAS - ${row.clienteNome} - parcela ${parcelaNumero} - ${vendaRef}`
      : "Cobrança ASAAS",
    value:
      row?.valorProgramado !== undefined && row?.valorProgramado !== null
        ? String(row.valorProgramado)
        : "",
    due_date: dueDate,
  };
};

const ContasReceberPage = () => {
  const router = useRouter();
  const contas = useDataStore((state) => state.contasReceber);
  const parcelas = useDataStore((state) => state.contasReceberParcelas);
  const clientes = useDataStore((state) => state.clientes);
  const fornecedores = useDataStore((state) => state.fornecedores);
  const auxFormasPagamento = useDataStore((state) => state.auxFormasPagamento);
  const marcarParcelaRecebida = useDataStore(
    (state) => state.marcarParcelaRecebida,
  );
  const loadData = useDataStore((state) => state.loadData);

  const todayKey = toDateKey(new Date());
  const [tabAtiva, setTabAtiva] = useState("vencidas");
  const [clienteFiltroId, setClienteFiltroId] = useState("");
  const [buscaVencidas, setBuscaVencidas] = useState("");
  const [buscaAVencer, setBuscaAVencer] = useState("");
  const [dataInicioAVencer, setDataInicioAVencer] = useState("");
  const [dataFimAVencer, setDataFimAVencer] = useState("");
  const [parcelaSelecionadaId, setParcelaSelecionadaId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [formaRecebimento, setFormaRecebimento] = useState("PIX");
  const [formaRecebimentoReal, setFormaRecebimentoReal] = useState("PIX");
  const [valorRecebido, setValorRecebido] = useState("");
  const [motivoDiferenca, setMotivoDiferenca] = useState("");
  const [acaoDiferenca, setAcaoDiferenca] = useState("ACEITAR_ENCERRAR");
  const [origemRecebimento, setOrigemRecebimento] = useState("NORMAL");
  const [fornecedorDestinoId, setFornecedorDestinoId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [confirmandoRecebimento, setConfirmandoRecebimento] = useState(false);
  const [asaasConfigurado, setAsaasConfigurado] = useState(false);
  const [emitindoAsaasParcelaId, setEmitindoAsaasParcelaId] = useState("");
  const [emitirAsaasDialogOpen, setEmitirAsaasDialogOpen] = useState(false);
  const [emitirAsaasRow, setEmitirAsaasRow] = useState(null);
  const [emitirAsaasForm, setEmitirAsaasForm] = useState(
    buildAsaasChargeForm(null),
  );
  const [feedback, setFeedback] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const clienteFiltroFromUrl = readQueryValue(router.query.cliente_id);
  const parcelaFiltroId = readQueryValue(router.query.parcela_id);

  const contaById = useMemo(() => {
    const map = {};
    contas.forEach((conta) => {
      map[conta.id] = conta;
    });
    return map;
  }, [contas]);

  const clienteById = useMemo(() => {
    const map = {};
    clientes.forEach((cliente) => {
      map[cliente.id] = cliente;
    });
    return map;
  }, [clientes]);

  const formasPagamento = useMemo(
    () =>
      auxFormasPagamento.length
        ? auxFormasPagamento
        : [
            { codigo: "CHEQUE", label: "Cheque" },
            { codigo: "TRANSFERENCIA", label: "Transferência" },
            { codigo: "DINHEIRO", label: "Dinheiro" },
            { codigo: "PIX", label: "Pix" },
            { codigo: "CREDITO", label: "Crédito" },
            { codigo: "DEBITO", label: "Débito" },
          ],
    [auxFormasPagamento],
  );

  const parcelasEnriquecidas = useMemo(
    () =>
      parcelas
        .map((parcela) => {
          const conta = contaById[parcela.conta_receber_id];
          const cliente = clienteById[conta?.cliente_id];
          const vencimentoKey = toDateKey(parcela.vencimento);
          const valorProgramado = toNumber(
            parcela.valor_programado || parcela.valor,
          );
          const valorRecebidoAtual =
            parcela.valor_recebido === null ||
            parcela.valor_recebido === undefined
              ? null
              : toNumber(parcela.valor_recebido);
          const asaasCobrancaEmitida = Boolean(parcela.asaas_cobranca_emitida);
          const asaasCobrancaStatus = String(
            parcela.asaas_cobranca_status || "",
          ).trim();
          const asaasCobrancaLink = String(
            parcela.asaas_cobranca_link || "",
          ).trim();

          return {
            ...parcela,
            conta,
            cliente,
            clienteId: conta?.cliente_id || "",
            clienteNome: cliente?.nome || "Cliente não identificado",
            contaLabel: `#${String(parcela.conta_receber_id || "").slice(0, 8)}`,
            parcelaLabel: `#${String(parcela.id || "").slice(0, 8)}`,
            vencimentoKey,
            vencimentoLabel: formatDate(parcela.vencimento),
            dataRecebimentoLabel: formatDate(parcela.data_recebimento),
            valorProgramado,
            valorRecebidoAtual,
            formaRecebimentoProgramada: parcela.forma_recebimento || "-",
            formaRecebimentoReal: parcela.forma_recebimento_real || "-",
            origemRecebimento: parcela.origem_recebimento || "-",
            motivoDiferenca: parcela.motivo_diferenca || "",
            asaasCobrancaEmitida,
            asaasCobrancaEmitidaLabel: asaasCobrancaEmitida ? "Sim" : "Nao",
            asaasCobrancaStatus: asaasCobrancaStatus || "-",
            asaasCobrancaLink,
            isVencida: Boolean(vencimentoKey && vencimentoKey < todayKey),
            diasAtraso: Math.max(0, getDayDifference(todayKey, vencimentoKey)),
            diasAteVencimento: Math.max(
              0,
              getDayDifference(vencimentoKey, todayKey),
            ),
          };
        })
        .filter((row) => {
          if (clienteFiltroId && row.clienteId !== clienteFiltroId)
            return false;
          if (parcelaFiltroId && row.id !== parcelaFiltroId) return false;
          return true;
        }),
    [
      parcelas,
      contaById,
      clienteById,
      todayKey,
      clienteFiltroId,
      parcelaFiltroId,
    ],
  );

  const parcelasVencidasFiltradas = useMemo(
    () =>
      parcelasEnriquecidas
        .filter((row) => row.isVencida)
        .filter((row) => matchesSearch(row, buscaVencidas))
        .sort((a, b) => {
          if (a.status !== b.status) {
            return a.status === "ABERTA" ? -1 : 1;
          }
          if (a.vencimentoKey !== b.vencimentoKey) {
            return a.vencimentoKey.localeCompare(b.vencimentoKey);
          }
          return a.clienteNome.localeCompare(b.clienteNome, "pt-BR");
        }),
    [parcelasEnriquecidas, buscaVencidas],
  );

  const parcelasAVencerFiltradas = useMemo(
    () =>
      parcelasEnriquecidas
        .filter((row) => !row.isVencida && row.status === "ABERTA")
        .filter((row) =>
          isDateWithinRange(
            row.vencimentoKey,
            dataInicioAVencer,
            dataFimAVencer,
          ),
        )
        .filter((row) => matchesSearch(row, buscaAVencer))
        .sort((a, b) => {
          if (a.vencimentoKey !== b.vencimentoKey) {
            return a.vencimentoKey.localeCompare(b.vencimentoKey);
          }
          return a.clienteNome.localeCompare(b.clienteNome, "pt-BR");
        }),
    [parcelasEnriquecidas, buscaAVencer, dataInicioAVencer, dataFimAVencer],
  );

  const parcelaSelecionada = useMemo(
    () =>
      parcelasEnriquecidas.find((row) => row.id === parcelaSelecionadaId) ||
      null,
    [parcelasEnriquecidas, parcelaSelecionadaId],
  );
  const parcelaSelecionadaAsaasBlockMessage = useMemo(
    () =>
      buildClienteCobrancaBlockMessage(
        parcelaSelecionada?.cliente,
        "emitir cobranca no ASAAS",
      ),
    [parcelaSelecionada],
  );

  const resumoVencidas = useMemo(() => {
    const abertas = parcelasVencidasFiltradas.filter(
      (row) => row.status === "ABERTA",
    );
    const totalEmAberto = abertas.reduce(
      (acc, row) => acc + row.valorProgramado,
      0,
    );
    return {
      totalRegistros: parcelasVencidasFiltradas.length,
      totalAbertas: abertas.length,
      totalEmAberto,
    };
  }, [parcelasVencidasFiltradas]);

  const resumoAVencer = useMemo(() => {
    const totalProgramado = parcelasAVencerFiltradas.reduce(
      (acc, row) => acc + row.valorProgramado,
      0,
    );
    return {
      totalRegistros: parcelasAVencerFiltradas.length,
      totalProgramado,
    };
  }, [parcelasAVencerFiltradas]);

  useEffect(() => {
    if (!clienteFiltroFromUrl) return;
    setClienteFiltroId((prev) =>
      prev === clienteFiltroFromUrl ? prev : clienteFiltroFromUrl,
    );
  }, [clienteFiltroFromUrl]);

  useEffect(() => {
    if (!parcelaFiltroId) return;
    const parcelaAlvo = parcelas.find((item) => item.id === parcelaFiltroId);
    if (!parcelaAlvo) return;

    const contaAlvo = contaById[parcelaAlvo.conta_receber_id];
    if (contaAlvo?.cliente_id) {
      setClienteFiltroId((prev) =>
        prev === contaAlvo.cliente_id ? prev : contaAlvo.cliente_id,
      );
    }

    setParcelaSelecionadaId((prev) =>
      prev === parcelaAlvo.id ? prev : parcelaAlvo.id,
    );
    setTabAtiva(
      toDateKey(parcelaAlvo.vencimento) < todayKey ? "vencidas" : "a-vencer",
    );
  }, [parcelaFiltroId, parcelas, contaById, todayKey]);

  useEffect(() => {
    if (!parcelaSelecionadaId) return;
    const parcelaAindaExiste = parcelas.some(
      (item) => item.id === parcelaSelecionadaId,
    );
    if (parcelaAindaExiste) return;
    setParcelaSelecionadaId("");
    setDrawerOpen(false);
  }, [parcelas, parcelaSelecionadaId]);

  useEffect(() => {
    const loadIntegracoes = async () => {
      try {
        const response = await authenticatedFetch(
          "/api/v1/configuracao-empresa/integracoes",
        );
        const data = await readApiBody(response);
        if (!response.ok) return;

        const asaas = (data.integracoes || []).find(
          (item) => item.provedor === "asaas",
        );
        setAsaasConfigurado(Boolean(asaas?.configurado));
      } catch (error) {
        setAsaasConfigurado(false);
      }
    };

    loadIntegracoes();
  }, []);

  const filtrosViaUrlAtivos = Boolean(clienteFiltroFromUrl || parcelaFiltroId);

  const limparFiltrosViaUrl = () => {
    router.replace({ pathname: router.pathname, query: {} }, undefined, {
      shallow: true,
    });
    if (clienteFiltroFromUrl) {
      setClienteFiltroId("");
    }
    if (parcelaFiltroId) {
      setParcelaSelecionadaId("");
      setDrawerOpen(false);
    }
  };

  const abrirRecebimento = (row) => {
    if (!row || row.status !== "ABERTA") return;
    setParcelaSelecionadaId(row.id);
    resetRecebimentoForm(
      {
        setFormaRecebimento,
        setFormaRecebimentoReal,
        setValorRecebido,
        setMotivoDiferenca,
        setAcaoDiferenca,
        setOrigemRecebimento,
        setFornecedorDestinoId,
        setObservacao,
      },
      row.forma_recebimento || "PIX",
    );
    setDrawerOpen(true);
  };

  const irParaCliente = (row) => {
    if (!row?.clienteId) return;
    router.push({
      pathname: "/app/detalhe-cliente",
      query: {
        cliente_id: row.clienteId,
        drawer: "parcelas",
      },
    });
  };

  const confirmarRecebimento = async () => {
    if (
      !parcelaSelecionada ||
      parcelaSelecionada.status !== "ABERTA" ||
      confirmandoRecebimento
    ) {
      return;
    }

    const valorRecebidoNormalizado =
      valorRecebido === "" ? null : Math.max(0, toNumber(valorRecebido));
    const valorComparacao =
      valorRecebidoNormalizado === null
        ? parcelaSelecionada.valorProgramado
        : valorRecebidoNormalizado;

    if (
      valorComparacao < parcelaSelecionada.valorProgramado &&
      !motivoDiferenca.trim()
    ) {
      return;
    }

    if (
      origemRecebimento === "DIRETO_FORNECEDOR" &&
      !String(fornecedorDestinoId || "").trim()
    ) {
      return;
    }

    setConfirmandoRecebimento(true);

    try {
      const result = await marcarParcelaRecebida({
        id: parcelaSelecionada.id,
        forma_recebimento: formaRecebimento,
        forma_recebimento_real: formaRecebimentoReal,
        valor_recebido: valorRecebidoNormalizado,
        motivo_diferenca: motivoDiferenca,
        acao_diferenca: acaoDiferenca,
        origem_recebimento: origemRecebimento,
        fornecedor_destino_id:
          origemRecebimento === "DIRETO_FORNECEDOR"
            ? fornecedorDestinoId
            : null,
        observacao_recebimento: observacao,
      });

      if (!result?.ok) {
        setFeedback({
          open: true,
          severity: "error",
          message:
            result?.error || "Erro ao confirmar o recebimento da parcela.",
        });
        return;
      }

      setDrawerOpen(false);
      resetRecebimentoForm(
        {
          setFormaRecebimento,
          setFormaRecebimentoReal,
          setValorRecebido,
          setMotivoDiferenca,
          setAcaoDiferenca,
          setOrigemRecebimento,
          setFornecedorDestinoId,
          setObservacao,
        },
        parcelaSelecionada.forma_recebimento || "PIX",
      );
      setFeedback({
        open: true,
        severity: "success",
        message: result?.data?.asaas_charge_synced
          ? "Recebimento confirmado e cobranca ASAAS baixada com sucesso."
          : "Recebimento confirmado com sucesso.",
      });
    } finally {
      setConfirmandoRecebimento(false);
    }
  };

  const fecharEmitirAsaasDialog = () => {
    setEmitirAsaasDialogOpen(false);
    setEmitirAsaasRow(null);
    setEmitirAsaasForm(buildAsaasChargeForm(null));
  };

  const abrirEmitirAsaasDialog = (row) => {
    if (!row?.id) return;
    if (row.status !== "ABERTA") return;

    const blockMessage = buildClienteCobrancaBlockMessage(
      row.cliente,
      "emitir cobranca no ASAAS",
    );
    if (blockMessage) {
      setFeedback({
        open: true,
        severity: "error",
        message: blockMessage,
      });
      return;
    }

    if (row.asaasCobrancaEmitida) {
      setFeedback({
        open: true,
        severity: "info",
        message: "Esta parcela ja possui uma cobranca ASAAS emitida.",
      });
      return;
    }

    setEmitirAsaasRow(row);
    setEmitirAsaasForm(buildAsaasChargeForm(row));
    setEmitirAsaasDialogOpen(true);
  };

  const emitirCobrancaAsaas = async () => {
    if (!emitirAsaasRow?.id || emitindoAsaasParcelaId) return;
    const blockMessage = buildClienteCobrancaBlockMessage(
      emitirAsaasRow.cliente,
      "emitir cobranca no ASAAS",
    );
    if (blockMessage) {
      setFeedback({
        open: true,
        severity: "error",
        message: blockMessage,
      });
      return;
    }

    const value = Math.max(0, toNumber(emitirAsaasForm.value));
    const minDueDate = getTomorrowDateKey();

    if (value <= 0 || !emitirAsaasForm.due_date) {
      setFeedback({
        open: true,
        severity: "error",
        message: "Informe valor e vencimento válidos para emitir no ASAAS.",
      });
      return;
    }

    if (emitirAsaasForm.due_date < minDueDate) {
      setFeedback({
        open: true,
        severity: "error",
        message: `O vencimento precisa ser no mínimo ${minDueDate} (D+1).`,
      });
      return;
    }

    setEmitindoAsaasParcelaId(emitirAsaasRow.id);

    try {
      const response = await authenticatedFetch(
        "/api/v1/integracoes/asaas/cobrancas",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cliente_id: emitirAsaasRow.clienteId,
            venda_id:
              emitirAsaasRow.conta?.origem_tipo === "venda"
                ? emitirAsaasRow.conta?.origem_id
                : null,
            conta_receber_id: emitirAsaasRow.conta_receber_id,
            conta_receber_parcela_id: emitirAsaasRow.id,
            billing_type: "UNDEFINED",
            due_date: emitirAsaasForm.due_date,
            value,
            descricao: emitirAsaasForm.descricao,
            origem_tipo:
              emitirAsaasRow.conta?.origem_tipo === "venda"
                ? "VENDA"
                : "MANUAL",
            enforce_due_date_d1: true,
          }),
        },
      );
      const data = await readApiBody(response);

      if (!response.ok) {
        throw new Error(
          data.error || "Nao foi possivel emitir a cobranca ASAAS.",
        );
      }

      await loadData();
      fecharEmitirAsaasDialog();
      setFeedback({
        open: true,
        severity: "success",
        message:
          "Cobranca ASAAS emitida com sucesso para a parcela selecionada.",
      });
    } catch (error) {
      setFeedback({
        open: true,
        severity: "error",
        message:
          error.message || "Erro ao emitir a cobranca ASAAS da parcela.",
      });
    } finally {
      setEmitindoAsaasParcelaId("");
    }
  };

  const tabelaAtual =
    tabAtiva === "vencidas"
      ? parcelasVencidasFiltradas
      : parcelasAVencerFiltradas;

  return (
    <AppLayout>
      <PageHeader
        title="Contas a Receber"
        subtitle="Acompanhe contas vencidas e a vencer em tabelas com filtros rápidos e baixa individual."
      />

      {filtrosViaUrlAtivos ? (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={limparFiltrosViaUrl}>
              Limpar filtro rápido
            </Button>
          }
        >
          Filtro aplicado por atalho da página de clientes
          {clienteFiltroId && clienteById[clienteFiltroId]?.nome
            ? `: ${clienteById[clienteFiltroId].nome}`
            : ""}
          {parcelaFiltroId ? ` • Parcela ${parcelaFiltroId.slice(0, 8)}` : ""}
        </Alert>
      ) : null}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <SearchableSelect
              label="Cliente"
              value={clienteFiltroId}
              onChange={(event) => setClienteFiltroId(event.target.value)}
              fullWidth
            >
              <MenuItem value="">Todos os clientes</MenuItem>
              {clientes.map((cliente) => (
                <MenuItem key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </MenuItem>
              ))}
            </SearchableSelect>
          </Grid>

          <Grid item xs={12} md={tabAtiva === "vencidas" ? 8 : 4}>
            <TextField
              label="Busca rápida"
              placeholder="Cliente, data, conta, parcela ou status"
              value={tabAtiva === "vencidas" ? buscaVencidas : buscaAVencer}
              onChange={(event) =>
                tabAtiva === "vencidas"
                  ? setBuscaVencidas(event.target.value)
                  : setBuscaAVencer(event.target.value)
              }
              fullWidth
            />
          </Grid>

          {tabAtiva === "a-vencer" ? (
            <>
              <Grid item xs={12} md={2}>
                <TextField
                  type="date"
                  label="Vencimento de"
                  InputLabelProps={{ shrink: true }}
                  value={dataInicioAVencer}
                  onChange={(event) => setDataInicioAVencer(event.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  type="date"
                  label="Vencimento até"
                  InputLabelProps={{ shrink: true }}
                  value={dataFimAVencer}
                  onChange={(event) => setDataFimAVencer(event.target.value)}
                  fullWidth
                />
              </Grid>
            </>
          ) : null}
        </Grid>
      </Paper>

      <Paper sx={{ overflow: "hidden" }}>
        <Tabs value={tabAtiva} onChange={(_, value) => setTabAtiva(value)}>
          <Tab
            value="vencidas"
            label={`Contas vencidas (${parcelasVencidasFiltradas.length})`}
          />
          <Tab
            value="a-vencer"
            label={`Contas a vencer (${parcelasAVencerFiltradas.length})`}
          />
        </Tabs>

        <Box sx={{ p: 3, borderTop: 1, borderColor: "divider" }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            {tabAtiva === "vencidas" ? (
              <Typography variant="body2" color="text.secondary">
                {resumoVencidas.totalRegistros} registro(s) vencido(s) no
                histórico • {resumoVencidas.totalAbertas} ainda em aberto •
                Total pendente: {formatCurrency(resumoVencidas.totalEmAberto)}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {resumoAVencer.totalRegistros} parcela(s) a vencer • Total
                programado: {formatCurrency(resumoAVencer.totalProgramado)}
              </Typography>
            )}

            {tabAtiva === "a-vencer" &&
            (dataInicioAVencer || dataFimAVencer || buscaAVencer) ? (
              <Button
                size="small"
                onClick={() => {
                  setBuscaAVencer("");
                  setDataInicioAVencer("");
                  setDataFimAVencer("");
                }}
              >
                Limpar filtros da aba
              </Button>
            ) : null}

            {tabAtiva === "vencidas" && buscaVencidas ? (
              <Button size="small" onClick={() => setBuscaVencidas("")}>
                Limpar busca
              </Button>
            ) : null}
          </Stack>

          <TableContainer>
            <Table size="small">
              <TableHead>
                {tabAtiva === "vencidas" ? (
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Conta</TableCell>
                    <TableCell>Parcela</TableCell>
                    <TableCell>Vencimento</TableCell>
                    <TableCell align="right">Dias em atraso</TableCell>
                    <TableCell align="right">Valor programado</TableCell>
                    <TableCell align="right">Valor recebido</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Cobranca ASAAS</TableCell>
                    <TableCell>Status ASAAS</TableCell>
                    <TableCell>Link ASAAS</TableCell>
                    <TableCell>Recebimento</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Conta</TableCell>
                    <TableCell>Parcela</TableCell>
                    <TableCell>Vencimento</TableCell>
                    <TableCell align="right">Dias até vencer</TableCell>
                    <TableCell align="right">Valor programado</TableCell>
                    <TableCell>Forma programada</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Cobranca ASAAS</TableCell>
                    <TableCell>Status ASAAS</TableCell>
                    <TableCell>Link ASAAS</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                )}
              </TableHead>

              <TableBody>
                {!tabelaAtual.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={tabAtiva === "vencidas" ? 13 : 12}
                      align="center"
                    >
                      {buildEmptyRowMessage(tabAtiva)}
                    </TableCell>
                  </TableRow>
                ) : null}

                {tabelaAtual.map((row) => {
                  const isSelected = row.id === parcelaSelecionadaId;
                  return (
                    <TableRow
                      key={row.id}
                      hover
                      selected={isSelected}
                      onClick={() => setParcelaSelecionadaId(row.id)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell>{row.clienteNome}</TableCell>
                      <TableCell>{row.contaLabel}</TableCell>
                      <TableCell>{row.parcelaLabel}</TableCell>
                      <TableCell>{row.vencimentoLabel}</TableCell>
                      <TableCell align="right">
                        {tabAtiva === "vencidas"
                          ? row.diasAtraso
                          : row.diasAteVencimento}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(row.valorProgramado)}
                      </TableCell>

                      {tabAtiva === "vencidas" ? (
                        <>
                          <TableCell align="right">
                            {row.valorRecebidoAtual === null
                              ? "-"
                              : formatCurrency(row.valorRecebidoAtual)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              color={getStatusChipColor(row)}
                              label={row.status}
                            />
                          </TableCell>
                          <TableCell>{row.asaasCobrancaEmitidaLabel}</TableCell>
                          <TableCell>{row.asaasCobrancaStatus}</TableCell>
                          <TableCell>
                            {row.asaasCobrancaLink ? (
                              <Button
                                size="small"
                                variant="outlined"
                                component="a"
                                href={row.asaasCobrancaLink}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) => event.stopPropagation()}
                              >
                                Abrir
                              </Button>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {row.status === "RECEBIDA"
                              ? formatDateTime(row.data_recebimento)
                              : "Pendente"}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>
                            {row.formaRecebimentoProgramada}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              color={getStatusChipColor(row)}
                              label={row.status}
                            />
                          </TableCell>
                          <TableCell>{row.asaasCobrancaEmitidaLabel}</TableCell>
                          <TableCell>{row.asaasCobrancaStatus}</TableCell>
                          <TableCell>
                            {row.asaasCobrancaLink ? (
                              <Button
                                size="small"
                                variant="outlined"
                                component="a"
                                href={row.asaasCobrancaLink}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) => event.stopPropagation()}
                              >
                                Abrir
                              </Button>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </>
                      )}

                      <TableCell align="right">
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={1}
                          justifyContent="flex-end"
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(event) => {
                              event.stopPropagation();
                              irParaCliente(row);
                            }}
                            disabled={!row.clienteId}
                          >
                            Cliente
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={(event) => {
                              event.stopPropagation();
                              abrirRecebimento(row);
                            }}
                            disabled={row.status !== "ABERTA"}
                          >
                            Receber
                          </Button>
                          {asaasConfigurado && row.status === "ABERTA" ? (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={(event) => {
                                event.stopPropagation();
                                abrirEmitirAsaasDialog(row);
                              }}
                              disabled={
                                row.asaasCobrancaEmitida ||
                                emitindoAsaasParcelaId === row.id
                              }
                            >
                              {emitindoAsaasParcelaId === row.id
                                ? "Emitindo..."
                                : row.asaasCobrancaEmitida
                                  ? "Emitida"
                                  : "Emitir ASAAS"}
                            </Button>
                          ) : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 20 }}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: "30vw" },
            minWidth: { md: 360 },
            height: "100vh",
            p: 3,
          },
        }}
      >
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Confirmação de recebimento
        </Typography>

        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Cliente
            </Typography>
            <Typography fontWeight={600}>
              {parcelaSelecionada?.clienteNome || "-"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Parcela {parcelaSelecionada?.parcelaLabel || "-"} • Conta{" "}
              {parcelaSelecionada?.contaLabel || "-"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vencimento: {parcelaSelecionada?.vencimentoLabel || "-"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Valor programado:{" "}
              {formatCurrency(parcelaSelecionada?.valorProgramado || 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cobranca ASAAS emitida:{" "}
              {parcelaSelecionada?.asaasCobrancaEmitidaLabel || "Nao"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Status ASAAS: {parcelaSelecionada?.asaasCobrancaStatus || "-"}
            </Typography>
            {parcelaSelecionadaAsaasBlockMessage ? (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                {parcelaSelecionadaAsaasBlockMessage}
              </Alert>
            ) : null}
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} useFlexGap flexWrap="wrap">
              {parcelaSelecionada?.asaasCobrancaLink ? (
                <Button
                  size="small"
                  variant="outlined"
                  component="a"
                  href={parcelaSelecionada.asaasCobrancaLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir cobranca ASAAS
                </Button>
              ) : null}
              {asaasConfigurado &&
              parcelaSelecionada?.status === "ABERTA" &&
              !parcelaSelecionada?.asaasCobrancaEmitida ? (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => abrirEmitirAsaasDialog(parcelaSelecionada)}
                  disabled={emitindoAsaasParcelaId === parcelaSelecionada?.id}
                >
                  {emitindoAsaasParcelaId === parcelaSelecionada?.id
                    ? "Emitindo..."
                    : "Emitir cobranca ASAAS"}
                </Button>
              ) : null}
            </Stack>
          </Paper>

          <SearchableSelect
            label="Forma programada/recebida"
            value={formaRecebimento}
            onChange={(event) => setFormaRecebimento(event.target.value)}
          >
            {formasPagamento.map((forma) => (
              <MenuItem key={forma.codigo} value={forma.codigo}>
                {forma.label}
              </MenuItem>
            ))}
          </SearchableSelect>

          <SearchableSelect
            label="Forma real recebida"
            value={formaRecebimentoReal}
            onChange={(event) => setFormaRecebimentoReal(event.target.value)}
          >
            {formasPagamento.map((forma) => (
              <MenuItem key={forma.codigo} value={forma.codigo}>
                {forma.label}
              </MenuItem>
            ))}
          </SearchableSelect>

          <TextField
            label="Valor recebido (deixe vazio para valor integral)"
            type="number"
            value={valorRecebido}
            onChange={(event) => setValorRecebido(event.target.value)}
          />

          <SearchableSelect
            label="Origem do recebimento"
            value={origemRecebimento}
            onChange={(event) => setOrigemRecebimento(event.target.value)}
          >
            <MenuItem value="NORMAL">Pagamento direto do cliente</MenuItem>
            <MenuItem value="DIRETO_FORNECEDOR">
              Cliente pagou direto ao fornecedor
            </MenuItem>
          </SearchableSelect>

          {origemRecebimento === "DIRETO_FORNECEDOR" ? (
            <SearchableSelect
              label="Fornecedor que recebeu"
              value={fornecedorDestinoId}
              onChange={(event) => setFornecedorDestinoId(event.target.value)}
            >
              {fornecedores.map((fornecedor) => (
                <MenuItem key={fornecedor.id} value={fornecedor.id}>
                  {fornecedor.razao_social}
                </MenuItem>
              ))}
            </SearchableSelect>
          ) : null}

          <TextField
            label="Motivo da diferença (obrigatório se receber menor)"
            value={motivoDiferenca}
            onChange={(event) => setMotivoDiferenca(event.target.value)}
            multiline
            rows={2}
          />

          <SearchableSelect
            label="Ação para diferença"
            value={acaoDiferenca}
            onChange={(event) => setAcaoDiferenca(event.target.value)}
          >
            <MenuItem value="JOGAR_PROXIMA">
              Jogar diferença para próxima cobrança
            </MenuItem>
            <MenuItem value="ACEITAR_ENCERRAR">
              Aceitar diferença e encerrar cobrança
            </MenuItem>
          </SearchableSelect>

          <TextField
            label="Observações"
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            multiline
            rows={2}
          />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="outlined" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={confirmarRecebimento}
              disabled={
                !parcelaSelecionada ||
                parcelaSelecionada.status !== "ABERTA" ||
                confirmandoRecebimento
              }
            >
              {confirmandoRecebimento ? "Confirmando..." : "Confirmar"}
            </Button>
          </Stack>
        </Stack>
      </Drawer>

      <Drawer
        anchor="right"
        open={emitirAsaasDialogOpen}
        onClose={emitindoAsaasParcelaId ? undefined : fecharEmitirAsaasDialog}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: "40vw" },
            minWidth: { md: 420 },
            maxWidth: "100%",
            height: "100vh",
            p: 3,
            display: "flex",
          },
        }}
      >
        <Stack spacing={3} sx={{ height: "100%" }}>
          <Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Emitir cobrança ASAAS
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Complete os dados da cobrança desta parcela. O vencimento precisa
              ser no mínimo D+1.
            </Typography>
          </Box>

          <Stack spacing={2} sx={{ flex: 1 }}>
            <TextField
              label="Cliente"
              value={emitirAsaasRow?.clienteNome || "-"}
              InputProps={{ readOnly: true }}
              fullWidth
            />
            <TextField
              label="Parcela"
              value={
                emitirAsaasRow
                  ? `Parcela ${emitirAsaasRow.parcela_num} • Conta ${emitirAsaasRow.contaLabel} • Vencimento original ${emitirAsaasRow.vencimentoLabel}`
                  : ""
              }
              InputProps={{ readOnly: true }}
              fullWidth
            />
            <TextField
              label="Tipo de cobrança"
              value="Pergunte ao cliente"
              InputProps={{ readOnly: true }}
              fullWidth
            />
            <TextField
              label="Descrição"
              value={emitirAsaasForm.descricao}
              onChange={(event) =>
                setEmitirAsaasForm((prev) => ({
                  ...prev,
                  descricao: event.target.value,
                }))
              }
              fullWidth
            />
            <TextField
              label="Valor"
              type="number"
              value={emitirAsaasForm.value}
              onChange={(event) =>
                setEmitirAsaasForm((prev) => ({
                  ...prev,
                  value: event.target.value,
                }))
              }
              fullWidth
            />
            <TextField
              label="Vencimento"
              type="date"
              value={emitirAsaasForm.due_date}
              onChange={(event) =>
                setEmitirAsaasForm((prev) => ({
                  ...prev,
                  due_date: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: getTomorrowDateKey() }}
              helperText={`Mínimo: ${getTomorrowDateKey()} (D+1)`}
              fullWidth
            />
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              onClick={fecharEmitirAsaasDialog}
              disabled={Boolean(emitindoAsaasParcelaId)}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={emitirCobrancaAsaas}
              disabled={Boolean(emitindoAsaasParcelaId)}
            >
              {emitindoAsaasParcelaId ? "Emitindo..." : "Emitir cobrança"}
            </Button>
          </Stack>
        </Stack>
      </Drawer>

      <Snackbar
        open={feedback.open}
        autoHideDuration={4500}
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

export default ContasReceberPage;
