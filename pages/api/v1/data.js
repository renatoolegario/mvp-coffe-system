import { query } from "../../../infra/database";

const tableMap = [
  { key: "usuarios", table: "usuarios" },
  { key: "clientes", table: "clientes" },
  { key: "fornecedores", table: "fornecedores" },
  { key: "insumos", table: "insumos" },
  { key: "tiposCafe", table: "tipos_cafe" },
  { key: "movInsumos", table: "mov_insumos" },
  { key: "movLotes", table: "mov_lotes" },
  { key: "entradasInsumos", table: "entrada_insumos" },
  { key: "ordensProducao", table: "ordem_producao" },
  { key: "vendas", table: "vendas" },
  { key: "contasPagar", table: "contas_pagar" },
  { key: "contasPagarParcelas", table: "contas_pagar_parcelas" },
  { key: "contasReceber", table: "contas_receber" },
  { key: "contasReceberParcelas", table: "contas_receber_parcelas" },
];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = {};
    for (const entry of tableMap) {
      const result = await query(`SELECT * FROM ${entry.table}`);
      data[entry.key] = result.rows;
    }
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao consultar o banco." });
  }
}
