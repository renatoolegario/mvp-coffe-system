import { query } from "../../../../infra/database";
import { requireAuth } from "../../../../infra/auth";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH_REGEX = /^\d{4}-\d{2}$/;

const toIsoDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toMonthLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
};

const currentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    monthLabel: toMonthLabel(start),
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    today: toIsoDate(now),
  };
};

const normalizeRange = (startDate, endDate) => {
  if (startDate <= endDate) return { startDate, endDate };
  return { startDate: endDate, endDate: startDate };
};

const monthRangeFromLabel = (monthLabel) => {
  if (!ISO_MONTH_REGEX.test(String(monthLabel || "")))
    return currentMonthRange();
  const [year, month] = String(monthLabel).split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    monthLabel: `${year}-${String(month).padStart(2, "0")}`,
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    today: toIsoDate(new Date()),
  };
};

const maxIsoDate = (a, b) => (a >= b ? a : b);
const minIsoDate = (a, b) => (a <= b ? a : b);

const clampSelectedDate = ({
  selectedDate,
  monthLabel,
  startDate,
  endDate,
  today,
}) => {
  if (
    selectedDate &&
    selectedDate >= startDate &&
    selectedDate <= endDate &&
    selectedDate.startsWith(monthLabel)
  ) {
    return selectedDate;
  }

  if (today >= startDate && today <= endDate && today.startsWith(monthLabel)) {
    return today;
  }

  return startDate;
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const fallbackRange = currentMonthRange();
  const requestStartDate = ISO_DATE_REGEX.test(
    String(req.query.startDate || ""),
  )
    ? String(req.query.startDate)
    : fallbackRange.startDate;
  const requestEndDate = ISO_DATE_REGEX.test(String(req.query.endDate || ""))
    ? String(req.query.endDate)
    : fallbackRange.endDate;
  const range = normalizeRange(requestStartDate, requestEndDate);
  const monthLabelFromQuery = ISO_MONTH_REGEX.test(
    String(req.query.month || ""),
  )
    ? String(req.query.month)
    : toMonthLabel(`${range.endDate}T00:00:00`) || fallbackRange.monthLabel;
  const monthRange = monthRangeFromLabel(monthLabelFromQuery);
  const queryStartDate = maxIsoDate(range.startDate, monthRange.startDate);
  const queryEndDate = minIsoDate(range.endDate, monthRange.endDate);
  const hasIntersection = queryStartDate <= queryEndDate;
  const today = toIsoDate(new Date());
  const selectedDate = hasIntersection
    ? clampSelectedDate({
        selectedDate: String(req.query.selectedDate || ""),
        monthLabel: monthRange.monthLabel,
        startDate: queryStartDate,
        endDate: queryEndDate,
        today,
      })
    : monthRange.startDate;

  try {
    let recebidasResult = { rows: [] };
    let pagasResult = { rows: [] };

    if (hasIntersection) {
      [recebidasResult, pagasResult] = await Promise.all([
        query(
          `SELECT id, valor, status, data_recebimento
           FROM contas_receber_parcelas
           WHERE status = 'RECEBIDA'
             AND data_recebimento IS NOT NULL
             AND data_recebimento::date BETWEEN $1::date AND $2::date`,
          [queryStartDate, queryEndDate],
        ),
        query(
          `SELECT id, valor, status, data_pagamento
           FROM contas_pagar_parcelas
           WHERE status = 'PAGA'
             AND data_pagamento IS NOT NULL
             AND data_pagamento::date BETWEEN $1::date AND $2::date`,
          [queryStartDate, queryEndDate],
        ),
      ]);
    }

    const detailsByDay = {};

    const pushDetail = (date, detail) => {
      if (!date) return;
      if (!detailsByDay[date]) {
        detailsByDay[date] = [];
      }
      detailsByDay[date].push(detail);
    };

    recebidasResult.rows.forEach((row) => {
      const date = toIsoDate(row.data_recebimento);
      const amount = normalizeAmount(row.valor);
      pushDetail(date, {
        id: row.id,
        typeLabel: "Entrada",
        description: "Parcela recebida",
        status: row.status,
        amount,
      });
    });

    pagasResult.rows.forEach((row) => {
      const date = toIsoDate(row.data_pagamento);
      const amount = normalizeAmount(row.valor) * -1;
      pushDetail(date, {
        id: row.id,
        typeLabel: "Saída",
        description: "Parcela paga",
        status: row.status,
        amount,
      });
    });

    const days = Object.keys(detailsByDay || {})
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((date) => {
        const total = detailsByDay[date].reduce(
          (acc, item) => acc + normalizeAmount(item.amount),
          0,
        );
        return { date, total };
      });

    return res.status(200).json({
      month: monthRange.monthLabel,
      selectedDate,
      days,
      detailsByDay,
      startDate: range.startDate,
      endDate: range.endDate,
      monthStartDate: monthRange.startDate,
      monthEndDate: monthRange.endDate,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Erro ao consultar fluxo de caixa do dashboard." });
  }
}
