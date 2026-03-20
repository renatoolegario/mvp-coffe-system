import {
  Alert,
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  MenuItem,
  Paper,
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
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import SearchableSelect from "../../components/atomic/SearchableSelect";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";

const APP_TIMEZONE = "America/Sao_Paulo";

const dateKeyFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const ORIGEM_LABELS = {
  entrada_insumos: "Entrada de insumos",
  entrada_insumos_custo_extra: "Custo extra de entrada",
  custo_adicional_producao: "Custo adicional de produção",
  venda_despesa_extra: "Despesa extra de venda",
  cliente_pagou_direto_fornecedor: "Pagamento direto cliente-fornecedor",
  diferenca_pagamento_conta_pagar: "Diferença de pagamento",
};

const emptyModalState = {
  open: false,
  parcelaId: "",
  contaId: "",
  valorOriginal: 0,
  valorPagamento: "",
  formaPagamento: "TRANSFERENCIA",
  acaoDiferenca: "",
};

const sideDrawerPaperSx = {
  width: { xs: "100%", md: "40vw" },
  minWidth: { md: 420 },
  maxWidth: "100%",
  height: "100vh",
  p: 3,
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const toDateKey = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return dateKeyFormatter.format(date);
};

const todayDateKey = () => dateKeyFormatter.format(new Date());

const toDayStamp = (dateKey) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ""))) return null;
  const [year, month, day] = dateKey
    .split("-")
    .map((item) => Number(item) || 0);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
};

const getDaysBetween = (fromDateKey, toDateKeyValue) => {
  const from = toDayStamp(fromDateKey);
  const to = toDayStamp(toDateKeyValue);
  if (from === null || to === null) return null;
  return to - from;
};

const isDateWithinRange = (value, start, end) => {
  const current = toDateKey(value);
  if (!current) return false;
  if (start && current < start) return false;
  if (end && current > end) return false;
  return true;
};

const getOrigemLabel = (conta) => {
  const origemTipo = String(conta?.origem_tipo || "").trim();
  if (!origemTipo) return "-";

  if (origemTipo === "diferenca_pagamento_conta_pagar") {
    return conta?.origem_id
      ? `Diferença da parcela #${String(conta.origem_id).slice(0, 8)}`
      : ORIGEM_LABELS[origemTipo];
  }

  return ORIGEM_LABELS[origemTipo] || origemTipo;
};

const getStatusChip = (status, isVencida) => {
  const normalizedStatus = String(status || "")
    .trim()
    .toUpperCase();

  if (normalizedStatus === "PAGA" || normalizedStatus === "PAGO") {
    return { label: "Paga", color: "success" };
  }

  if (isVencida) {
    return { label: "Em atraso", color: "error" };
  }

  return { label: "Em aberto", color: "warning" };
};

const getPrazoLabel = (diasAteVencimento, isVencida) => {
  if (diasAteVencimento === null) return "-";
  if (diasAteVencimento === 0) return "Vence hoje";
  if (isVencida) return `${Math.abs(diasAteVencimento)} dia(s) em atraso`;
  return `Vence em ${diasAteVencimento} dia(s)`;
};

const shortId = (value) => String(value || "").slice(0, 8) || "-";

