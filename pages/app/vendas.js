import {
  Alert,
  Box,
  Button,
  Chip,
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
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import SearchableSelect from "../../components/atomic/SearchableSelect";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency } from "../../utils/format";
import { downloadWorkbookXlsx } from "../../utils/xlsx";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayDate = () => toIsoDate(new Date());

const getCurrentMonthRange = () => {
  const current = new Date();
  return {
    start: toIsoDate(new Date(current.getFullYear(), current.getMonth(), 1)),
    end: toIsoDate(new Date(current.getFullYear(), current.getMonth() + 1, 0)),
  };
};

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

const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isDateWithinRange = (dateValue, start, end) => {
  if (!dateValue) return false;
  if (start && dateValue < start) return false;
  if (end && dateValue > end) return false;
  return true;
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

const sortRowsBySaleDateDesc = (rowA, rowB) => {
  const dateOrder = String(rowB.saleDate || "").localeCompare(
    String(rowA.saleDate || ""),
  );
  if (dateOrder !== 0) return dateOrder;
  return String(rowB.venda.id || "").localeCompare(String(rowA.venda.id || ""));
};

const VendasPage = () => {
  const vendas = useDataStore((state) => state.vendas);
  const vendaItens = useDataStore((state) => state.vendaItens);
  const clientes = useDataStore((state) => state.clientes);
  const insumos = useDataStore((state) => state.insumos);
  const contasReceber = useDataStore((state) => state.contasReceber);
  const contasReceberParcelas = useDataStore(
    (state) => state.contasReceberParcelas,
  );
  const fornecedores = useDataStore((state) => state.fornecedores);
  const confirmarEntregaVenda = useDataStore(
    (state) => state.confirmarEntregaVenda,
  );

  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [dataEntrega, setDataEntrega] = useState(todayDate());
  const [despesas, setDespesas] = useState([]);
  const [overdueDrawerOpen, setOverdueDrawerOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [receiptFilter, setReceiptFilter] = useState("TODOS");

  const initialRange = getCurrentMonthRange();
  const [intervalStart, setIntervalStart] = useState(initialRange.start);
  const [intervalEnd, setIntervalEnd] = useState(initialRange.end);

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
          const quantidade =
            Number(item.quantidade_informada ?? item.quantidade_kg) || 0;
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

  const salesRows = useMemo(() => {
    const today = todayDate();

    return vendas.map((venda) => {
      const saleDate = normalizeDateValue(venda.data_venda);
      const scheduledDate = normalizeDateValue(venda.data_programada_entrega);
      const deliveredDate = normalizeDateValue(venda.data_entrega);
      const clientName = clientesById.get(venda.cliente_id)?.nome || "-";
      const products = produtosByVendaId.get(venda.id) || "-";
      const parcelas = parcelasByVendaId.get(venda.id) || [];
      const receivedCount = parcelas.filter(
        (parcela) => String(parcela.status || "").toUpperCase() === "RECEBIDA",
      ).length;
      const totalInstallments = parcelas.length;
      const receiptStatus =
        totalInstallments > 0 && receivedCount === totalInstallments
          ? "RECEBIDO"
          : "NAO_RECEBIDO";
      const receiptLabel =
        receiptStatus === "RECEBIDO" ? "Recebido" : "Não recebido";
      const pendingInstallments = parcelas
        .filter(
          (parcela) =>
            String(parcela.status || "").toUpperCase() !== "RECEBIDA",
        )
        .sort((a, b) =>
          normalizeDateValue(a.vencimento).localeCompare(
            normalizeDateValue(b.vencimento),
          ),
        );
      const nextPendingInstallment = pendingInstallments[0] || null;
      const isOverdue =
        (venda.status_entrega || "PENDENTE") !== "ENTREGUE" &&
        Boolean(scheduledDate && scheduledDate < today);

      const searchableText = normalizeText(
        [
          venda.id,
          clientName,
          products,
          venda.status_entrega || "PENDENTE",
          receiptLabel,
          venda.tipo_pagamento,
          venda.forma_pagamento,
          saleDate,
          scheduledDate,
          deliveredDate,
        ].join(" "),
      );

      return {
        venda,
        clientName,
        products,
        saleDate,
        scheduledDate,
        deliveredDate,
        parcelas,
        receivedCount,
        totalInstallments,
        receiptStatus,
        receiptLabel,
        nextPendingInstallment,
        isOverdue,
        searchableText,
      };
    });
  }, [clientesById, parcelasByVendaId, produtosByVendaId, vendas]);

  const overdueSales = useMemo(
    () =>
      salesRows
        .filter((row) => row.isOverdue)
        .sort((rowA, rowB) => {
          const dateOrder = String(rowA.scheduledDate || "").localeCompare(
            String(rowB.scheduledDate || ""),
          );
          if (dateOrder !== 0) return dateOrder;
          return sortRowsBySaleDateDesc(rowA, rowB);
        }),
    [salesRows],
  );

  const normalizedHistorySearch = useMemo(
    () => normalizeText(historySearch),
    [historySearch],
  );

  const salesHistory = useMemo(
    () =>
      salesRows
        .filter((row) =>
          isDateWithinRange(
            row.saleDate,
            normalizedInterval.start,
            normalizedInterval.end,
          ),
        )
        .filter((row) => {
          if (receiptFilter === "TODOS") return true;
          return row.receiptStatus === receiptFilter;
        })
        .filter((row) => {
          if (!normalizedHistorySearch) return true;
          return row.searchableText.includes(normalizedHistorySearch);
        })
        .sort(sortRowsBySaleDateDesc),
    [
      normalizedHistorySearch,
      normalizedInterval.end,
      normalizedInterval.start,
      receiptFilter,
      salesRows,
    ],
  );

  const exportSales = useMemo(() => {
    const rowsById = new Map();

    salesHistory.forEach((row) => {
      rowsById.set(row.venda.id, {
        ...row,
        inHistory: true,
        inOverdue: false,
      });
    });

    overdueSales.forEach((row) => {
      const current = rowsById.get(row.venda.id);
      rowsById.set(row.venda.id, {
        ...row,
        inHistory: current?.inHistory || false,
        inOverdue: true,
      });
    });

    return Array.from(rowsById.values()).sort(sortRowsBySaleDateDesc);
  }, [overdueSales, salesHistory]);

  const handleDownloadSales = () => {
    if (!exportSales.length) return;

    const rows = [];

    exportSales.forEach((row) => {
      const { venda } = row;
      const base = {
        origem_tela:
          row.inHistory && row.inOverdue
            ? "HISTORICO_E_ATRASADAS"
            : row.inOverdue
              ? "ATRASADAS"
              : "HISTORICO_INTERVALO",
        venda_id: venda.id,
        cliente: row.clientName,
        data_venda: row.saleDate,
        data_programada_entrega: row.scheduledDate,
        data_entrega: row.deliveredDate,
        status_entrega: venda.status_entrega || "PENDENTE",
        entrega_atrasada: row.isOverdue ? "SIM" : "NAO",
        status_recebimento: row.receiptLabel,
        parcelas_recebidas: row.receivedCount,
        parcelas_totais: row.totalInstallments,
        proximo_vencimento_aberto: row.nextPendingInstallment
          ? normalizeDateValue(row.nextPendingInstallment.vencimento)
          : "",
        valor_venda: Number(venda.valor_total || 0),
        produtos: row.products,
        tipo_pagamento: venda.tipo_pagamento || "-",
        forma_pagamento_venda: venda.forma_pagamento || "-",
        observacoes_venda: venda.obs || "-",
      };

      if (!row.parcelas.length) {
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

      row.parcelas.forEach((parcela) => {
        rows.push({
          ...base,
          parcela_num: parcela.parcela_num ?? "",
          status_parcela: parcela.status || "",
          data_vencimento: normalizeDateValue(parcela.vencimento),
          data_pagamento: normalizeDateValue(parcela.data_recebimento),
          valor_programado_parcela: Number(
            parcela.valor_programado ?? parcela.valor ?? 0,
          ),
          valor_recebido_parcela:
            parcela.valor_recebido === null ||
            parcela.valor_recebido === undefined
              ? ""
              : Number(parcela.valor_recebido),
          forma_recebimento_real:
            parcela.forma_recebimento_real || parcela.forma_recebimento || "",
          observacao_pagamento: parcela.observacao_recebimento || "",
        });
      });
    });

    downloadWorkbookXlsx({
      fileName: `vendas_${normalizedInterval.start || "inicio"}_a_${normalizedInterval.end || "fim"}_e_atrasadas`,
      sheets: [
        {
          name: "Vendas",
          columns: [
            { key: "origem_tela", header: "Origem na tela" },
            { key: "venda_id", header: "ID venda" },
            { key: "cliente", header: "Cliente" },
            { key: "data_venda", header: "Data venda" },
            {
              key: "data_programada_entrega",
              header: "Data programada entrega",
            },
            { key: "data_entrega", header: "Data entrega" },
            { key: "status_entrega", header: "Status entrega" },
            { key: "entrega_atrasada", header: "Entrega atrasada" },
            { key: "status_recebimento", header: "Status recebimento" },
            { key: "parcelas_recebidas", header: "Parcelas recebidas" },
            { key: "parcelas_totais", header: "Parcelas totais" },
            {
              key: "proximo_vencimento_aberto",
              header: "Próximo vencimento aberto",
            },
            { key: "valor_venda", header: "Valor venda" },
            { key: "produtos", header: "Produtos" },
            { key: "tipo_pagamento", header: "Tipo pagamento" },
            { key: "forma_pagamento_venda", header: "Forma pagamento (venda)" },
            { key: "parcela_num", header: "Parcela" },
            { key: "status_parcela", header: "Status parcela" },
            { key: "data_vencimento", header: "Data vencimento" },
            { key: "data_pagamento", header: "Data pagamento" },
            {
              key: "valor_programado_parcela",
              header: "Valor programado parcela",
            },
            { key: "valor_recebido_parcela", header: "Valor recebido parcela" },
            { key: "forma_recebimento_real", header: "Forma recebimento real" },
            { key: "observacoes_venda", header: "Observações venda" },
            { key: "observacao_pagamento", header: "Observação pagamento" },
          ],
          rows,
        },
      ],
    });
  };

  const resetToCurrentMonth = () => {
    const currentRange = getCurrentMonthRange();
    setIntervalStart(currentRange.start);
    setIntervalEnd(currentRange.end);
  };

  const abrirFinalizacao = (venda) => {
    setOverdueDrawerOpen(false);
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
          despesa.fornecedor_id && despesa.valor > 0 && despesa.descricao,
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
        subtitle="Intervalo de datas com histórico filtrável, status de recebimento e painel fixo de entregas atrasadas."
        action={
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadSales}
            disabled={!exportSales.length}
          >
            Download de vendas
          </Button>
        }
      />

      <Stack spacing={2}>
        <Paper sx={{ p: 3 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={1.5}
            mb={2}
          >
            <Box>
              <Typography variant="h6">Intervalo de datas</Typography>
              <Typography variant="body2" color="text.secondary">
                O histórico e o download seguem esse intervalo. Entregas
                atrasadas continuam visíveis mesmo fora dele.
              </Typography>
            </Box>
            <Button variant="outlined" onClick={resetToCurrentMonth}>
              Mês atual
            </Button>
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Data inicial"
                type="date"
                value={intervalStart}
                onChange={(event) => setIntervalStart(event.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Data final"
                type="date"
                value={intervalEnd}
                onChange={(event) => setIntervalEnd(event.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Stack
                direction={{ xs: "column", sm: "row", lg: "column", xl: "row" }}
                justifyContent="space-between"
                alignItems={{
                  xs: "flex-start",
                  sm: "center",
                  lg: "flex-start",
                  xl: "center",
                }}
                spacing={1}
                mb={1.5}
              >
                <Typography variant="h6">
                  Entregas atrasadas ({overdueSales.length})
                </Typography>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<WarningAmberRoundedIcon />}
                  onClick={() => setOverdueDrawerOpen(true)}
                  disabled={!overdueSales.length}
                >
                  Abrir painel
                </Button>
              </Stack>

              <Alert
                severity={overdueSales.length ? "warning" : "success"}
                sx={{ mb: 2 }}
              >
                {overdueSales.length
                  ? "Todas as entregas atrasadas ficam visíveis aqui, mesmo fora do intervalo de datas."
                  : "Nenhuma entrega atrasada no momento."}
              </Alert>

              <Stack
                spacing={1.5}
                sx={{ maxHeight: 520, overflowY: "auto", pr: 0.5 }}
              >
                {overdueSales.map((row) => (
                  <Paper key={row.venda.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1.25}>
                      <Box>
                        <Typography fontWeight={700}>
                          Venda #{row.venda.id.slice(0, 8)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Cliente: {row.clientName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Programada: {formatDateLabel(row.scheduledDate)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Valor: {formatCurrency(row.venda.valor_total)}
                        </Typography>
                      </Box>

                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Chip label="ATRASADA" color="error" size="small" />
                        <Chip
                          label={row.receiptLabel}
                          color={
                            row.receiptStatus === "RECEBIDO"
                              ? "success"
                              : "warning"
                          }
                          size="small"
                        />
                      </Stack>

                      <Button
                        variant="contained"
                        onClick={() => abrirFinalizacao(row.venda)}
                      >
                        Finalizar entrega
                      </Button>
                    </Stack>
                  </Paper>
                ))}

                {!overdueSales.length ? (
                  <Typography variant="body2" color="text.secondary">
                    Não há entregas atrasadas para acompanhar.
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                spacing={1.5}
                mb={2}
              >
                <Box>
                  <Typography variant="h6">
                    Histórico de vendas ({salesHistory.length})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Período: {formatDateLabel(normalizedInterval.start)} até{" "}
                    {formatDateLabel(normalizedInterval.end)}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  O download considera esse histórico filtrado mais as entregas
                  atrasadas.
                </Typography>
              </Stack>

              <Grid container spacing={1.5} mb={2}>
                <Grid item xs={12} md={8}>
                  <TextField
                    label="Filtro interno"
                    placeholder="Buscar por cliente, venda, produto ou status"
                    value={historySearch}
                    onChange={(event) => setHistorySearch(event.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <SearchableSelect
                    label="Recebimento"
                    value={receiptFilter}
                    onChange={(event) => setReceiptFilter(event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="TODOS">Todos</MenuItem>
                    <MenuItem value="RECEBIDO">Recebido</MenuItem>
                    <MenuItem value="NAO_RECEBIDO">Não recebido</MenuItem>
                  </SearchableSelect>
                </Grid>
              </Grid>

              <Stack spacing={1.5}>
                {salesHistory.map((row) => (
                  <Paper key={row.venda.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "center" }}
                      spacing={1.5}
                    >
                      <Box sx={{ pr: 1 }}>
                        <Typography fontWeight={700}>
                          Venda #{row.venda.id.slice(0, 8)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Cliente: {row.clientName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Venda: {formatDateLabel(row.saleDate)} • Programada:{" "}
                          {formatDateLabel(row.scheduledDate)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Entrega: {formatDateLabel(row.deliveredDate)} • Valor:{" "}
                          {formatCurrency(row.venda.valor_total)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Produtos: {row.products}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Recebimento: {row.receiptLabel} ({row.receivedCount}/
                          {row.totalInstallments || 0} parcela(s) recebida(s))
                          {row.nextPendingInstallment
                            ? ` • Próx. vencimento ${formatDateLabel(row.nextPendingInstallment.vencimento)}`
                            : ""}
                        </Typography>
                      </Box>

                      <Stack
                        spacing={1}
                        alignItems={{ xs: "flex-start", md: "flex-end" }}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          <Chip
                            label={row.receiptLabel}
                            color={
                              row.receiptStatus === "RECEBIDO"
                                ? "success"
                                : "warning"
                            }
                          />
                          <Chip
                            label={row.venda.status_entrega || "PENDENTE"}
                            color={
                              row.venda.status_entrega === "ENTREGUE"
                                ? "success"
                                : row.isOverdue
                                  ? "error"
                                  : "warning"
                            }
                          />
                          {row.isOverdue ? (
                            <Chip
                              label="ATRASADA"
                              color="error"
                              variant="outlined"
                            />
                          ) : null}
                        </Stack>

                        {row.venda.status_entrega !== "ENTREGUE" ? (
                          <Button
                            variant="contained"
                            onClick={() => abrirFinalizacao(row.venda)}
                          >
                            Finalizar entrega
                          </Button>
                        ) : null}
                      </Stack>
                    </Stack>
                  </Paper>
                ))}

                {!salesHistory.length ? (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma venda encontrada para o intervalo e filtros
                    informados.
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Stack>

      <Drawer
        anchor="right"
        open={overdueDrawerOpen}
        onClose={() => setOverdueDrawerOpen(false)}
        ModalProps={{
          sx: { zIndex: (theme) => theme.zIndex.modal + 20 },
        }}
        PaperProps={{
          sx: {
            width: { xs: "100%", lg: "40vw" },
            minWidth: { lg: 420 },
            height: "100vh",
            p: 3,
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
          mb={2}
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Entregas atrasadas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {overdueSales.length} venda(s) atrasada(s), independente do
              intervalo de datas.
            </Typography>
          </Box>
          <IconButton
            aria-label="Fechar painel de entregas atrasadas"
            onClick={() => setOverdueDrawerOpen(false)}
          >
            <CloseIcon />
          </IconButton>
        </Stack>

        <Stack spacing={1.5} sx={{ flex: 1, overflowY: "auto", pr: 0.5 }}>
          {overdueSales.map((row) => (
            <Paper key={row.venda.id} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.25}>
                <Box>
                  <Typography fontWeight={700}>
                    Venda #{row.venda.id.slice(0, 8)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cliente: {row.clientName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Venda: {formatDateLabel(row.saleDate)} • Programada:{" "}
                    {formatDateLabel(row.scheduledDate)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Valor: {formatCurrency(row.venda.valor_total)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Produtos: {row.products}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label="ATRASADA" color="error" />
                  <Chip
                    label={row.receiptLabel}
                    color={
                      row.receiptStatus === "RECEBIDO" ? "success" : "warning"
                    }
                  />
                </Stack>

                <Button
                  variant="contained"
                  onClick={() => abrirFinalizacao(row.venda)}
                >
                  Finalizar entrega
                </Button>
              </Stack>
            </Paper>
          ))}

          {!overdueSales.length ? (
            <Typography variant="body2" color="text.secondary">
              Não há entregas atrasadas neste momento.
            </Typography>
          ) : null}
        </Stack>
      </Drawer>

      <Drawer
        anchor="right"
        open={Boolean(vendaSelecionada)}
        onClose={() => setVendaSelecionada(null)}
        ModalProps={{
          sx: { zIndex: (theme) => theme.zIndex.modal + 20 },
        }}
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
          Finalizar entrega
        </Typography>
        {vendaSelecionada ? (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Venda #{vendaSelecionada.id.slice(0, 8)}
            </Typography>
            <Typography variant="body2">
              Cliente:{" "}
              {clientesById.get(vendaSelecionada.cliente_id)?.nome || "-"}
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

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography fontWeight={600}>Custos extras (opcional)</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() =>
                  setDespesas((prev) => [...prev, createDespesa()])
                }
              >
                Adicionar
              </Button>
            </Stack>

            {despesas.map((despesa) => (
              <Paper key={despesa.id} variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} md={6}>
                    <SearchableSelect
                      label="Fornecedor"
                      value={despesa.fornecedor_id}
                      onChange={(event) =>
                        handleDespesaChange(
                          despesa.id,
                          "fornecedor_id",
                          event.target.value,
                        )
                      }
                      fullWidth
                    >
                      {fornecedores.map((fornecedor) => (
                        <MenuItem key={fornecedor.id} value={fornecedor.id}>
                          {fornecedor.razao_social}
                        </MenuItem>
                      ))}
                    </SearchableSelect>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Descrição"
                      value={despesa.descricao}
                      onChange={(event) =>
                        handleDespesaChange(
                          despesa.id,
                          "descricao",
                          event.target.value,
                        )
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
                        handleDespesaChange(
                          despesa.id,
                          "valor",
                          event.target.value,
                        )
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
                        handleDespesaChange(
                          despesa.id,
                          "data",
                          event.target.value,
                        )
                      }
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <SearchableSelect
                      label="Status"
                      value={despesa.status_pagamento}
                      onChange={(event) =>
                        handleDespesaChange(
                          despesa.id,
                          "status_pagamento",
                          event.target.value,
                        )
                      }
                      fullWidth
                    >
                      <MenuItem value="A_PRAZO">A prazo</MenuItem>
                      <MenuItem value="A_VISTA">Pago na hora</MenuItem>
                    </SearchableSelect>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Método pagamento"
                      value={despesa.forma_pagamento}
                      onChange={(event) =>
                        handleDespesaChange(
                          despesa.id,
                          "forma_pagamento",
                          event.target.value,
                        )
                      }
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => setVendaSelecionada(null)}
              >
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
