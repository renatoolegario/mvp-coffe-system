import { query } from "../../../infra/database";
import { decryptIfNeeded } from "../../../utils/crypto";
import { toPerfilCode } from "../../../utils/profile";
import { requireAuthOrAdminMode } from "../../../infra/auth";

const tableMap = [
  {
    key: "usuarios",
    queryText:
      "SELECT id, nome, email, senha, perfil, ativo, criado_em FROM usuarios",
  },
  { key: "clientes", queryText: "SELECT * FROM clientes" },
  { key: "fornecedores", queryText: "SELECT * FROM fornecedores" },
  {
    key: "auxUnidades",
    queryText:
      "SELECT id, codigo, label, is_default FROM aux_unidade ORDER BY is_default DESC, label ASC",
  },
  {
    key: "auxFormasPagamento",
    queryText:
      "SELECT id, codigo, label, ativo FROM aux_forma_pagamento WHERE ativo = true ORDER BY label ASC",
  },
  {
    key: "empresaConfiguracaoEstoque",
    queryText:
      "SELECT chave, label, percentual_min, percentual_max, ordem FROM empresa_configuracao_estoque ORDER BY ordem ASC, percentual_min ASC",
    optional: true,
  },
  {
    key: "insumos",
    queryText: `
      SELECT
        i.*,
        u.codigo AS unidade_codigo,
        u.label AS unidade_label,
        eu.codigo AS estoque_minimo_unidade_codigo,
        eu.label AS estoque_minimo_unidade_label,
        COALESCE(m.saldo_kg, 0) AS saldo_kg,
        COALESCE(m.custo_medio_kg, 0) AS custo_medio_kg
      FROM insumos i
      LEFT JOIN aux_unidade u ON u.id = i.unidade_id
      LEFT JOIN aux_unidade eu ON eu.id = i.estoque_minimo_unidade_id
      LEFT JOIN (
        SELECT
          insumo_id,
          COALESCE(SUM(quantidade_entrada - quantidade_saida), 0) AS saldo_kg,
          CASE
            WHEN COALESCE(SUM(quantidade_entrada), 0) > 0 THEN
              SUM(quantidade_entrada * custo_unitario) /
              NULLIF(SUM(quantidade_entrada), 0)
            ELSE 0
          END AS custo_medio_kg
        FROM movimento_producao
        GROUP BY insumo_id
      ) m ON m.insumo_id = i.id
      ORDER BY i.nome ASC
    `,
  },
  { key: "movimentoProducao", queryText: "SELECT * FROM movimento_producao" },
  {
    key: "movInsumos",
    queryText:
      "SELECT id, insumo_id, tipo_movimento AS tipo, (quantidade_entrada - quantidade_saida) AS quantidade, custo_unitario AS custo_unit, (custo_unitario * (quantidade_entrada - quantidade_saida)) AS custo_total, data_movimentacao AS data, referencia_tipo, referencia_id, obs FROM movimento_producao",
  },
  { key: "producoes", queryText: "SELECT * FROM producao" },
  {
    key: "producaoResultados",
    queryText:
      "SELECT * FROM producao_resultados ORDER BY criado_em ASC, id ASC",
  },
  { key: "detalhesProducao", queryText: "SELECT * FROM detalhes_producao" },
  {
    key: "custosAdicionaisProducao",
    queryText: "SELECT * FROM custos_adicionais_producao",
  },
  { key: "transferencias", queryText: "SELECT * FROM transferencias" },
  { key: "vendas", queryText: "SELECT * FROM vendas" },
  { key: "vendaItens", queryText: "SELECT * FROM venda_itens" },
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
  {
    key: "asaasCobrancas",
    queryText: "SELECT * FROM asaas_cobrancas",
    optional: true,
  },
];

const decodeUsuarios = (rows = []) =>
  rows.map((row) => ({
    ...row,
    nome: decryptIfNeeded(row.nome),
    email: decryptIfNeeded(row.email),
    perfil: toPerfilCode(row.perfil),
  }));

const decodeClientes = (rows = []) =>
  rows.map((row) => ({
    ...row,
    nome: decryptIfNeeded(row.nome),
    email: decryptIfNeeded(row.email),
    cpf_cnpj: decryptIfNeeded(row.cpf_cnpj),
    telefone: decryptIfNeeded(row.telefone),
    endereco: decryptIfNeeded(row.endereco),
  }));

const decodeFornecedores = (rows = []) =>
  rows.map((row) => ({
    ...row,
    razao_social: decryptIfNeeded(row.razao_social),
    email: decryptIfNeeded(row.email),
    cpf_cnpj: decryptIfNeeded(row.cpf_cnpj),
    telefone: decryptIfNeeded(row.telefone),
    endereco: decryptIfNeeded(row.endereco),
  }));

const isRelationMissing = (error) => error?.code === "42P01";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireAuthOrAdminMode(req, res);
  if (!auth) return;

  try {
    const data = {};
    for (const entry of tableMap) {
      try {
        const result = await query(entry.queryText);
        data[entry.key] = result.rows;
      } catch (error) {
        if (entry.optional && isRelationMissing(error)) {
          data[entry.key] = [];
          continue;
        }

        throw error;
      }
    }
    data.usuarios = decodeUsuarios(data.usuarios);
    data.clientes = decodeClientes(data.clientes);
    data.fornecedores = decodeFornecedores(data.fornecedores);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao consultar o banco." });
  }
}
