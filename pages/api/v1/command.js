import { query, withTransaction } from "../../../infra/database";

const insertRow = async (client, table, columns, data) => {
  const values = columns.map((column) => data[column] ?? null);
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const columnList = columns.join(", ");
  await client.query(
    `INSERT INTO ${table} (${columnList}) VALUES (${placeholders})`,
    values,
  );
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, payload } = req.body || {};

  try {
    switch (action) {
      case "addUsuario":
        await query(
          "INSERT INTO usuarios (id, nome, email, senha, perfil, ativo, criado_em) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [
            payload.id,
            payload.nome,
            payload.email,
            payload.senha,
            payload.perfil,
            payload.ativo,
            payload.criado_em,
          ],
        );
        break;
      case "toggleUsuario":
        await query("UPDATE usuarios SET ativo = $2 WHERE id = $1", [
          payload.id,
          payload.ativo,
        ]);
        break;
      case "addCliente":
        await query(
          "INSERT INTO clientes (id, nome, cpf_cnpj, telefone, endereco, ativo, criado_em) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [
            payload.id,
            payload.nome,
            payload.cpf_cnpj,
            payload.telefone,
            payload.endereco,
            payload.ativo,
            payload.criado_em,
          ],
        );
        break;
      case "addFornecedor":
        await query(
          "INSERT INTO fornecedores (id, razao_social, cpf_cnpj, telefone, endereco, ativo, criado_em) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [
            payload.id,
            payload.razao_social,
            payload.cpf_cnpj,
            payload.telefone,
            payload.endereco,
            payload.ativo,
            payload.criado_em,
          ],
        );
        break;
      case "addInsumo":
        await query(
          "INSERT INTO insumos (id, nome, unidade, estoque_minimo, estoque_minimo_unidade, kg_por_saco, ativo, criado_em) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
          [
            payload.id,
            payload.nome,
            payload.unidade,
            payload.estoque_minimo,
            payload.estoque_minimo_unidade,
            payload.kg_por_saco,
            payload.ativo,
            payload.criado_em,
          ],
        );
        break;
      case "addTipoCafe":
        await query(
          "INSERT INTO tipos_cafe (id, nome, insumo_id, rendimento_percent, margem_lucro_percent, ativo) VALUES ($1, $2, $3, $4, $5, $6)",
          [
            payload.id,
            payload.nome,
            payload.insumo_id,
            payload.rendimento_percent,
            payload.margem_lucro_percent,
            payload.ativo,
          ],
        );
        break;
      case "addEntradaInsumos":
        await withTransaction(async (client) => {
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
            payload.entrada,
          );

          for (const movimento of payload.movimentos) {
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
            payload.contaPagar,
          );

          for (const parcela of payload.parcelas) {
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
        });
        break;
      case "addOrdemProducao":
        await withTransaction(async (client) => {
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
            payload.ordem,
          );

          for (const movimento of payload.movInsumos) {
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
            payload.movLotes,
          );
        });
        break;
      case "addVenda":
        await withTransaction(async (client) => {
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
            payload.venda,
          );

          for (const movimento of payload.movLotes) {
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
            payload.contaReceber,
          );

          for (const parcela of payload.parcelas) {
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
        break;
      case "marcarParcelaPaga":
        await query(
          "UPDATE contas_pagar_parcelas SET status = $2, data_pagamento = $3, forma_pagamento = $4 WHERE id = $1",
          [
            payload.id,
            payload.status,
            payload.data_pagamento,
            payload.forma_pagamento,
          ],
        );
        break;
      case "marcarParcelaRecebida":
        await query(
          "UPDATE contas_receber_parcelas SET status = $2, data_recebimento = $3, forma_recebimento = $4 WHERE id = $1",
          [
            payload.id,
            payload.status,
            payload.data_recebimento,
            payload.forma_recebimento,
          ],
        );
        break;
      default:
        return res.status(400).json({ error: "Ação não reconhecida." });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao executar comando." });
  }
}
