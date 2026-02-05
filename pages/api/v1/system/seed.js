import seedRaw from "../../../../docs/seed.json";
import { normalizeSeedData } from "../../../../utils/seed";
import { withTransaction } from "../../../../infra/database";

const tableList = [
  "contas_receber_parcelas",
  "contas_receber",
  "contas_pagar_parcelas",
  "contas_pagar",
  "vendas",
  "ordem_producao",
  "entrada_insumos",
  "mov_lotes",
  "mov_insumos",
  "tipos_cafe",
  "insumos",
  "fornecedores",
  "clientes",
  "usuarios",
];

const insertRow = async (client, table, columns, data) => {
  const values = columns.map((column) => data[column] ?? null);
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  await client.query(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
    values,
  );
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const seedData = normalizeSeedData(seedRaw);

  try {
    await withTransaction(async (client) => {
      await client.query(
        `TRUNCATE ${tableList.join(", ")} RESTART IDENTITY CASCADE`,
      );

      for (const usuario of seedData.usuarios) {
        await insertRow(
          client,
          "usuarios",
          ["id", "nome", "email", "senha", "perfil", "ativo", "criado_em"],
          usuario,
        );
      }

      for (const cliente of seedData.clientes) {
        await insertRow(
          client,
          "clientes",
          [
            "id",
            "nome",
            "cpf_cnpj",
            "telefone",
            "endereco",
            "ativo",
            "criado_em",
          ],
          cliente,
        );
      }

      for (const fornecedor of seedData.fornecedores) {
        await insertRow(
          client,
          "fornecedores",
          [
            "id",
            "razao_social",
            "cpf_cnpj",
            "telefone",
            "endereco",
            "ativo",
            "criado_em",
          ],
          fornecedor,
        );
      }

      for (const insumo of seedData.insumos) {
        await insertRow(
          client,
          "insumos",
          [
            "id",
            "nome",
            "unidade",
            "estoque_minimo",
            "kg_por_saco",
            "ativo",
            "criado_em",
          ],
          insumo,
        );
      }

      for (const tipoCafe of seedData.tiposCafe) {
        await insertRow(
          client,
          "tipos_cafe",
          [
            "id",
            "nome",
            "insumo_id",
            "rendimento_percent",
            "margem_lucro_percent",
            "ativo",
          ],
          tipoCafe,
        );
      }

      for (const entrada of seedData.entradasInsumos) {
        await insertRow(
          client,
          "entrada_insumos",
          [
            "id",
            "fornecedor_id",
            "data_entrada",
            "valor_total",
            "forma_pagamento",
            "parcelas_qtd",
            "obs",
            "status",
          ],
          entrada,
        );
      }

      for (const movimento of seedData.movInsumos) {
        await insertRow(
          client,
          "mov_insumos",
          [
            "id",
            "insumo_id",
            "tipo",
            "quantidade",
            "custo_unit",
            "custo_total",
            "data",
            "referencia_tipo",
            "referencia_id",
            "obs",
          ],
          movimento,
        );
      }

      for (const movimento of seedData.movLotes) {
        await insertRow(
          client,
          "mov_lotes",
          [
            "id",
            "tipo_cafe_id",
            "tipo",
            "quantidade",
            "custo_unit",
            "custo_total",
            "data",
            "referencia_tipo",
            "referencia_id",
            "obs",
          ],
          movimento,
        );
      }

      for (const ordem of seedData.ordensProducao) {
        await insertRow(
          client,
          "ordem_producao",
          [
            "id",
            "data_fabricacao",
            "tipo_cafe_id",
            "quantidade_gerada",
            "quantidade_insumo",
            "insumo_id",
            "custo_total",
            "status",
            "obs",
          ],
          ordem,
        );
      }

      for (const venda of seedData.vendas) {
        await insertRow(
          client,
          "vendas",
          [
            "id",
            "cliente_id",
            "data_venda",
            "valor_total",
            "parcelas_qtd",
            "valor_negociado",
            "status",
            "obs",
          ],
          venda,
        );
      }

      for (const contaPagar of seedData.contasPagar) {
        await insertRow(
          client,
          "contas_pagar",
          [
            "id",
            "fornecedor_id",
            "origem_tipo",
            "origem_id",
            "valor_total",
            "data_emissao",
            "status",
          ],
          contaPagar,
        );
      }

      for (const parcela of seedData.contasPagarParcelas) {
        await insertRow(
          client,
          "contas_pagar_parcelas",
          [
            "id",
            "conta_pagar_id",
            "parcela_num",
            "vencimento",
            "valor",
            "status",
            "data_pagamento",
            "forma_pagamento",
          ],
          parcela,
        );
      }

      for (const contaReceber of seedData.contasReceber) {
        await insertRow(
          client,
          "contas_receber",
          [
            "id",
            "cliente_id",
            "origem_tipo",
            "origem_id",
            "valor_total",
            "data_emissao",
            "status",
          ],
          contaReceber,
        );
      }

      for (const parcela of seedData.contasReceberParcelas) {
        await insertRow(
          client,
          "contas_receber_parcelas",
          [
            "id",
            "conta_receber_id",
            "parcela_num",
            "vencimento",
            "valor",
            "status",
            "data_recebimento",
            "forma_recebimento",
          ],
          parcela,
        );
      }
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao popular o banco." });
  }
}
