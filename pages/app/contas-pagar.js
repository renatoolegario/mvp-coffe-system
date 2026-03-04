import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";

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

const isDateBetween = (value, start, end) => {
  const current = toDateKey(value);
  if (!current) return false;
  if (start && current < start) return false;
  if (end && current > end) return false;
  return true;
};

const ContasPagarPage = () => {
  const contas = useDataStore((state) => state.contasPagar);
  const parcelas = useDataStore((state) => state.contasPagarParcelas);
  const fornecedores = useDataStore((state) => state.fornecedores);
  const auxFormasPagamento = useDataStore((state) => state.auxFormasPagamento);
  const marcarParcelaPaga = useDataStore((state) => state.marcarParcelaPaga);

  const [fornecedorFiltroId, setFornecedorFiltroId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [contaSelecionadaId, setContaSelecionadaId] = useState("");
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    parcelaId: "",
    valorOriginal: 0,
    valorPagamento: "",
    formaPagamento: "TRANSFERENCIA",
    acaoDiferenca: "",
  });

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

  const parcelasAbertas = useMemo(
    () => parcelas.filter((parcela) => parcela.status === "ABERTA"),
    [parcelas],
  );

  const parcelasAbertasFiltradas = useMemo(
    () =>
      parcelasAbertas.filter((parcela) =>
        isDateBetween(parcela.vencimento, dataInicio, dataFim),
      ),
    [parcelasAbertas, dataInicio, dataFim],
  );

  const contasFiltradas = useMemo(
    () =>
      contas.filter((conta) => {
        if (fornecedorFiltroId && conta.fornecedor_id !== fornecedorFiltroId) {
          return false;
        }
        return parcelasAbertasFiltradas.some(
          (parcela) => parcela.conta_pagar_id === conta.id,
        );
      }),
    [contas, fornecedorFiltroId, parcelasAbertasFiltradas],
  );

  useEffect(() => {
    if (
      contaSelecionadaId &&
      !contasFiltradas.some((conta) => conta.id === contaSelecionadaId)
    ) {
      setContaSelecionadaId("");
    }
  }, [contaSelecionadaId, contasFiltradas]);

  const parcelasContaSelecionada = useMemo(() => {
    if (!contaSelecionadaId) return [];
    return parcelas
      .filter((parcela) => parcela.conta_pagar_id === contaSelecionadaId)
      .sort((a, b) => a.parcela_num - b.parcela_num);
  }, [parcelas, contaSelecionadaId]);

  const parcelaModal = useMemo(
    () => parcelas.find((parcela) => parcela.id === confirmModal.parcelaId) || null,
    [parcelas, confirmModal.parcelaId],
  );

  const contaModal = useMemo(
    () =>
      contaSelecionadaId
        ? contas.find((conta) => conta.id === contaSelecionadaId) || null
        : null,
    [contaSelecionadaId, contas],
  );

  const valorOriginalModal = toNumber(confirmModal.valorOriginal);
  const valorPagamentoModal = Math.max(0, toNumber(confirmModal.valorPagamento));
  const diferencaModal = Number((valorOriginalModal - valorPagamentoModal).toFixed(2));
  const exigeAcaoDiferenca = diferencaModal > 0;
  const temFornecedorContaModal = Boolean(contaModal?.fornecedor_id);
  const bloqueiaJogarProxima =
    exigeAcaoDiferenca &&
    confirmModal.acaoDiferenca === "JOGAR_PROXIMA" &&
    !temFornecedorContaModal;

  const handleToggleConta = (contaId) => {
    setContaSelecionadaId((prev) => (prev === contaId ? "" : contaId));
  };

  const handleAbrirModal = (parcela) => {
    const formaPadrao = formasPagamento[0]?.codigo || "TRANSFERENCIA";
    const valorOriginal = toNumber(parcela.valor);
    setConfirmModal({
      open: true,
      parcelaId: parcela.id,
      valorOriginal,
      valorPagamento: String(valorOriginal.toFixed(2)),
      formaPagamento: formaPadrao,
      acaoDiferenca: "",
    });
  };

  const handleFecharModal = () => {
    setConfirmModal({
      open: false,
      parcelaId: "",
      valorOriginal: 0,
      valorPagamento: "",
      formaPagamento: formasPagamento[0]?.codigo || "TRANSFERENCIA",
      acaoDiferenca: "",
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

  return (
    <AppLayout>
      <PageHeader
        title="Contas a Pagar"
        subtitle="Filtre por fornecedor, selecione uma conta e confirme pagamentos das parcelas."
      />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Filtros</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select
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
            </TextField>
            <TextField
              type="date"
              label="Vencimento de"
              InputLabelProps={{ shrink: true }}
              value={dataInicio}
              onChange={(event) => setDataInicio(event.target.value)}
              fullWidth
            />
            <TextField
              type="date"
              label="Vencimento até"
              InputLabelProps={{ shrink: true }}
              value={dataFim}
              onChange={(event) => setDataFim(event.target.value)}
              fullWidth
            />
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Contas com parcela em aberto
            </Typography>
            <Stack spacing={2}>
              {contasFiltradas.map((conta) => {
                const fornecedor =
                  fornecedores.find((item) => item.id === conta.fornecedor_id)
                    ?.razao_social || "-";
                const abertasConta = parcelasAbertasFiltradas.filter(
                  (parcela) => parcela.conta_pagar_id === conta.id,
                ).length;
                const origemDescricao =
                  conta.origem_tipo === "diferenca_pagamento_conta_pagar"
                    ? `Diferença de pagamento da parcela #${String(
                      conta.origem_id || "",
                    ).slice(0, 8)}`
                    : conta.origem_tipo || "-";

                return (
                  <Paper key={conta.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Checkbox
                        checked={contaSelecionadaId === conta.id}
                        onChange={() => handleToggleConta(conta.id)}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography fontWeight={600}>Conta #{conta.id.slice(0, 6)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Fornecedor: {fornecedor}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Valor: {formatCurrency(conta.valor_total)} • Emissão:{" "}
                          {formatDate(conta.data_emissao)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Parcelas em aberto no filtro: {abertasConta}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Origem: {origemDescricao}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                );
              })}
              {!contasFiltradas.length ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma conta encontrada com parcelas em aberto para o filtro aplicado.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Parcelas da conta selecionada
            </Typography>
            <Stack spacing={2}>
              {!contaSelecionadaId ? (
                <Typography variant="body2" color="text.secondary">
                  Selecione uma conta para listar as parcelas.
                </Typography>
              ) : null}

              {parcelasContaSelecionada.map((parcela) => (
                <Paper key={parcela.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Typography fontWeight={600}>Parcela #{parcela.parcela_num}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vencimento: {formatDate(parcela.vencimento)} • {formatCurrency(parcela.valor)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Status: {parcela.status}
                    </Typography>
                    {parcela.status === "ABERTA" ? (
                      <Button variant="contained" onClick={() => handleAbrirModal(parcela)}>
                        Confirmar pagamento
                      </Button>
                    ) : null}
                  </Stack>
                </Paper>
              ))}

              {contaSelecionadaId && !parcelasContaSelecionada.length ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma parcela encontrada para esta conta.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={confirmModal.open} onClose={handleFecharModal} fullWidth maxWidth="sm">
        <DialogTitle>Confirmar pagamento da parcela</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2" color="text.secondary">
              Parcela: #{parcelaModal?.parcela_num || "-"} • Vencimento:{" "}
              {formatDate(parcelaModal?.vencimento)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Valor original: {formatCurrency(valorOriginalModal)}
            </Typography>

            <TextField
              label="Valor do pagamento"
              type="number"
              value={confirmModal.valorPagamento}
              onChange={(event) =>
                setConfirmModal((prev) => ({
                  ...prev,
                  valorPagamento: event.target.value,
                }))
              }
              inputProps={{ min: 0, step: "0.01" }}
            />

            <TextField
              select
              label="Forma de pagamento"
              value={confirmModal.formaPagamento}
              onChange={(event) =>
                setConfirmModal((prev) => ({
                  ...prev,
                  formaPagamento: event.target.value,
                }))
              }
            >
              {formasPagamento.map((forma) => (
                <MenuItem key={forma.codigo} value={forma.codigo}>
                  {forma.label}
                </MenuItem>
              ))}
            </TextField>

            {exigeAcaoDiferenca ? (
              <>
                <Alert severity="warning">
                  Diferença de {formatCurrency(diferencaModal)} detectada para menos.
                </Alert>
                <TextField
                  select
                  label="Ação para diferença"
                  value={confirmModal.acaoDiferenca}
                  onChange={(event) =>
                    setConfirmModal((prev) => ({
                      ...prev,
                      acaoDiferenca: event.target.value,
                    }))
                  }
                >
                  <MenuItem value="">Selecione uma ação</MenuItem>
                  <MenuItem value="ACEITAR_ENCERRAR">
                    Finalizar assim mesmo com baixa completa
                  </MenuItem>
                  <MenuItem value="JOGAR_PROXIMA">
                    Jogar diferença para próxima cobrança (+7 dias)
                  </MenuItem>
                </TextField>

                {confirmModal.acaoDiferenca === "JOGAR_PROXIMA" ? (
                  <Typography variant="body2" color="text.secondary">
                    Será criada uma nova cobrança para o fornecedor em 7 dias, no valor de{" "}
                    {formatCurrency(diferencaModal)}.
                  </Typography>
                ) : null}

                {bloqueiaJogarProxima ? (
                  <Alert severity="error">
                    Esta conta não possui fornecedor vinculado. Para jogar a diferença para a
                    próxima cobrança, selecione uma conta vinculada a fornecedor.
                  </Alert>
                ) : null}
              </>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFecharModal}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleConfirmarPagamento}
            disabled={bloqueiaJogarProxima || (exigeAcaoDiferenca && !confirmModal.acaoDiferenca)}
          >
            Confirmar pagamento
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
};

export default ContasPagarPage;
