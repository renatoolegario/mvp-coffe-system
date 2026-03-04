import { query } from "../../../../infra/database";
import { requireAuth } from "../../../../infra/auth";

const toNumber = (value) => Number(value) || 0;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isIsoDate = (value) => ISO_DATE_REGEX.test(String(value || ""));

const toIsoDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const currentMonthRange = () => {
  const now = new Date();
  return {
    startDate: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

const normalizeRange = (startDate, endDate) => {
  if (startDate <= endDate) return { startDate, endDate };
  return { startDate: endDate, endDate: startDate };
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const fallbackRange = currentMonthRange();
  const queryStartDate = isIsoDate(req.query.startDate)
    ? String(req.query.startDate)
    : fallbackRange.startDate;
  const queryEndDate = isIsoDate(req.query.endDate)
    ? String(req.query.endDate)
    : fallbackRange.endDate;
  const { startDate, endDate } = normalizeRange(queryStartDate, queryEndDate);

  try {
    const [
      clientesResult,
      fornecedoresResult,
      vendasResult,
      contasReceberPeriodoResult,
      contasPagarPeriodoResult,
    ] = await Promise.all([
      query("SELECT COUNT(*)::int AS total FROM clientes WHERE ativo = true"),
      query(
        "SELECT COUNT(*)::int AS total FROM fornecedores WHERE ativo = true",
      ),
      query(
        `SELECT COALESCE(SUM(valor_total), 0) AS total
         FROM vendas
         WHERE data_venda::date BETWEEN $1::date AND $2::date`,
        [startDate, endDate],
      ),
      query(
        `SELECT COALESCE(SUM(valor), 0) AS total
         FROM contas_receber_parcelas
         WHERE vencimento::date BETWEEN $1::date AND $2::date`,
        [startDate, endDate],
      ),
      query(
        `SELECT COALESCE(SUM(valor), 0) AS total
         FROM contas_pagar_parcelas
         WHERE vencimento::date BETWEEN $1::date AND $2::date`,
        [startDate, endDate],
      ),
    ]);

    return res.status(200).json({
      clientesAtivos: clientesResult.rows[0]?.total || 0,
      fornecedoresAtivos: fornecedoresResult.rows[0]?.total || 0,
      totalVendas: toNumber(vendasResult.rows[0]?.total),
      totalReceberPeriodo: toNumber(contasReceberPeriodoResult.rows[0]?.total),
      totalPagarPeriodo: toNumber(contasPagarPeriodoResult.rows[0]?.total),
      startDate,
      endDate,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Erro ao consultar resumo do dashboard no banco." });
  }
}
