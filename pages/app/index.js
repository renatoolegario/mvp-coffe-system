import {
  Alert,
  Box,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  CalendarMonth,
  ChevronLeft,
  ChevronRight,
  DateRange,
  LocalShipping,
  People,
  Payments,
  PriceCheck,
} from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import SearchableSelect from "../../components/atomic/SearchableSelect";
import { formatCurrency, formatDate } from "../../utils/format";
import { authenticatedFetch } from "../../hooks/useSession";

const PERIOD_OPTIONS = [
  { value: "TODAY", label: "Hoje" },
  { value: "THIS_WEEK", label: "Essa semana" },
  { value: "LAST_WEEK", label: "Última semana" },
  { value: "LAST_30_DAYS", label: "30 dias" },
  { value: "LAST_60_DAYS", label: "60 dias" },
  { value: "LAST_90_DAYS", label: "90 dias" },
  { value: "CUSTOM", label: "Personalizado" },
];

const emptyResumo = {
  clientesAtivos: 0,
  fornecedoresAtivos: 0,
  totalVendas: 0,
  totalReceberPeriodo: 0,
  totalPagarPeriodo: 0,
};

const emptyFluxo = {
  month: "",
  days: [],
  detailsByDay: {},
};

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH_REGEX = /^\d{4}-\d{2}$/;

const toIsoDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDateFromIso = (value) => new Date(`${value}T00:00:00`);

const toMonthLabel = (value) => {
  const date = ISO_DATE_REGEX.test(String(value || ""))
    ? toDateFromIso(value)
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
};

const buildMonthRange = (monthLabel) => {
  if (!ISO_MONTH_REGEX.test(String(monthLabel || ""))) {
    const now = new Date();
    return {
      monthLabel: toMonthLabel(now),
      startDate: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      endDate: toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }

  const [year, month] = monthLabel.split("-").map(Number);
  return {
    monthLabel,
    startDate: toIsoDate(new Date(year, month - 1, 1)),
    endDate: toIsoDate(new Date(year, month, 0)),
  };
};

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const startOfWeek = (date) => {
  const current = new Date(date);
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setHours(0, 0, 0, 0);
  current.setDate(current.getDate() + diff);
  return current;
};

const normalizeRange = (startDate, endDate) => {
  if (startDate <= endDate) return { startDate, endDate };
  return { startDate: endDate, endDate: startDate };
};

const getPresetRange = (preset) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (preset) {
    case "TODAY": {
      const iso = toIsoDate(today);
      return { startDate: iso, endDate: iso };
    }
    case "THIS_WEEK": {
      return {
        startDate: toIsoDate(startOfWeek(today)),
        endDate: toIsoDate(today),
      };
    }
    case "LAST_WEEK": {
      const thisWeekStart = startOfWeek(today);
      const lastWeekStart = addDays(thisWeekStart, -7);
      const lastWeekEnd = addDays(thisWeekStart, -1);
      return {
        startDate: toIsoDate(lastWeekStart),
        endDate: toIsoDate(lastWeekEnd),
      };
    }
    case "LAST_60_DAYS": {
      return {
        startDate: toIsoDate(addDays(today, -59)),
        endDate: toIsoDate(today),
      };
    }
    case "LAST_90_DAYS": {
      return {
        startDate: toIsoDate(addDays(today, -89)),
        endDate: toIsoDate(today),
      };
    }
    case "LAST_30_DAYS":
    default: {
      return {
        startDate: toIsoDate(addDays(today, -29)),
        endDate: toIsoDate(today),
      };
    }
  }
};

const resolveDateRange = (preset, customStartDate, customEndDate) => {
  if (preset !== "CUSTOM") return getPresetRange(preset);

  const startDate = ISO_DATE_REGEX.test(customStartDate)
    ? customStartDate
    : toIsoDate(new Date());
  const endDate = ISO_DATE_REGEX.test(customEndDate)
    ? customEndDate
    : startDate;

  return normalizeRange(startDate, endDate);
};

