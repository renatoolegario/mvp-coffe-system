import {
  Alert,
  Box,
  Button,
  Checkbox,
  Drawer,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { useRouter } from "next/router";
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

const readQueryValue = (value) => {
  if (Array.isArray(value)) return value[0] || "";
  if (!value) return "";
  return String(value);
};

const monthPattern = /^\d{4}-\d{2}$/;

const toMonthValue = (value = new Date()) => {
  const dateKey = toDateKey(value);
  return dateKey ? dateKey.slice(0, 7) : "";
};

const getMonthRange = (monthValue) => {
  if (!monthPattern.test(String(monthValue || ""))) {
    return getMonthRange(toMonthValue(new Date()));
  }
  const [year, month] = monthValue.split("-").map((item) => Number(item) || 0);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: toDateKey(start),
    end: toDateKey(end),
  };
};

const shiftMonth = (monthValue, offset) => {
  const safeMonth = monthPattern.test(String(monthValue || ""))
    ? monthValue
    : toMonthValue(new Date());
  const [year, month] = safeMonth.split("-").map((item) => Number(item) || 0);
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() + offset);
  return toMonthValue(date);
};

const buildCalendarDays = (monthValue, summaryByDate) => {
  if (!monthPattern.test(String(monthValue || ""))) return [];
  const [year, month] = monthValue.split("-").map((item) => Number(item) || 0);
  const firstDay = new Date(year, month - 1, 1);
  const firstWeekDay = firstDay.getDay();
  const totalDays = new Date(year, month, 0).getDate();
  const cells = [];

  for (let index = 0; index < firstWeekDay; index += 1) {
    cells.push({ key: `empty-start-${index}`, isCurrentMonth: false });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = toDateKey(new Date(year, month - 1, day));
    const summary = summaryByDate.get(date) || { total: 0, count: 0 };
    cells.push({
      key: date,
      date,
      day,
      total: summary.total,
      count: summary.count,
      isCurrentMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `empty-end-${cells.length}`, isCurrentMonth: false });
  }

  return cells;
};

