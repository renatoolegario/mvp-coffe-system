import { query } from "../../../infra/database";

const tableMap = [
  { key: "usuarios", queryText: "SELECT * FROM usuarios" },
  { key: "clientes", queryText: "SELECT * FROM clientes" },
  { key: "fornecedores", queryText: "SELECT * FROM fornecedores" },
  { key: "insumos", queryText: "SELECT * FROM insumos" },
  { key: "movimentoProducao", queryText: "SELECT * FROM movimento_producao" },
  {
    key: "movInsumos",
    queryText:
      "SELECT id, insumo_id, tipo_movimento AS tipo, (quantidade_entrada - quantidade_saida) AS quantidade, custo_unitario AS custo_unit, (custo_unitario * (quantidade_entrada - quantidade_saida)) AS custo_total, data_movimentacao AS data, referencia_tipo, referencia_id, obs FROM movimento_producao",
  },
  { key: "producoes", queryText: "SELECT * FROM producao" },
  { key: "detalhesProducao", queryText: "SELECT * FROM detalhes_producao" },
  {
    key: "custosAdicionaisProducao",
    queryText: "SELECT * FROM custos_adicionais_producao",
  },
  { key: "vendas", queryText: "SELECT * FROM vendas" },
  { key: "vendaDetalhes", queryText: "SELECT * FROM venda_detalhes" },
  { key: "contasPagar", queryText: "SELECT * FROM contas_pagar" },
  {
    key: "contasPagarParcelas",
    queryText: "SELECT * FROM contas_pagar_parcelas",
  },
  { key: "contasReceber", queryText: "SELECT * FROM contas_receber" },
  {
    key: "contasReceberParcelas",
    queryText: "SELECT * FROM contas_receber_parcelas",
  },
];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = {};
    for (const entry of tableMap) {
      const result = await query(entry.queryText);
      data[entry.key] = result.rows;
    }
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao consultar o banco." });
  }
}
