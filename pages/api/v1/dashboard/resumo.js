import { query } from "../../../../infra/database";

const toNumber = (value) => Number(value) || 0;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const [
      clientesResult,
      fornecedoresResult,
      vendasResult,
      contasReceberAbertasResult,
      contasPagarAbertasResult,
    ] = await Promise.all([
      query("SELECT COUNT(*)::int AS total FROM clientes WHERE ativo = true"),
      query("SELECT COUNT(*)::int AS total FROM fornecedores WHERE ativo = true"),
      query("SELECT COALESCE(SUM(valor_total), 0) AS total FROM vendas"),
      query(
        "SELECT COALESCE(SUM(valor), 0) AS total FROM contas_receber_parcelas WHERE status = 'ABERTA'",
      ),
      query(
        "SELECT COALESCE(SUM(valor), 0) AS total FROM contas_pagar_parcelas WHERE status = 'ABERTA'",
      ),
    ]);

    return res.status(200).json({
      clientesAtivos: clientesResult.rows[0]?.total || 0,
      fornecedoresAtivos: fornecedoresResult.rows[0]?.total || 0,
      totalVendas: toNumber(vendasResult.rows[0]?.total),
      totalReceberEmAberto: toNumber(contasReceberAbertasResult.rows[0]?.total),
      totalPagarEmAberto: toNumber(contasPagarAbertasResult.rows[0]?.total),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Erro ao consultar resumo do dashboard no banco." });
  }
}