const ContasReceberPage = () => {
  const router = useRouter();
  const contas = useDataStore((state) => state.contasReceber);
  const parcelas = useDataStore((state) => state.contasReceberParcelas);
  const clientes = useDataStore((state) => state.clientes);
  const fornecedores = useDataStore((state) => state.fornecedores);
  const auxFormasPagamento = useDataStore((state) => state.auxFormasPagamento);
  const marcarParcelaRecebida = useDataStore((state) => state.marcarParcelaRecebida);

  const initialMonth = toMonthValue(new Date());
  const initialRange = getMonthRange(initialMonth);

  const [clienteFiltroId, setClienteFiltroId] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(initialMonth);
  const [dataInicio, setDataInicio] = useState(initialRange.start);
  const [dataFim, setDataFim] = useState(initialRange.end);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState("");
  const [contaSelecionadaId, setContaSelecionadaId] = useState("");
  const [selecionadas, setSelecionadas] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [formaRecebimento, setFormaRecebimento] = useState("PIX");
  const [formaRecebimentoReal, setFormaRecebimentoReal] = useState("PIX");
  const [valorRecebido, setValorRecebido] = useState("");
  const [motivoDiferenca, setMotivoDiferenca] = useState("");
  const [acaoDiferenca, setAcaoDiferenca] = useState("ACEITAR_ENCERRAR");
  const [origemRecebimento, setOrigemRecebimento] = useState("NORMAL");
  const [fornecedorDestinoId, setFornecedorDestinoId] = useState("");
  const [comprovanteUrl, setComprovanteUrl] = useState("");
  const [observacao, setObservacao] = useState("");

  const clienteFiltroFromUrl = readQueryValue(router.query.cliente_id);
  const parcelaFiltroId = readQueryValue(router.query.parcela_id);

  const parcelasAbertas = useMemo(
    () => parcelas.filter((parcela) => parcela.status === "ABERTA"),
    [parcelas],
  );

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

  const parcelasAbertasFiltradas = useMemo(
    () =>
      parcelasAbertas.filter((parcela) => {
        if (
          !parcelaFiltroId &&
          !isDateBetween(parcela.vencimento, dataInicio, dataFim)
        ) {
          return false;
        }

        if (
          selectedCalendarDate &&
          !parcelaFiltroId &&
          toDateKey(parcela.vencimento) !== selectedCalendarDate
        ) {
          return false;
        }

        const conta = contaById[parcela.conta_receber_id];
        if (clienteFiltroId && conta?.cliente_id !== clienteFiltroId) {
          return false;
        }

        if (parcelaFiltroId && parcela.id !== parcelaFiltroId) {
          return false;
        }

        return true;
      }),
    [
      parcelasAbertas,
      dataInicio,
      dataFim,
      selectedCalendarDate,
      contaById,
      clienteFiltroId,
      parcelaFiltroId,
    ],
  );

  const contasFiltradas = useMemo(
    () =>
      contas.filter((conta) => {
        if (clienteFiltroId && conta.cliente_id !== clienteFiltroId) {
          return false;
        }
        return parcelasAbertasFiltradas.some(
          (parcela) => parcela.conta_receber_id === conta.id,
        );
      }),
    [contas, clienteFiltroId, parcelasAbertasFiltradas],
  );

  useEffect(() => {
    if (!clienteFiltroFromUrl) return;
    setClienteFiltroId((prev) =>
      prev === clienteFiltroFromUrl ? prev : clienteFiltroFromUrl,
    );
  }, [clienteFiltroFromUrl]);

  useEffect(() => {
    if (!parcelaFiltroId) return;
    const parcelaAlvo = parcelasAbertas.find((parcela) => parcela.id === parcelaFiltroId);
    if (!parcelaAlvo) return;

    const contaAlvo = contaById[parcelaAlvo.conta_receber_id];
    if (contaAlvo?.cliente_id) {
      setClienteFiltroId((prev) =>
        prev === contaAlvo.cliente_id ? prev : contaAlvo.cliente_id,
      );
    }

    setContaSelecionadaId((prev) =>
      prev === parcelaAlvo.conta_receber_id ? prev : parcelaAlvo.conta_receber_id,
    );

    setSelecionadas((prev) => {
      if (prev.length === 1 && prev[0] === parcelaAlvo.id) return prev;
      return [parcelaAlvo.id];
    });
  }, [parcelaFiltroId, parcelasAbertas, contaById]);

  useEffect(() => {
    if (
      contaSelecionadaId &&
      !contasFiltradas.some((conta) => conta.id === contaSelecionadaId)
    ) {
      setContaSelecionadaId("");
      setSelecionadas([]);
    }
  }, [contaSelecionadaId, contasFiltradas]);

  const parcelasContaSelecionada = useMemo(() => {
    if (!contaSelecionadaId) return [];
    let rows = parcelas
      .filter((parcela) => parcela.conta_receber_id === contaSelecionadaId)
      .sort((a, b) => a.parcela_num - b.parcela_num);
    if (parcelaFiltroId) {
      rows = rows.filter((parcela) => parcela.id === parcelaFiltroId);
    }
    return rows;
  }, [parcelas, contaSelecionadaId, parcelaFiltroId]);

  const parcelasAbertasContaSelecionada = useMemo(
    () =>
      parcelasContaSelecionada.filter((parcela) => parcela.status === "ABERTA"),
    [parcelasContaSelecionada],
  );

  useEffect(() => {
    const validIds = new Set(parcelasAbertasContaSelecionada.map((parcela) => parcela.id));
    setSelecionadas((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [parcelasAbertasContaSelecionada]);

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

  const totalSelecionado = useMemo(
    () =>
      selecionadas.reduce((acc, id) => {
        const parcela = parcelasAbertasContaSelecionada.find((item) => item.id === id);
        return acc + toNumber(parcela?.valor_programado || parcela?.valor);
      }, 0),
    [selecionadas, parcelasAbertasContaSelecionada],
  );

  const parcelasResumoCalendario = useMemo(
    () =>
      parcelasAbertas.filter((parcela) => {
        const conta = contaById[parcela.conta_receber_id];
        if (clienteFiltroId && conta?.cliente_id !== clienteFiltroId) {
          return false;
        }
        if (parcelaFiltroId && parcela.id !== parcelaFiltroId) {
          return false;
        }
        return true;
      }),
    [parcelasAbertas, contaById, clienteFiltroId, parcelaFiltroId],
  );

  const resumoCalendarioPorDia = useMemo(() => {
    const summary = new Map();
    parcelasResumoCalendario.forEach((parcela) => {
      const date = toDateKey(parcela.vencimento);
      if (!date) return;
      const current = summary.get(date) || { total: 0, count: 0 };
      summary.set(date, {
        total: current.total + toNumber(parcela.valor_programado || parcela.valor),
        count: current.count + 1,
      });
    });
    return summary;
  }, [parcelasResumoCalendario]);

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth, resumoCalendarioPorDia),
    [calendarMonth, resumoCalendarioPorDia],
  );

  const applyMonth = (nextMonth) => {
    if (!monthPattern.test(String(nextMonth || ""))) return;
    setCalendarMonth(nextMonth);
    const range = getMonthRange(nextMonth);
    setDataInicio(range.start);
    setDataFim(range.end);
    setSelectedCalendarDate("");
  };

  const toggleSelecionada = (id) => {
    setSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleToggleConta = (contaId) => {
    setContaSelecionadaId((prev) => (prev === contaId ? "" : contaId));
    setSelecionadas([]);
  };

  const abrirConfirmacao = () => {
    if (!selecionadas.length) return;
    setDrawerOpen(true);
  };

  const confirmarRecebimento = async () => {
    if (!selecionadas.length) return;

    const valorRecebidoNormalizado =
      valorRecebido === "" ? null : Math.max(0, toNumber(valorRecebido));

    const parcelaReferencia = parcelasAbertasContaSelecionada.find(
      (parcela) => parcela.id === selecionadas[0],
    );
    const valorProgramadoRef = toNumber(
      parcelaReferencia?.valor_programado || parcelaReferencia?.valor,
    );
    const valorComparacao =
      valorRecebidoNormalizado === null ? valorProgramadoRef : valorRecebidoNormalizado;

    if (valorComparacao < valorProgramadoRef && !motivoDiferenca.trim()) {
      return;
    }

    await marcarParcelaRecebida({
      ids: selecionadas,
      forma_recebimento: formaRecebimento,
      forma_recebimento_real: formaRecebimentoReal,
      valor_recebido: valorRecebidoNormalizado,
      motivo_diferenca: motivoDiferenca,
      acao_diferenca: acaoDiferenca,
      origem_recebimento: origemRecebimento,
      fornecedor_destino_id:
        origemRecebimento === "DIRETO_FORNECEDOR" ? fornecedorDestinoId : null,
      comprovante_url: comprovanteUrl || null,
      observacao_recebimento: observacao,
    });

    setSelecionadas([]);
    setDrawerOpen(false);
    setFormaRecebimento("PIX");
    setFormaRecebimentoReal("PIX");
    setValorRecebido("");
    setMotivoDiferenca("");
    setAcaoDiferenca("ACEITAR_ENCERRAR");
    setOrigemRecebimento("NORMAL");
    setFornecedorDestinoId("");
    setComprovanteUrl("");
    setObservacao("");
  };

  const filtrosViaUrlAtivos = Boolean(clienteFiltroFromUrl || parcelaFiltroId);

  const limparFiltrosViaUrl = () => {
    router.replace({ pathname: router.pathname, query: {} }, undefined, {
      shallow: true,
    });
    if (clienteFiltroFromUrl) {
      setClienteFiltroId("");
    }
    if (parcelaFiltroId) {
      setContaSelecionadaId("");
      setSelecionadas([]);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Contas a Receber"
        subtitle="Filtre por cliente, selecione uma fatura e confirme as parcelas em aberto."
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
        <Stack spacing={2}>
          <Typography variant="h6">Filtros</Typography>
          <TextField
            select
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
          </TextField>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 220 }}>
              <IconButton
                size="small"
                onClick={() => applyMonth(shiftMonth(calendarMonth, -1))}
              >
                <ChevronLeftRoundedIcon />
              </IconButton>
              <TextField
                type="month"
                label="Mês"
                InputLabelProps={{ shrink: true }}
                value={calendarMonth}
                onChange={(event) => applyMonth(event.target.value)}
                fullWidth
              />
              <IconButton
                size="small"
                onClick={() => applyMonth(shiftMonth(calendarMonth, 1))}
              >
                <ChevronRightRoundedIcon />
              </IconButton>
            </Stack>
            <TextField
              type="date"
              label="Vencimento de"
              InputLabelProps={{ shrink: true }}
              value={dataInicio}
              onChange={(event) => {
                const nextStart = event.target.value;
                setDataInicio(nextStart);
                if (nextStart) {
                  setCalendarMonth(nextStart.slice(0, 7));
                }
                setSelectedCalendarDate("");
              }}
              fullWidth
            />
            <TextField
              type="date"
              label="Vencimento até"
              InputLabelProps={{ shrink: true }}
              value={dataFim}
              onChange={(event) => {
                setDataFim(event.target.value);
                setSelectedCalendarDate("");
              }}
              fullWidth
            />
          </Stack>

          <Typography variant="subtitle2" color="text.secondary">
            Calendário mensal de vencimentos
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 1,
            }}
          >
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((weekDay) => (
              <Typography
                key={weekDay}
                variant="caption"
                color="text.secondary"
                textAlign="center"
              >
                {weekDay}
              </Typography>
            ))}

            {calendarDays.map((day) => {
              if (!day.isCurrentMonth) {
                return <Box key={day.key} sx={{ minHeight: 84 }} />;
              }

              const inRange = isDateBetween(day.date, dataInicio, dataFim);
              const isSelected = day.date === selectedCalendarDate;

              return (
                <Paper
                  key={day.key}
                  onClick={() =>
                    setSelectedCalendarDate((current) =>
                      current === day.date ? "" : day.date,
                    )
                  }
                  sx={{
                    p: 1,
                    cursor: "pointer",
                    minHeight: 84,
                    border: isSelected ? "2px solid" : "1px solid",
                    borderColor: isSelected
                      ? "primary.main"
                      : inRange
                        ? "success.light"
                        : "divider",
                  }}
                >
                  <Typography variant="body2" fontWeight={700}>
                    {day.day}
                  </Typography>
                  <Typography variant="caption" sx={{ display: "block" }}>
                    {formatCurrency(day.total)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {day.count} parcela(s)
                  </Typography>
                </Paper>
              );
            })}
          </Box>
          {selectedCalendarDate ? (
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Dia selecionado: {formatDate(selectedCalendarDate)}
              </Typography>
              <Button size="small" onClick={() => setSelectedCalendarDate("")}>
                Limpar dia
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Faturas em aberto
            </Typography>
            <Stack spacing={2}>
              {contasFiltradas.map((conta) => {
                const clienteNome =
                  clientes.find((item) => item.id === conta.cliente_id)?.nome || "-";
                const parcelasAbertasConta = parcelasAbertasFiltradas.filter(
                  (parcela) => parcela.conta_receber_id === conta.id,
                ).length;

                return (
                  <Paper key={conta.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Checkbox
                        checked={contaSelecionadaId === conta.id}
                        onChange={() => handleToggleConta(conta.id)}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography fontWeight={600}>Fatura #{conta.id.slice(0, 8)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Cliente: {clienteNome}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Valor: {formatCurrency(conta.valor_total)} • Emissão:{" "}
                          {formatDate(conta.data_emissao)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Parcelas em aberto no filtro: {parcelasAbertasConta}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                );
              })}

              {!contasFiltradas.length ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma fatura encontrada com parcela em aberto para o filtro aplicado.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Parcelas da fatura selecionada</Typography>
              <Button
                variant="contained"
                disabled={!selecionadas.length}
                onClick={abrirConfirmacao}
              >
                Confirmar recebimento ({selecionadas.length})
              </Button>
            </Stack>

            <Stack spacing={1.5}>
              {!contaSelecionadaId ? (
                <Typography variant="body2" color="text.secondary">
                  Selecione uma fatura para listar as parcelas.
                </Typography>
              ) : null}

              {parcelasContaSelecionada.map((parcela) => (
                <Paper key={parcela.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Checkbox
                      disabled={parcela.status !== "ABERTA"}
                      checked={selecionadas.includes(parcela.id)}
                      onChange={() => toggleSelecionada(parcela.id)}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={600}>
                        Parcela #{parcela.parcela_num}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vencimento: {formatDate(parcela.vencimento)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Programado: {formatCurrency(parcela.valor_programado || parcela.valor)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Status: {parcela.status}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              ))}

              {contaSelecionadaId && !parcelasContaSelecionada.length ? (
                <Typography variant="body2" color="text.secondary">
                  Não há parcelas para esta fatura.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

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
          <Typography variant="body2" color="text.secondary">
            Parcelas selecionadas: {selecionadas.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Valor programado total: {formatCurrency(totalSelecionado)}
          </Typography>

          <TextField
            select
            label="Forma programada/recebida"
            value={formaRecebimento}
            onChange={(event) => setFormaRecebimento(event.target.value)}
          >
            {formasPagamento.map((forma) => (
              <MenuItem key={forma.codigo} value={forma.codigo}>
                {forma.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Forma real recebida"
            value={formaRecebimentoReal}
            onChange={(event) => setFormaRecebimentoReal(event.target.value)}
          >
            {formasPagamento.map((forma) => (
              <MenuItem key={forma.codigo} value={forma.codigo}>
                {forma.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Valor recebido (deixe vazio para valor integral)"
            type="number"
            value={valorRecebido}
            onChange={(event) => setValorRecebido(event.target.value)}
          />

          <TextField
            select
            label="Origem do recebimento"
            value={origemRecebimento}
            onChange={(event) => setOrigemRecebimento(event.target.value)}
          >
            <MenuItem value="NORMAL">Pagamento direto do cliente</MenuItem>
            <MenuItem value="DIRETO_FORNECEDOR">Cliente pagou direto ao fornecedor</MenuItem>
          </TextField>

          {origemRecebimento === "DIRETO_FORNECEDOR" ? (
            <TextField
              select
              label="Fornecedor que recebeu"
              value={fornecedorDestinoId}
              onChange={(event) => setFornecedorDestinoId(event.target.value)}
            >
              {fornecedores.map((fornecedor) => (
                <MenuItem key={fornecedor.id} value={fornecedor.id}>
                  {fornecedor.razao_social}
                </MenuItem>
              ))}
            </TextField>
          ) : null}

          <TextField
            label="Comprovante (URL no blob storage)"
            value={comprovanteUrl}
            onChange={(event) => setComprovanteUrl(event.target.value)}
          />

          <TextField
            label="Motivo da diferença (obrigatório se receber menor)"
            value={motivoDiferenca}
            onChange={(event) => setMotivoDiferenca(event.target.value)}
            multiline
            rows={2}
          />

          <TextField
            select
            label="Ação para diferença"
            value={acaoDiferenca}
            onChange={(event) => setAcaoDiferenca(event.target.value)}
          >
            <MenuItem value="JOGAR_PROXIMA">Jogar diferença para próxima cobrança</MenuItem>
            <MenuItem value="ACEITAR_ENCERRAR">Aceitar diferença e encerrar cobrança</MenuItem>
          </TextField>

          <FormControlLabel
            control={<Checkbox checked={Boolean(observacao)} onChange={(e) => setObservacao(e.target.checked ? "Recebimento confirmado" : "")} />}
            label="Adicionar observação padrão"
          />
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
            <Button variant="contained" onClick={confirmarRecebimento}>
              Confirmar
            </Button>
          </Stack>
        </Stack>
      </Drawer>
    </AppLayout>
  );
};

export default ContasReceberPage;
