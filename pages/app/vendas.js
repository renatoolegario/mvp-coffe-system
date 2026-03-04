import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency } from "../../utils/format";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const monthPattern = /^\d{4}-\d{2}$/;

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayDate = () => toIsoDate(new Date());
const toMonthValue = (date) => toIsoDate(date).slice(0, 7);

const normalizeDateValue = (value) => {
  if (!value) return "";

  const raw = String(value).trim();
  if (isoDatePattern.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return toIsoDate(parsed);
};

const formatDateLabel = (value) => {
  const normalized = normalizeDateValue(value);
  if (!normalized) return "-";
  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
};

const formatQuantity = (value) => {
  const parsed = Number(value) || 0;
  return parsed.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const getMonthRange = (monthValue) => {
  if (!monthPattern.test(String(monthValue || ""))) {
    return getMonthRange(toMonthValue(new Date()));
  }

  const [year, month] = monthValue.split("-").map((part) => Number(part));
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);

  return {
    start: toIsoDate(first),
    end: toIsoDate(last),
  };
};

const shiftMonth = (monthValue, offset) => {
  const safeMonth = monthPattern.test(String(monthValue || ""))
    ? monthValue
    : toMonthValue(new Date());
  const [year, month] = safeMonth.split("-").map((part) => Number(part));
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() + offset);
  return toMonthValue(date);
};

const isDateWithinRange = (dateValue, start, end) => {
  if (!dateValue) return false;
  if (start && dateValue < start) return false;
  if (end && dateValue > end) return false;
  return true;
};

const csvEscape = (value) =>
  `"${String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/"/g, '""')}"`;

