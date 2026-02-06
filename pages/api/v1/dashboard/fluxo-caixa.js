import { query } from "../../../../infra/database";

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

const monthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    monthLabel: `${start.getFullYear()}-${`${start.getMonth() + 1}`.padStart(2, "0")}`,
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    today: toIsoDate(now),
  };
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { monthLabel, startDate, endDate, today } = monthRange();

  try {
    const [recebidasResult, pagasResult] = await Promise.all([
      query(
        `SELECT id, valor, status, data_recebimento
         FROM contas_receber_parcelas
         WHERE status = 'RECEBIDA'
           AND data_recebimento IS NOT NULL
           AND data_recebimento::date BETWEEN $1::date AND $2::date`,
        [startDate, endDate],
      ),
      query(
        `SELECT id, valor, status, data_pagamento
         FROM contas_pagar_parcelas
         WHERE status = 'PAGA'
           AND data_pagamento IS NOT NULL
           AND data_pagamento::date BETWEEN $1::date AND $2::date`,
        [startDate, endDate],
      ),
    ]);

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

    const days = Object.keys(detailsByDay)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((date) => {
        const total = detailsByDay[date].reduce(
          (acc, item) => acc + normalizeAmount(item.amount),
          0,
        );
        return { date, total };
      });

    return res.status(200).json({
      month: monthLabel,
      selectedDate: today,
      days,
      detailsByDay,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Erro ao consultar fluxo de caixa do dashboard." });
  }
}
