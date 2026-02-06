import {
  Box,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import InfoCard from "../../components/atomic/InfoCard";
import { formatCurrency, formatDate } from "../../utils/format";

const emptyResumo = {
  clientesAtivos: 0,
  fornecedoresAtivos: 0,
  totalVendas: 0,
  totalReceberEmAberto: 0,
  totalPagarEmAberto: 0,
};

const emptyFluxo = {
  month: "",
  days: [],
  detailsByDay: {},
};

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildCalendarDays = (monthReference, days) => {
  const [year, month] = monthReference
    .split("-")
    .map((value) => Number(value) || 0);

  if (!year || !month) return [];

  const firstDay = new Date(year, month - 1, 1);
  const firstWeekDay = firstDay.getDay();
  const totalDays = new Date(year, month, 0).getDate();
  const daysMap = new Map(days.map((item) => [item.date, item]));
  const cells = [];

  for (let index = 0; index < firstWeekDay; index += 1) {
    cells.push({ key: `empty-start-${index}`, isCurrentMonth: false });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = toIsoDate(new Date(year, month - 1, day));
    const dayData = daysMap.get(date);

    cells.push({
      key: date,
      date,
      day,
      total: Number(dayData?.total) || 0,
      isCurrentMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `empty-end-${cells.length}`, isCurrentMonth: false });
  }

  return cells;
};

const AppHome = () => {
  const [resumo, setResumo] = useState(emptyResumo);
  const [fluxo, setFluxo] = useState(emptyFluxo);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    const carregarResumo = async () => {
      try {
        const response = await fetch("/api/v1/dashboard/resumo");
        if (!response.ok) return;
        const result = await response.json();
        setResumo({
          clientesAtivos: Number(result.clientesAtivos) || 0,
          fornecedoresAtivos: Number(result.fornecedoresAtivos) || 0,
          totalVendas: Number(result.totalVendas) || 0,
          totalReceberEmAberto: Number(result.totalReceberEmAberto) || 0,
          totalPagarEmAberto: Number(result.totalPagarEmAberto) || 0,
        });
      } catch (error) {
        return;
      }
    };

    carregarResumo();
  }, []);

  useEffect(() => {
    const carregarFluxo = async () => {
      try {
        const response = await fetch("/api/v1/dashboard/fluxo-caixa");
        if (!response.ok) return;
        const result = await response.json();
        const fallbackDate = toIsoDate(new Date());

        setFluxo({
          month: result.month || "",
          days: Array.isArray(result.days) ? result.days : [],
          detailsByDay: result.detailsByDay || {},
        });
        setSelectedDate(result.selectedDate || fallbackDate);
      } catch (error) {
        return;
      }
    };

    carregarFluxo();
  }, []);

  const calendarDays = useMemo(
    () => buildCalendarDays(fluxo.month, fluxo.days),
    [fluxo.month, fluxo.days],
  );

  const detailRows = fluxo.detailsByDay?.[selectedDate] || [];

  return (
    <AppLayout>
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Visão geral do negócio
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <InfoCard
              title="Clientes"
              value={resumo.clientesAtivos}
              subtitle="cadastros ativos"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <InfoCard
              title="Fornecedores"
              value={resumo.fornecedoresAtivos}
              subtitle="parceiros cadastrados"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <InfoCard
              title="Vendas"
              value={formatCurrency(resumo.totalVendas)}
              subtitle="total"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <InfoCard
              title="Recebíveis"
              value={formatCurrency(resumo.totalReceberEmAberto)}
              subtitle="em aberto"
            />
          </Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <InfoCard
              title="Contas a pagar"
              value={formatCurrency(resumo.totalPagarEmAberto)}
              subtitle="em aberto"
            />
          </Grid>
        </Grid>

        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={700}>
            Fluxo de caixa
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Calendário mensal
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                    gap: 1,
                  }}
                >
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                    (weekDay) => (
                      <Typography
                        key={weekDay}
                        variant="caption"
                        color="text.secondary"
                        textAlign="center"
                      >
                        {weekDay}
                      </Typography>
                    ),
                  )}
                  {calendarDays.map((day) => {
                    if (!day.isCurrentMonth) {
                      return <Box key={day.key} sx={{ minHeight: 72 }} />;
                    }

                    const isSelected = day.date === selectedDate;
                    const isToday = day.date === toIsoDate(new Date());
                    const totalColor =
                      day.total >= 0 ? "success.main" : "error.main";

                    return (
                      <Paper
                        key={day.key}
                        onClick={() => setSelectedDate(day.date)}
                        sx={{
                          p: 1,
                          cursor: "pointer",
                          border: isSelected ? "2px solid" : "1px solid",
                          borderColor: isSelected
                            ? "primary.main"
                            : isToday
                              ? "secondary.main"
                              : "divider",
                          minHeight: 72,
                        }}
                      >
                        <Typography variant="body2" fontWeight={700}>
                          {day.day}
                        </Typography>
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          color={totalColor}
                        >
                          {formatCurrency(day.total)}
                        </Typography>
                      </Paper>
                    );
                  })}
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Histórico detalhado de {formatDate(selectedDate)}
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Descrição</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Valor</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.typeLabel}</TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell>{row.status}</TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color:
                              Number(row.amount) >= 0
                                ? "success.main"
                                : "error.main",
                            fontWeight: 600,
                          }}
                        >
                          {formatCurrency(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!detailRows.length ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography variant="body2" color="text.secondary">
                            Nenhuma movimentação paga/recebida para este dia.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </Stack>
    </AppLayout>
  );
};

export default AppHome;