const shiftMonthLabel = (monthLabel, offset) => {
  const { monthLabel: normalized } = buildMonthRange(monthLabel);
  const [year, month] = normalized.split("-").map(Number);
  const shifted = new Date(year, month - 1 + offset, 1);
  return toMonthLabel(shifted);
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
  const todayIso = toIsoDate(new Date());
  const [periodPreset, setPeriodPreset] = useState("LAST_30_DAYS");
  const [customStartDate, setCustomStartDate] = useState(todayIso);
  const [customEndDate, setCustomEndDate] = useState(todayIso);
  const [displayMonth, setDisplayMonth] = useState(toMonthLabel(todayIso));
  const [resumo, setResumo] = useState(emptyResumo);
  const [fluxo, setFluxo] = useState(emptyFluxo);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const activeRange = useMemo(
    () => resolveDateRange(periodPreset, customStartDate, customEndDate),
    [periodPreset, customStartDate, customEndDate],
  );

  useEffect(() => {
    if (periodPreset !== "CUSTOM") {
      setDisplayMonth(toMonthLabel(activeRange.endDate));
    }
  }, [periodPreset, activeRange.endDate]);

  useEffect(() => {
    let canceled = false;

    const carregarDashboard = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const resumoParams = new URLSearchParams({
          startDate: activeRange.startDate,
          endDate: activeRange.endDate,
        });

        const fluxoParams = new URLSearchParams({
          startDate: activeRange.startDate,
          endDate: activeRange.endDate,
          month: displayMonth,
        });

        const [resumoResponse, fluxoResponse] = await Promise.all([
          authenticatedFetch(
            `/api/v1/dashboard/resumo?${resumoParams.toString()}`,
          ),
          authenticatedFetch(
            `/api/v1/dashboard/fluxo-caixa?${fluxoParams.toString()}`,
          ),
        ]);

        if (!resumoResponse.ok || !fluxoResponse.ok) {
          throw new Error("Falha ao carregar dados do dashboard.");
        }

        const [resumoResult, fluxoResult] = await Promise.all([
          resumoResponse.json(),
          fluxoResponse.json(),
        ]);

        if (canceled) return;

        setResumo({
          clientesAtivos: Number(resumoResult.clientesAtivos) || 0,
          fornecedoresAtivos: Number(resumoResult.fornecedoresAtivos) || 0,
          totalVendas: Number(resumoResult.totalVendas) || 0,
          totalReceberPeriodo: Number(resumoResult.totalReceberPeriodo) || 0,
          totalPagarPeriodo: Number(resumoResult.totalPagarPeriodo) || 0,
        });

        const nextFluxo = {
          month: fluxoResult.month || displayMonth,
          days: Array.isArray(fluxoResult.days) ? fluxoResult.days : [],
          detailsByDay: fluxoResult.detailsByDay || {},
        };

        setFluxo(nextFluxo);

        setSelectedDate((currentDate) => {
          if (
            currentDate &&
            typeof currentDate === "string" &&
            currentDate.startsWith(nextFluxo.month)
          ) {
            return currentDate;
          }

          return fluxoResult.selectedDate || activeRange.startDate;
        });
      } catch (error) {
        if (canceled) return;
        setErrorMessage("Não foi possível carregar os dados do dashboard.");
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    carregarDashboard();

    return () => {
      canceled = true;
    };
  }, [activeRange.startDate, activeRange.endDate, displayMonth]);

  const calendarDays = useMemo(
    () => buildCalendarDays(fluxo.month || displayMonth, fluxo.days),
    [fluxo.month, fluxo.days, displayMonth],
  );

  const detailRows = fluxo.detailsByDay?.[selectedDate] || [];

  const rangeLabel = `${formatDate(activeRange.startDate)} até ${formatDate(activeRange.endDate)}`;

  const syncCalendarMonthAsCustomRange = (monthLabel) => {
    const {
      monthLabel: normalizedMonth,
      startDate,
      endDate,
    } = buildMonthRange(monthLabel);

    setDisplayMonth(normalizedMonth);
    setPeriodPreset("CUSTOM");
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
    setSelectedDate(startDate);
  };

  const handleChangeDisplayMonth = (nextMonth) => {
    if (!ISO_MONTH_REGEX.test(nextMonth || "")) return;
    syncCalendarMonthAsCustomRange(nextMonth);
  };

  return (
    <AppLayout>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          gap={2}
        >
          <Typography variant="h4" fontWeight={700}>
            Dashboard
          </Typography>

          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Chip
              icon={<People fontSize="small" />}
              label={`${resumo.clientesAtivos} Clientes`}
              sx={{ bgcolor: "secondary.main", color: "text.primary" }}
            />
            <Typography color="text.secondary" sx={{ px: 0.5 }}>
              |
            </Typography>
            <Chip
              icon={<LocalShipping fontSize="small" />}
              label={`${resumo.fornecedoresAtivos} Fornecedores`}
              sx={{ bgcolor: "secondary.main", color: "text.primary" }}
            />
          </Stack>
        </Stack>

        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" gap={1}>
              <DateRange color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                Filtro de período
              </Typography>
            </Stack>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <SearchableSelect
                size="small"
                label="Período"
                value={periodPreset}
                onChange={(event) => setPeriodPreset(event.target.value)}
                sx={{ minWidth: 220 }}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </SearchableSelect>

              {periodPreset === "CUSTOM" ? (
                <>
                  <TextField
                    size="small"
                    type="date"
                    label="De"
                    InputLabelProps={{ shrink: true }}
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="Até"
                    InputLabelProps={{ shrink: true }}
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                  />
                </>
              ) : null}
            </Stack>

            <Typography variant="body2" color="text.secondary">
              Período aplicado: {rangeLabel}
            </Typography>
          </Stack>
        </Paper>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  Contas a receber
                </Typography>
                <PriceCheck color="success" />
              </Stack>
              <Typography
                variant="h5"
                fontWeight={700}
                color="success.main"
                mt={1}
              >
                {formatCurrency(resumo.totalReceberPeriodo)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total previsto no período selecionado.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  Contas a pagar
                </Typography>
                <Payments color="warning" />
              </Stack>
              <Typography
                variant="h5"
                fontWeight={700}
                color="warning.main"
                mt={1}
              >
                {formatCurrency(resumo.totalPagarPeriodo)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total previsto no período selecionado.
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={700}>
            Calendário mensal e histórico detalhado
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Stack direction="row" alignItems="center" gap={1}>
                      <CalendarMonth color="primary" />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Calendário mensal
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleChangeDisplayMonth(
                            shiftMonthLabel(displayMonth, -1),
                          )
                        }
                      >
                        <ChevronLeft fontSize="small" />
                      </IconButton>
                      <TextField
                        size="small"
                        type="month"
                        value={displayMonth}
                        onChange={(event) =>
                          handleChangeDisplayMonth(event.target.value)
                        }
                        sx={{ width: 170 }}
                      />
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleChangeDisplayMonth(
                            shiftMonthLabel(displayMonth, 1),
                          )
                        }
                      >
                        <ChevronRight fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                    Ao trocar o mês, o filtro vira personalizado para o mês
                    escolhido.
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
                        return <Box key={day.key} sx={{ minHeight: 76 }} />;
                      }

                      const isSelected = day.date === selectedDate;
                      const isToday = day.date === todayIso;
                      const isInsideRange =
                        day.date >= activeRange.startDate &&
                        day.date <= activeRange.endDate;
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
                            minHeight: 76,
                            opacity: isInsideRange ? 1 : 0.5,
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
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <Typography variant="subtitle1" fontWeight={600}>
                    Histórico detalhado de {formatDate(selectedDate)}
                  </Typography>
                  {loading ? (
                    <Typography variant="caption" color="text.secondary">
                      Atualizando...
                    </Typography>
                  ) : null}
                </Stack>

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