const buildCalendarDays = (monthValue, salesByDate) => {
  if (!monthPattern.test(String(monthValue || ""))) return [];

  const [year, month] = monthValue.split("-").map((part) => Number(part));
  const firstDay = new Date(year, month - 1, 1);
  const firstWeekDay = firstDay.getDay();
  const totalDays = new Date(year, month, 0).getDate();
  const cells = [];

  for (let index = 0; index < firstWeekDay; index += 1) {
    cells.push({ key: `empty-start-${index}`, isCurrentMonth: false });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = toIsoDate(new Date(year, month - 1, day));
    const summary = salesByDate.get(date) || { total: 0, count: 0 };
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

const createDespesa = () => ({
  id: crypto.randomUUID(),
  fornecedor_id: "",
  descricao: "",
  valor: "",
  data: todayDate(),
  status_pagamento: "A_PRAZO",
  forma_pagamento: "TRANSFERENCIA",
});

const VendasPage = () => {
  const vendas = useDataStore((state) => state.vendas);
  const vendaItens = useDataStore((state) => state.vendaItens);
  const clientes = useDataStore((state) => state.clientes);
  const insumos = useDataStore((state) => state.insumos);
  const contasReceber = useDataStore((state) => state.contasReceber);
  const contasReceberParcelas = useDataStore((state) => state.contasReceberParcelas);
  const fornecedores = useDataStore((state) => state.fornecedores);
  const confirmarEntregaVenda = useDataStore((state) => state.confirmarEntregaVenda);

  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [dataEntrega, setDataEntrega] = useState(todayDate());
  const [despesas, setDespesas] = useState([]);
  const [alertModalOpen, setAlertModalOpen] = useState(false);

  const initialMonth = toMonthValue(new Date());
  const initialRange = getMonthRange(initialMonth);
  const [calendarMonth, setCalendarMonth] = useState(initialMonth);
  const [intervalStart, setIntervalStart] = useState(initialRange.start);
  const [intervalEnd, setIntervalEnd] = useState(initialRange.end);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState("");

  const clientesById = useMemo(
    () => new Map(clientes.map((cliente) => [cliente.id, cliente])),
    [clientes],
  );

  const insumosById = useMemo(
    () => new Map(insumos.map((insumo) => [insumo.id, insumo])),
    [insumos],
  );

  const vendaItensByVendaId = useMemo(() => {
    const map = new Map();
    vendaItens.forEach((item) => {
      if (!item.venda_id) return;
      if (!map.has(item.venda_id)) {
        map.set(item.venda_id, []);
      }
      map.get(item.venda_id).push(item);
    });
    return map;
  }, [vendaItens]);

  const contasReceberByVendaId = useMemo(() => {
    const map = new Map();
    contasReceber.forEach((conta) => {
      if (conta.origem_tipo !== "venda" || !conta.origem_id) return;
      if (!map.has(conta.origem_id)) {
        map.set(conta.origem_id, []);
      }
      map.get(conta.origem_id).push(conta);
    });
    return map;
  }, [contasReceber]);

  const parcelasByVendaId = useMemo(() => {
    const parcelasByContaId = new Map();
    contasReceberParcelas.forEach((parcela) => {
      if (!parcela.conta_receber_id) return;
      if (!parcelasByContaId.has(parcela.conta_receber_id)) {
        parcelasByContaId.set(parcela.conta_receber_id, []);
      }
      parcelasByContaId.get(parcela.conta_receber_id).push(parcela);
    });

    const map = new Map();
    contasReceberByVendaId.forEach((contas, vendaId) => {
      const parcelas = contas
        .flatMap((conta) => parcelasByContaId.get(conta.id) || [])
        .sort((a, b) => {
          const parcelaA = Number(a.parcela_num) || 0;
          const parcelaB = Number(b.parcela_num) || 0;
          if (parcelaA !== parcelaB) return parcelaA - parcelaB;
          return normalizeDateValue(a.vencimento).localeCompare(
            normalizeDateValue(b.vencimento),
          );
        });
      map.set(vendaId, parcelas);
    });

    return map;
  }, [contasReceberByVendaId, contasReceberParcelas]);

  const produtosByVendaId = useMemo(() => {
    const map = new Map();
    vendaItensByVendaId.forEach((itens, vendaId) => {
      const produtos = itens
        .map((item) => {
          const nome = insumosById.get(item.insumo_id)?.nome || "Produto";
          const quantidade = Number(item.quantidade_informada ?? item.quantidade_kg) || 0;
          const unidade = Number(item.kg_por_saco) > 0 ? "saco" : "kg";
          return `${nome} (${formatQuantity(quantidade)} ${unidade})`;
        })
        .join(" | ");
      map.set(vendaId, produtos || "-");
    });
    return map;
  }, [insumosById, vendaItensByVendaId]);

  const normalizedInterval = useMemo(() => {
    if (!intervalStart && !intervalEnd) {
      return { start: "", end: "" };
    }
    if (!intervalStart) {
      return { start: intervalEnd, end: intervalEnd };
    }
    if (!intervalEnd) {
      return { start: intervalStart, end: intervalStart };
    }
    if (intervalStart <= intervalEnd) {
      return { start: intervalStart, end: intervalEnd };
    }
    return { start: intervalEnd, end: intervalStart };
  }, [intervalStart, intervalEnd]);

  const salesByDate = useMemo(() => {
    const map = new Map();
    vendas.forEach((venda) => {
      const saleDate = normalizeDateValue(venda.data_venda);
      if (!saleDate) return;

      const current = map.get(saleDate) || { total: 0, count: 0 };
      map.set(saleDate, {
        total: current.total + (Number(venda.valor_total) || 0),
        count: current.count + 1,
      });
    });
    return map;
  }, [vendas]);

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth, salesByDate),
    [calendarMonth, salesByDate],
  );

  const overdueSales = useMemo(() => {
    const today = todayDate();
    return vendas
      .filter((venda) => (venda.status_entrega || "PENDENTE") !== "ENTREGUE")
      .filter((venda) => {
        const date = normalizeDateValue(venda.data_programada_entrega);
        return Boolean(date && date < today);
      })
      .sort((a, b) =>
        normalizeDateValue(a.data_programada_entrega).localeCompare(
          normalizeDateValue(b.data_programada_entrega),
        ),
      );
  }, [vendas]);

  const overdueIds = useMemo(
    () => new Set(overdueSales.map((venda) => venda.id)),
    [overdueSales],
  );

  const salesHistory = useMemo(
    () =>
      vendas
        .filter((venda) => {
          const saleDate = normalizeDateValue(venda.data_venda);
          if (!isDateWithinRange(saleDate, normalizedInterval.start, normalizedInterval.end)) {
            return false;
          }
          if (selectedCalendarDate && saleDate !== selectedCalendarDate) {
            return false;
          }
          return !overdueIds.has(venda.id);
        })
        .sort((a, b) =>
          normalizeDateValue(b.data_venda).localeCompare(normalizeDateValue(a.data_venda)),
        ),
    [
      vendas,
      normalizedInterval.start,
      normalizedInterval.end,
      selectedCalendarDate,
      overdueIds,
    ],
  );

  const exportSales = useMemo(() => {
    const selectedById = new Map();

    vendas.forEach((venda) => {
      const saleDate = normalizeDateValue(venda.data_venda);
      const inRange = isDateWithinRange(
        saleDate,
        normalizedInterval.start,
        normalizedInterval.end,
      );
      if (inRange || overdueIds.has(venda.id)) {
        selectedById.set(venda.id, venda);
      }
    });

    return Array.from(selectedById.values()).sort((a, b) =>
      normalizeDateValue(b.data_venda).localeCompare(normalizeDateValue(a.data_venda)),
    );
  }, [vendas, normalizedInterval.start, normalizedInterval.end, overdueIds]);

  const handleDownloadSales = () => {
    if (typeof window === "undefined" || !exportSales.length) return;

    const today = todayDate();
    const headers = [
      "venda_id",
      "cliente",
      "data_venda",
      "data_programada_entrega",
      "data_entrega",
      "status_entrega",
      "entrega_atrasada",
      "valor_venda",
      "produtos",
      "tipo_pagamento",
      "forma_pagamento_venda",
      "parcela_num",
      "status_parcela",
      "data_vencimento",
      "data_pagamento",
      "valor_programado_parcela",
      "valor_recebido_parcela",
      "forma_recebimento_real",
      "observacoes_venda",
      "observacao_pagamento",
    ];

    const rows = [];

    exportSales.forEach((venda) => {
      const parcelas = parcelasByVendaId.get(venda.id) || [];
      const clientName = clientesById.get(venda.cliente_id)?.nome || "-";
      const scheduledDate = normalizeDateValue(venda.data_programada_entrega);
      const deliveredDate = normalizeDateValue(venda.data_entrega);
      const saleDate = normalizeDateValue(venda.data_venda);
      const isOverdue =
        (venda.status_entrega || "PENDENTE") !== "ENTREGUE" &&
        Boolean(scheduledDate && scheduledDate < today);

      const base = {
        venda_id: venda.id,
        cliente: clientName,
        data_venda: saleDate,
        data_programada_entrega: scheduledDate,
        data_entrega: deliveredDate,
        status_entrega: venda.status_entrega || "PENDENTE",
        entrega_atrasada: isOverdue ? "SIM" : "NAO",
        valor_venda: Number(venda.valor_total || 0).toFixed(2),
        produtos: produtosByVendaId.get(venda.id) || "-",
        tipo_pagamento: venda.tipo_pagamento || "-",
        forma_pagamento_venda: venda.forma_pagamento || "-",
        observacoes_venda: venda.obs || "-",
      };

      if (!parcelas.length) {
        rows.push({
          ...base,
          parcela_num: "",
          status_parcela: "",
          data_vencimento: "",
          data_pagamento: "",
          valor_programado_parcela: "",
          valor_recebido_parcela: "",
          forma_recebimento_real: "",
          observacao_pagamento: "",
        });
        return;
      }

      parcelas.forEach((parcela) => {
        rows.push({
          ...base,
          parcela_num: parcela.parcela_num ?? "",
          status_parcela: parcela.status || "",
          data_vencimento: normalizeDateValue(parcela.vencimento),
          data_pagamento: normalizeDateValue(parcela.data_recebimento),
          valor_programado_parcela: Number(
            parcela.valor_programado ?? parcela.valor ?? 0,
          ).toFixed(2),
          valor_recebido_parcela:
            parcela.valor_recebido === null || parcela.valor_recebido === undefined
              ? ""
              : Number(parcela.valor_recebido).toFixed(2),
          forma_recebimento_real:
            parcela.forma_recebimento_real || parcela.forma_recebimento || "",
          observacao_pagamento: parcela.observacao_recebimento || "",
        });
      });
    });

    const csv = [
      headers.join(";"),
      ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(";")),
    ].join("\n");

    const fileName = `vendas_${normalizedInterval.start || "inicio"}_a_${normalizedInterval.end || "fim"}.csv`;
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const applyMonth = (nextMonth) => {
    if (!monthPattern.test(String(nextMonth || ""))) return;
    setCalendarMonth(nextMonth);
    const range = getMonthRange(nextMonth);
    setIntervalStart(range.start);
    setIntervalEnd(range.end);
    setSelectedCalendarDate("");
  };

  const abrirFinalizacao = (venda) => {
    setAlertModalOpen(false);
    setVendaSelecionada(venda);
    setDataEntrega(venda.data_programada_entrega || todayDate());
    setDespesas([]);
  };

  const handleDespesaChange = (id, field, value) => {
    setDespesas((prev) =>
      prev.map((despesa) =>
        despesa.id === id ? { ...despesa, [field]: value } : despesa,
      ),
    );
  };

  const finalizarEntrega = async () => {
    if (!vendaSelecionada || !dataEntrega) return;

    const custosValidos = despesas
      .map((despesa) => ({
        ...despesa,
        valor: Number(despesa.valor) || 0,
      }))
      .filter(
        (despesa) =>
          despesa.fornecedor_id &&
          despesa.valor > 0 &&
          despesa.descricao,
      );

    await confirmarEntregaVenda({
      venda_id: vendaSelecionada.id,
      data_entrega: dataEntrega,
      custos_extras: custosValidos,
    });

    setVendaSelecionada(null);
    setDataEntrega(todayDate());
    setDespesas([]);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Vendas"
        subtitle="Calendário mensal com histórico de vendas e alerta fixo de entregas atrasadas."
        action={(
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadSales}
            disabled={!exportSales.length}
          >
            Download de vendas
          </Button>
        )}
      />

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Calendário mensal</Typography>
              <Stack direction="row" spacing={0.5}>
                <IconButton
                  size="small"
                  onClick={() => applyMonth(shiftMonth(calendarMonth, -1))}
                >
                  <ChevronLeftRoundedIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => applyMonth(shiftMonth(calendarMonth, 1))}
                >
                  <ChevronRightRoundedIcon />
                </IconButton>
              </Stack>
            </Stack>

            <Grid container spacing={1.5} mb={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Mês"
                  type="month"
                  value={calendarMonth}
                  onChange={(event) => applyMonth(event.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Início"
                  type="date"
                  value={intervalStart}
                  onChange={(event) => {
                    const nextStart = event.target.value;
                    setIntervalStart(nextStart);
                    if (nextStart) setCalendarMonth(nextStart.slice(0, 7));
                    setSelectedCalendarDate("");
                  }}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Fim"
                  type="date"
                  value={intervalEnd}
                  onChange={(event) => {
                    setIntervalEnd(event.target.value);
                    setSelectedCalendarDate("");
                  }}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

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
                  return <Box key={day.key} sx={{ minHeight: 94 }} />;
                }

                const inInterval = isDateWithinRange(
                  day.date,
                  normalizedInterval.start,
                  normalizedInterval.end,
                );
                const isToday = day.date === todayDate();
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
                      border: isSelected ? "2px solid" : "1px solid",
                      borderColor: isSelected
                        ? "primary.main"
                        : isToday
                          ? "secondary.main"
                          : inInterval
                            ? "success.light"
                            : "divider",
                      bgcolor: inInterval ? "success.50" : "background.paper",
                      minHeight: 94,
                    }}
                  >
                    <Typography variant="body2" fontWeight={700}>
                      {day.day}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ display: "block", fontWeight: 600, mt: 0.5 }}
                    >
                      {formatCurrency(day.total)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      {day.count} venda(s)
                    </Typography>
                  </Paper>
                );
              })}
            </Box>

            {selectedCalendarDate ? (
              <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
                <Typography variant="body2" color="text.secondary">
                  Filtro de dia: {formatDateLabel(selectedCalendarDate)}
                </Typography>
                <Button size="small" onClick={() => setSelectedCalendarDate("")}>
                  Limpar dia
                </Button>
              </Stack>
            ) : null}
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Stack spacing={2}>
            <Paper sx={{ p: 2.5 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={1}
                mb={1}
              >
                <Typography variant="h6">Entregas atrasadas</Typography>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<WarningAmberRoundedIcon />}
                  onClick={() => setAlertModalOpen(true)}
                  disabled={!overdueSales.length}
                >
                  Abrir alerta ({overdueSales.length})
                </Button>
              </Stack>
              <Alert severity={overdueSales.length ? "warning" : "success"}>
                {overdueSales.length
                  ? `${overdueSales.length} entrega(s) atrasada(s) pendente(s) de baixa. Elas aparecem sempre, independente do filtro.`
                  : "Nenhuma entrega atrasada no momento."}
              </Alert>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={1}
                mb={2}
              >
                <Typography variant="h6">
                  Histórico de vendas ({salesHistory.length})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Período: {formatDateLabel(normalizedInterval.start)} até{" "}
                  {formatDateLabel(normalizedInterval.end)}
                </Typography>
              </Stack>

              <Stack spacing={1.5}>
                {salesHistory.map((venda) => {
                  const saleDate = normalizeDateValue(venda.data_venda);
                  const parcelas = parcelasByVendaId.get(venda.id) || [];
                  const recebidas = parcelas.filter(
                    (parcela) => parcela.status === "RECEBIDA",
                  ).length;
                  const nextParcela = parcelas
                    .filter((parcela) => parcela.status !== "RECEBIDA")
                    .sort((a, b) =>
                      normalizeDateValue(a.vencimento).localeCompare(
                        normalizeDateValue(b.vencimento),
                      ),
                    )[0];

                  return (
                    <Paper key={venda.id} variant="outlined" sx={{ p: 2 }}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "center" }}
                        spacing={1.5}
                      >
                        <Box sx={{ pr: 1 }}>
                          <Typography fontWeight={700}>
                            Venda #{venda.id.slice(0, 8)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Cliente: {clientesById.get(venda.cliente_id)?.nome || "-"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Venda: {formatDateLabel(saleDate)} • Programada:{" "}
                            {formatDateLabel(venda.data_programada_entrega)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Entrega: {formatDateLabel(venda.data_entrega)} • Valor:{" "}
                            {formatCurrency(venda.valor_total)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Produtos: {produtosByVendaId.get(venda.id) || "-"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Pagamento: {recebidas}/{parcelas.length} parcela(s) recebida(s)
                            {nextParcela
                              ? ` • Próx. vencimento ${formatDateLabel(nextParcela.vencimento)}`
                              : ""}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={venda.status_entrega || "PENDENTE"}
                            color={
                              venda.status_entrega === "ENTREGUE" ? "success" : "warning"
                            }
                          />
                          {venda.status_entrega !== "ENTREGUE" ? (
                            <Button
                              variant="contained"
                              onClick={() => abrirFinalizacao(venda)}
                            >
                              Finalizar entrega
                            </Button>
                          ) : null}
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}

                {!salesHistory.length ? (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma venda no intervalo selecionado.
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      <Dialog
        open={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pr: 6 }}>
          Entregas atrasadas sem baixa ({overdueSales.length})
          <IconButton
            aria-label="Fechar modal de alerta"
            onClick={() => setAlertModalOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {overdueSales.map((venda) => (
              <Paper key={venda.id} variant="outlined" sx={{ p: 2 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  spacing={1.5}
                >
                  <Box>
                    <Typography fontWeight={700}>Venda #{venda.id.slice(0, 8)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cliente: {clientesById.get(venda.cliente_id)?.nome || "-"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Programada: {formatDateLabel(venda.data_programada_entrega)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Valor: {formatCurrency(venda.valor_total)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label="ATRASADA" color="error" />
                    <Button variant="contained" onClick={() => abrirFinalizacao(venda)}>
                      Finalizar entrega
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}

            {!overdueSales.length ? (
              <Typography variant="body2" color="text.secondary">
                Não há entregas atrasadas neste momento.
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
      </Dialog>

      <Drawer
        anchor="right"
        open={Boolean(vendaSelecionada)}
        onClose={() => setVendaSelecionada(null)}
        ModalProps={{
          sx: { zIndex: (theme) => theme.zIndex.tooltip + 1 },
        }}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: "46%" },
            p: 3,
          },
        }}
      >
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Finalizar entrega
        </Typography>
        {vendaSelecionada ? (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Venda #{vendaSelecionada.id.slice(0, 8)}
            </Typography>
            <Typography variant="body2">
              Cliente: {clientesById.get(vendaSelecionada.cliente_id)?.nome || "-"}
            </Typography>
            <Typography variant="body2">
              Valor: {formatCurrency(vendaSelecionada.valor_total)}
            </Typography>

            <TextField
              label="Data da entrega"
              type="date"
              value={dataEntrega}
              onChange={(event) => setDataEntrega(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography fontWeight={600}>Custos extras (opcional)</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setDespesas((prev) => [...prev, createDespesa()])}
              >
                Adicionar
              </Button>
            </Stack>

            {despesas.map((despesa) => (
              <Paper key={despesa.id} variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      label="Fornecedor"
                      value={despesa.fornecedor_id}
                      onChange={(event) =>
                        handleDespesaChange(despesa.id, "fornecedor_id", event.target.value)
                      }
                      fullWidth
                    >
                      {fornecedores.map((fornecedor) => (
                        <MenuItem key={fornecedor.id} value={fornecedor.id}>
                          {fornecedor.razao_social}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Descrição"
                      value={despesa.descricao}
                      onChange={(event) =>
                        handleDespesaChange(despesa.id, "descricao", event.target.value)
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Valor"
                      type="number"
                      value={despesa.valor}
                      onChange={(event) =>
                        handleDespesaChange(despesa.id, "valor", event.target.value)
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Data de pagamento"
                      type="date"
                      value={despesa.data}
                      onChange={(event) =>
                        handleDespesaChange(despesa.id, "data", event.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      label="Status"
                      value={despesa.status_pagamento}
                      onChange={(event) =>
                        handleDespesaChange(despesa.id, "status_pagamento", event.target.value)
                      }
                      fullWidth
                    >
                      <MenuItem value="A_PRAZO">A prazo</MenuItem>
                      <MenuItem value="A_VISTA">Pago na hora</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Método pagamento"
                      value={despesa.forma_pagamento}
                      onChange={(event) =>
                        handleDespesaChange(despesa.id, "forma_pagamento", event.target.value)
                      }
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => setVendaSelecionada(null)}>
                Cancelar
              </Button>
              <Button variant="contained" onClick={finalizarEntrega}>
                Confirmar entrega
              </Button>
            </Stack>
          </Stack>
        ) : null}
      </Drawer>
    </AppLayout>
  );
};

export default VendasPage;