const ContasPagarPage = () => {
  const contas = useDataStore((state) => state.contasPagar);
  const parcelas = useDataStore((state) => state.contasPagarParcelas);
  const fornecedores = useDataStore((state) => state.fornecedores);
  const auxFormasPagamento = useDataStore((state) => state.auxFormasPagamento);
  const marcarParcelaPaga = useDataStore((state) => state.marcarParcelaPaga);

  const initialStartDate = todayDateKey();

  const [tabAtiva, setTabAtiva] = useState("vencidas");
  const [fornecedorFiltroId, setFornecedorFiltroId] = useState("");
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState(initialStartDate);
  const [dataFim, setDataFim] = useState("");
  const [contaSelecionadaId, setContaSelecionadaId] = useState("");
  const [confirmModal, setConfirmModal] = useState(emptyModalState);

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

  const formaPagamentoLabelByCode = useMemo(() => {
    const map = {};
    formasPagamento.forEach((forma) => {
      map[String(forma.codigo || "").toUpperCase()] = forma.label;
    });
    return map;
  }, [formasPagamento]);

  const contaById = useMemo(() => {
    const map = {};
    contas.forEach((conta) => {
      map[conta.id] = conta;
    });
    return map;
  }, [contas]);

  const fornecedorById = useMemo(() => {
    const map = {};
    fornecedores.forEach((fornecedor) => {
      map[fornecedor.id] = fornecedor;
    });
    return map;
  }, [fornecedores]);

  const todayKey = todayDateKey();
  const buscaNormalizada = normalizeText(busca);

  const parcelasComMetadados = useMemo(
    () =>
      parcelas.map((parcela) => {
        const conta = contaById[parcela.conta_pagar_id] || null;
        const fornecedorNome =
          fornecedorById[conta?.fornecedor_id]?.razao_social ||
          "Sem fornecedor";
        const vencimentoKey = toDateKey(parcela.vencimento);
        const isVencida = Boolean(vencimentoKey && vencimentoKey < todayKey);
        const diasAteVencimento = getDaysBetween(todayKey, vencimentoKey);
        const origemLabel = getOrigemLabel(conta);

        return {
          parcela,
          conta,
          fornecedorNome,
          origemLabel,
          vencimentoKey,
          isVencida,
          diasAteVencimento,
          searchBlob: normalizeText(
            [
              fornecedorNome,
              origemLabel,
              conta?.id,
              conta?.origem_id,
              parcela.id,
              parcela.parcela_num,
              parcela.status,
              vencimentoKey,
              formatDate(parcela.vencimento),
            ].join(" "),
          ),
        };
      }),
    [parcelas, contaById, fornecedorById, todayKey],
  );

  const parcelasVencidas = useMemo(
    () =>
      parcelasComMetadados
        .filter((row) => {
          if (!row.isVencida) return false;
          if (
            fornecedorFiltroId &&
            row.conta?.fornecedor_id !== fornecedorFiltroId
          ) {
            return false;
          }
          if (buscaNormalizada && !row.searchBlob.includes(buscaNormalizada)) {
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          if (a.parcela.status !== b.parcela.status) {
            return a.parcela.status === "ABERTA" ? -1 : 1;
          }

          if (a.vencimentoKey !== b.vencimentoKey) {
            return a.vencimentoKey.localeCompare(b.vencimentoKey);
          }

          return (
            toNumber(a.parcela.parcela_num) - toNumber(b.parcela.parcela_num)
          );
        }),
    [parcelasComMetadados, fornecedorFiltroId, buscaNormalizada],
  );

  const parcelasAVencer = useMemo(
    () =>
      parcelasComMetadados
        .filter((row) => {
          if (row.parcela.status !== "ABERTA") return false;
          if (row.isVencida) return false;
          if (
            fornecedorFiltroId &&
            row.conta?.fornecedor_id !== fornecedorFiltroId
          ) {
            return false;
          }
          if (buscaNormalizada && !row.searchBlob.includes(buscaNormalizada)) {
            return false;
          }
          if (!isDateWithinRange(row.vencimentoKey, dataInicio, dataFim)) {
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          if (a.vencimentoKey !== b.vencimentoKey) {
            return a.vencimentoKey.localeCompare(b.vencimentoKey);
          }

          return (
            toNumber(a.parcela.parcela_num) - toNumber(b.parcela.parcela_num)
          );
        }),
    [
      parcelasComMetadados,
      fornecedorFiltroId,
      buscaNormalizada,
      dataInicio,
      dataFim,
    ],
  );

  const resumoVencidas = useMemo(
    () => ({
      quantidade: parcelasVencidas.length,
      valorTotal: parcelasVencidas.reduce(
        (acc, row) => acc + toNumber(row.parcela.valor),
        0,
      ),
      abertas: parcelasVencidas.filter((row) => row.parcela.status === "ABERTA")
        .length,
    }),
    [parcelasVencidas],
  );

  const resumoAVencer = useMemo(
    () => ({
      quantidade: parcelasAVencer.length,
      valorTotal: parcelasAVencer.reduce(
        (acc, row) => acc + toNumber(row.parcela.valor),
        0,
      ),
    }),
    [parcelasAVencer],
  );

  const rowsAtivas =
    tabAtiva === "vencidas" ? parcelasVencidas : parcelasAVencer;

  useEffect(() => {
    if (!contaSelecionadaId) return;

    const contaAtivaVisivel = rowsAtivas.some(
      (row) => row.conta?.id === contaSelecionadaId,
    );

    if (!contaAtivaVisivel) {
      setContaSelecionadaId("");
    }
  }, [contaSelecionadaId, rowsAtivas]);

  const contaSelecionada = contaSelecionadaId
    ? contaById[contaSelecionadaId]
    : null;

  const parcelasContaSelecionada = useMemo(() => {
    if (!contaSelecionadaId) return [];

    return parcelas
      .filter((parcela) => parcela.conta_pagar_id === contaSelecionadaId)
      .sort((a, b) => {
        if (toNumber(a.parcela_num) !== toNumber(b.parcela_num)) {
          return toNumber(a.parcela_num) - toNumber(b.parcela_num);
        }

        return toDateKey(a.vencimento).localeCompare(toDateKey(b.vencimento));
      });
  }, [parcelas, contaSelecionadaId]);

  const parcelaModal = useMemo(
    () =>
      parcelas.find((parcela) => parcela.id === confirmModal.parcelaId) || null,
    [parcelas, confirmModal.parcelaId],
  );

  const contaModal = useMemo(() => {
    if (confirmModal.contaId) {
      return contaById[confirmModal.contaId] || null;
    }

    return parcelaModal ? contaById[parcelaModal.conta_pagar_id] || null : null;
  }, [confirmModal.contaId, contaById, parcelaModal]);

  const valorOriginalModal = toNumber(confirmModal.valorOriginal);
  const valorPagamentoModal = Math.max(
    0,
    toNumber(confirmModal.valorPagamento),
  );
  const diferencaModal = Number(
    (valorOriginalModal - valorPagamentoModal).toFixed(2),
  );
  const exigeAcaoDiferenca = diferencaModal > 0;
  const temFornecedorContaModal = Boolean(contaModal?.fornecedor_id);
  const bloqueiaJogarProxima =
    exigeAcaoDiferenca &&
    confirmModal.acaoDiferenca === "JOGAR_PROXIMA" &&
    !temFornecedorContaModal;

  const resetFiltros = () => {
    setFornecedorFiltroId("");
    setBusca("");
    setDataInicio(todayDateKey());
    setDataFim("");
  };

  const handleSelecionarConta = (contaId) => {
    if (!contaId) return;
    setContaSelecionadaId(contaId);
  };

  const handleAbrirModal = (row) => {
    if (row.parcela.status !== "ABERTA") return;

    const formaPadrao = formasPagamento[0]?.codigo || "TRANSFERENCIA";
    const valorOriginal = toNumber(row.parcela.valor);

    setContaSelecionadaId("");
    setConfirmModal({
      open: true,
      parcelaId: row.parcela.id,
      contaId: row.parcela.conta_pagar_id,
      valorOriginal,
      valorPagamento: String(valorOriginal.toFixed(2)),
      formaPagamento: formaPadrao,
      acaoDiferenca: "",
    });
  };

  const handleFecharModal = () => {
    setConfirmModal({
      ...emptyModalState,
      formaPagamento: formasPagamento[0]?.codigo || "TRANSFERENCIA",
    });
  };

  const handleConfirmarPagamento = async () => {
    if (!parcelaModal) return;
    if (exigeAcaoDiferenca && !confirmModal.acaoDiferenca) return;
    if (exigeAcaoDiferenca && bloqueiaJogarProxima) return;

    await marcarParcelaPaga({
      id: parcelaModal.id,
      forma_pagamento: confirmModal.formaPagamento,
      valor_original: valorOriginalModal,
      valor_pago: valorPagamentoModal,
      acao_diferenca: exigeAcaoDiferenca ? confirmModal.acaoDiferenca : null,
    });

    handleFecharModal();
  };

  const renderPagamentoCell = (parcela) => {
    if (!parcela.data_pagamento) {
      return "-";
    }

    const forma =
      formaPagamentoLabelByCode[
        String(parcela.forma_pagamento || "").toUpperCase()
      ];

    return `${formatDate(parcela.data_pagamento)}${forma ? ` • ${forma}` : ""}`;
  };

  const renderRows = (rows, emptyMessage) => {
    if (!rows.length) {
      return (
        <TableRow>
          <TableCell colSpan={7} align="center">
            {emptyMessage}
          </TableCell>
        </TableRow>
      );
    }

    return rows.map((row) => {
      const statusChip = getStatusChip(row.parcela.status, row.isVencida);
      const pagamentoStatusLabel = row.parcela.data_pagamento
        ? renderPagamentoCell(row.parcela)
        : null;

      return (
        <TableRow
          key={row.parcela.id}
          hover
          selected={contaSelecionadaId === row.conta?.id}
        >
          <TableCell>
            <Typography fontWeight={600}>{row.fornecedorNome}</Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Conta #{shortId(row.conta?.id)} • Parcela #
              {row.parcela.parcela_num}
            </Typography>
          </TableCell>
          <TableCell>
            <Typography>{formatDate(row.parcela.vencimento)}</Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              {row.vencimentoKey || "-"}
            </Typography>
          </TableCell>
          <TableCell>
            {getPrazoLabel(row.diasAteVencimento, row.isVencida)}
          </TableCell>
          <TableCell align="right">
            {formatCurrency(row.parcela.valor)}
          </TableCell>
          <TableCell>
            <Typography variant="body2">{row.origemLabel}</Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Ref: {row.conta?.origem_id || "-"}
            </Typography>
          </TableCell>
          <TableCell sx={{ verticalAlign: "middle" }}>
            {pagamentoStatusLabel ? (
              <Stack spacing={1}>
                <Chip
                  size="small"
                  label={statusChip.label}
                  color={statusChip.color}
                  variant={
                    row.parcela.status === "ABERTA" ? "filled" : "outlined"
                  }
                />
                <Typography variant="caption" color="text.secondary">
                  {pagamentoStatusLabel}
                </Typography>
              </Stack>
            ) : (
              <Chip
                size="small"
                label={statusChip.label}
                color={statusChip.color}
                variant={
                  row.parcela.status === "ABERTA" ? "filled" : "outlined"
                }
              />
            )}
          </TableCell>
          <TableCell align="right">
            <Stack
              direction="row"
              spacing={1}
              justifyContent="flex-end"
              flexWrap="wrap"
            >
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleSelecionarConta(row.conta?.id)}
              >
                Ver conta
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={row.parcela.status !== "ABERTA"}
                onClick={() => handleAbrirModal(row)}
              >
                Marcar paga
              </Button>
            </Stack>
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Contas a Pagar"
        subtitle="Fluxo reestruturado por histórico de vencidas e contas a vencer, com atualização rápida das parcelas."
      />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Filtros</Typography>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <SearchableSelect
              label="Fornecedor"
              value={fornecedorFiltroId}
              onChange={(event) => setFornecedorFiltroId(event.target.value)}
              fullWidth
            >
              <MenuItem value="">Todos os fornecedores</MenuItem>
              {fornecedores.map((fornecedor) => (
                <MenuItem key={fornecedor.id} value={fornecedor.id}>
                  {fornecedor.razao_social}
                </MenuItem>
              ))}
            </SearchableSelect>

            <TextField
              label="Busca rápida"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Fornecedor, data, origem, conta ou parcela"
              helperText="Nas contas vencidas, use a busca para refinar por nome ou data."
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              type="date"
              label="Vencimento de"
              InputLabelProps={{ shrink: true }}
              value={dataInicio}
              onChange={(event) => setDataInicio(event.target.value)}
              disabled={tabAtiva === "vencidas"}
              helperText={
                tabAtiva === "vencidas"
                  ? "Intervalo não se aplica ao histórico de vencidas."
                  : "Padrão inicia hoje para mostrar todas as contas ainda não vencidas."
              }
              fullWidth
            />
            <TextField
              type="date"
              label="Vencimento até"
              InputLabelProps={{ shrink: true }}
              value={dataFim}
              onChange={(event) => setDataFim(event.target.value)}
              disabled={tabAtiva === "vencidas"}
              helperText={
                tabAtiva === "vencidas"
                  ? "Use a busca rápida para localizar datas específicas."
                  : "Deixe em branco para manter todas as contas futuras."
              }
              fullWidth
            />
            <Button
              variant="outlined"
              onClick={resetFiltros}
              sx={{ minWidth: 160 }}
            >
              Limpar filtros
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Tabs value={tabAtiva} onChange={(_, value) => setTabAtiva(value)}>
          <Tab
            value="vencidas"
            label={`Contas vencidas (${resumoVencidas.quantidade})`}
          />
          <Tab
            value="a_vencer"
            label={`Contas a vencer (${resumoAVencer.quantidade})`}
          />
        </Tabs>
      </Paper>

      {tabAtiva === "vencidas" ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Histórico completo de parcelas vencidas. O refinamento aqui acontece
          por fornecedor e busca rápida, sem restringir por intervalo de datas.
        </Alert>
      ) : null}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          gap={1.5}
          mb={2}
        >
          <Box>
            <Typography variant="h6">
              {tabAtiva === "vencidas"
                ? "Tabela de contas vencidas"
                : "Tabela de contas à vencer"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tabAtiva === "vencidas"
                ? `${resumoVencidas.abertas} parcela(s) ainda em aberto • ${formatCurrency(
                    resumoVencidas.valorTotal,
                  )} no histórico exibido`
                : `${formatCurrency(resumoAVencer.valorTotal)} previsto no recorte atual`}
            </Typography>
          </Box>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fornecedor</TableCell>
                <TableCell>Vencimento</TableCell>
                <TableCell>Prazo</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell>Origem</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tabAtiva === "vencidas"
                ? renderRows(
                    parcelasVencidas,
                    "Nenhuma conta vencida encontrada para os filtros aplicados.",
                  )
                : renderRows(
                    parcelasAVencer,
                    "Nenhuma conta a vencer encontrada para o intervalo informado.",
                  )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Drawer
        anchor="right"
        open={Boolean(contaSelecionada)}
        onClose={() => setContaSelecionadaId("")}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 20 }}
        PaperProps={{ sx: sideDrawerPaperSx }}
      >
        {contaSelecionada ? (
          <Stack spacing={2}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6" fontWeight={700}>
                Detalhamento da conta
              </Typography>
              <IconButton onClick={() => setContaSelecionadaId("")}>
                <CloseIcon />
              </IconButton>
            </Stack>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={0.75}>
                <Typography fontWeight={700}>
                  Conta #{shortId(contaSelecionada.id)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fornecedor:{" "}
                  {fornecedorById[contaSelecionada.fornecedor_id]
                    ?.razao_social || "Sem fornecedor"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Origem: {getOrigemLabel(contaSelecionada)} • Ref:{" "}
                  {contaSelecionada.origem_id || "-"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Emissão: {formatDate(contaSelecionada.data_emissao)} • Total:{" "}
                  {formatCurrency(contaSelecionada.valor_total)}
                </Typography>
              </Stack>
            </Paper>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Parcela</TableCell>
                    <TableCell>Vencimento</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Pagamento</TableCell>
                    <TableCell align="right">Ação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parcelasContaSelecionada.length ? (
                    parcelasContaSelecionada.map((parcela) => {
                      const parcelaVencida =
                        toDateKey(parcela.vencimento) < todayKey;
                      const statusChip = getStatusChip(
                        parcela.status,
                        parcelaVencida,
                      );

                      return (
                        <TableRow key={parcela.id} hover>
                          <TableCell>#{parcela.parcela_num}</TableCell>
                          <TableCell>
                            {formatDate(parcela.vencimento)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(parcela.valor)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={statusChip.label}
                              color={statusChip.color}
                              variant={
                                parcela.status === "ABERTA"
                                  ? "filled"
                                  : "outlined"
                              }
                            />
                          </TableCell>
                          <TableCell>{renderPagamentoCell(parcela)}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="contained"
                              disabled={parcela.status !== "ABERTA"}
                              onClick={() =>
                                handleAbrirModal({
                                  parcela,
                                  conta: contaSelecionada,
                                })
                              }
                            >
                              Marcar paga
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        Nenhuma parcela vinculada a esta conta.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        ) : null}
      </Drawer>

      <Drawer
        anchor="right"
        open={confirmModal.open}
        onClose={handleFecharModal}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 20 }}
        PaperProps={{ sx: sideDrawerPaperSx }}
      >
        <Stack spacing={2}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6" fontWeight={700}>
              Confirmar pagamento da parcela
            </Typography>
            <IconButton onClick={handleFecharModal}>
              <CloseIcon />
            </IconButton>
          </Stack>

          <Paper variant="outlined" sx={{ p: 2 }}>
            {parcelaModal ? (
              <Stack spacing={0.75}>
                <Typography fontWeight={600}>
                  Conta #{shortId(contaModal?.id)} • Parcela #
                  {parcelaModal.parcela_num}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fornecedor:{" "}
                  {fornecedorById[contaModal?.fornecedor_id]?.razao_social ||
                    "Sem fornecedor"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Vencimento: {formatDate(parcelaModal.vencimento)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Valor original: {formatCurrency(valorOriginalModal)}
                </Typography>
              </Stack>
            ) : null}
          </Paper>

          <TextField
            label="Valor pago"
            type="number"
            value={confirmModal.valorPagamento}
            onChange={(event) =>
              setConfirmModal((current) => ({
                ...current,
                valorPagamento: event.target.value,
              }))
            }
            fullWidth
          />

          <SearchableSelect
            label="Forma de pagamento"
            value={confirmModal.formaPagamento}
            onChange={(event) =>
              setConfirmModal((current) => ({
                ...current,
                formaPagamento: event.target.value,
              }))
            }
            fullWidth
          >
            {formasPagamento.map((forma) => (
              <MenuItem key={forma.codigo} value={forma.codigo}>
                {forma.label}
              </MenuItem>
            ))}
          </SearchableSelect>

          {exigeAcaoDiferenca ? (
            <>
              <Alert severity="warning">
                Diferença identificada: {formatCurrency(diferencaModal)}
              </Alert>
              <SearchableSelect
                label="Como tratar a diferença"
                value={confirmModal.acaoDiferenca}
                onChange={(event) =>
                  setConfirmModal((current) => ({
                    ...current,
                    acaoDiferenca: event.target.value,
                  }))
                }
                fullWidth
              >
                <MenuItem value="ACEITAR_ENCERRAR">
                  Baixar parcela integralmente
                </MenuItem>
                <MenuItem
                  value="JOGAR_PROXIMA"
                  disabled={!temFornecedorContaModal}
                >
                  Gerar nova cobrança com a diferença
                </MenuItem>
              </SearchableSelect>
              {bloqueiaJogarProxima ? (
                <Typography variant="caption" color="error.main">
                  Só é possível gerar nova cobrança quando a conta possui
                  fornecedor.
                </Typography>
              ) : null}
            </>
          ) : null}

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="outlined" onClick={handleFecharModal}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={handleConfirmarPagamento}>
              Confirmar pagamento
            </Button>
          </Stack>
        </Stack>
      </Drawer>
    </AppLayout>
  );
};

export default ContasPagarPage;
