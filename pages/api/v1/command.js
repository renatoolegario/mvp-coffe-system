import { query, withTransaction } from "../../../infra/database";
import { conversaoCripto } from "../../../utils/crypto";

const insertRow = async (client, table, columns, data) => {
  const values = columns.map((column) => data[column] ?? null);
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const columnList = columns.join(", ");
  await client.query(
    `INSERT INTO ${table} (${columnList}) VALUES (${placeholders})`,
    values,
  );
};

const getNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeInsumoTipo = (tipo) =>
  tipo === "FISICO" ? "FISICO" : "CONSUMIVEL";

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
            await conversaoCripto(payload.senha),
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
      case "updateCliente":
        await query(
          "UPDATE clientes SET nome = $2, cpf_cnpj = $3, telefone = $4, endereco = $5 WHERE id = $1",
          [
            payload.id,
            payload.nome,
            payload.cpf_cnpj,
            payload.telefone,
            payload.endereco,
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
          "INSERT INTO insumos (id, nome, unidade, estoque_minimo, estoque_minimo_unidade, kg_por_saco, preco_kg, tipo, ativo, criado_em) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
          [
            payload.id,
            payload.nome,
            payload.unidade,
            payload.estoque_minimo,
            payload.estoque_minimo_unidade,
            payload.kg_por_saco,
            getNumber(payload.preco_kg),
            normalizeInsumoTipo(payload.tipo),
            payload.ativo,
            payload.criado_em,
          ],
        );
        break;
      case "updateInsumo":
        await query(
          "UPDATE insumos SET nome = $2, estoque_minimo = $3, estoque_minimo_unidade = $4, kg_por_saco = $5, tipo = $6 WHERE id = $1",
          [
            payload.id,
            payload.nome,
            getNumber(payload.estoque_minimo),
            payload.estoque_minimo_unidade === "saco" ? "saco" : "kg",
            getNumber(payload.kg_por_saco) || 1,
            normalizeInsumoTipo(payload.tipo),
          ],
        );
        break;
      case "addEntradaInsumos":
        await withTransaction(async (client) => {
          await insertRow(
            client,
            "movimento_producao",
            [
              "id",
              "insumo_id",
              "tipo_movimento",
              "custo_unitario",
              "quantidade_entrada",
              "quantidade_saida",
              "data_movimentacao",
              "referencia_tipo",
              "referencia_id",
              "producao_id",
              "obs",
            ],
            payload.movimento,
          );

          for (const contaPagar of payload.contasPagar || []) {
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
                "venda_id",
              ],
              contaPagar,
            );
          }

          for (const parcela of payload.parcelas || []) {
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
                "producao_id",
              ],
              parcela,
            );
          }
        });
        break;
      case "createProducao":
        await withTransaction(async (client) => {
          if (!payload?.detalhes?.length) {
            throw new Error("A produção exige ao menos um insumo.");
          }

          await insertRow(
            client,
            "producao",
            [
              "id",
              "data_producao",
              "insumo_final_id",
              "status",
              "modo_geracao",
              "taxa_conversao_planejada",
              "peso_previsto",
              "obs",
              "anexo_base64",
              "custo_total_previsto",
            ],
            payload.producao,
          );

          for (const detalhe of payload.detalhes) {
            await insertRow(
              client,
              "detalhes_producao",
              [
                "id",
                "producao_id",
                "insumo_id",
                "quantidade_kg",
                "custo_unitario_previsto",
                "custo_total_previsto",
              ],
              detalhe,
            );

            await insertRow(
              client,
              "movimento_producao",
              [
                "id",
                "insumo_id",
                "tipo_movimento",
                "custo_unitario",
                "quantidade_entrada",
                "quantidade_saida",
                "data_movimentacao",
                "referencia_tipo",
                "referencia_id",
                "producao_id",
                "obs",
              ],
              {
                id: detalhe.movimento_id,
                insumo_id: detalhe.insumo_id,
                tipo_movimento: "SAIDA_PRODUCAO",
                custo_unitario: detalhe.custo_unitario_previsto,
                quantidade_entrada: 0,
                quantidade_saida: detalhe.quantidade_kg,
                data_movimentacao: payload.producao.data_producao,
                referencia_tipo: "producao",
                referencia_id: payload.producao.id,
                producao_id: payload.producao.id,
                obs: payload.producao.obs || "",
              },
            );
          }
        });
        break;
      case "confirmarRetornoProducao":
        await withTransaction(async (client) => {
          const producaoResult = await client.query(
            "SELECT * FROM producao WHERE id = $1 FOR UPDATE",
            [payload.producao_id],
          );
          const producao = producaoResult.rows[0];
          if (!producao || Number(producao.status) !== 1) {
            throw new Error("Produção não encontrada ou já finalizada.");
          }

          const detalhesResult = await client.query(
            "SELECT dp.*, i.preco_kg FROM detalhes_producao dp JOIN insumos i ON i.id = dp.insumo_id WHERE producao_id = $1",
            [payload.producao_id],
          );

          const custoInsumos = detalhesResult.rows.reduce(
            (acc, item) =>
              acc + getNumber(item.quantidade_kg) * getNumber(item.preco_kg),
            0,
          );
          const custosAdicionais = payload.custos_adicionais || [];
          const custoAdicionalTotal = custosAdicionais.reduce(
            (acc, item) => acc + getNumber(item.valor),
            0,
          );
          const custoTotalReal = custoInsumos + custoAdicionalTotal;
          const pesoReal = getNumber(payload.peso_real);
          const custoUnitarioReal =
            pesoReal > 0 ? custoTotalReal / pesoReal : 0;

          await client.query(
            "UPDATE producao SET status = 2, peso_real = $2, taxa_conversao_real = $3, anexo_base64 = $4, custo_total_real = $5, custo_unitario_real = $6, obs = COALESCE($7, obs) WHERE id = $1",
            [
              payload.producao_id,
              pesoReal,
              payload.taxa_conversao_real,
              payload.anexo_base64,
              custoTotalReal,
              custoUnitarioReal,
              payload.obs,
            ],
          );

          for (const custo of custosAdicionais) {
            await insertRow(
              client,
              "custos_adicionais_producao",
              [
                "id",
                "producao_id",
                "fornecedor_id",
                "descricao",
                "valor",
                "status_pagamento",
              ],
              {
                id: custo.id,
                producao_id: payload.producao_id,
                fornecedor_id: custo.fornecedor_id,
                descricao: custo.descricao,
                valor: custo.valor,
                status_pagamento: custo.status_pagamento || "PENDENTE",
              },
            );

            if (custo.fornecedor_id) {
              await insertRow(
                client,
                "contas_pagar",
                [
                  "id",
                  "fornecedor_id",
                  "origem_tipo",
                  "origem_id",
                  "producao_id",
                  "valor_total",
                  "data_emissao",
                  "status",
                ],
                {
                  id: custo.conta_pagar_id,
                  fornecedor_id: custo.fornecedor_id,
                  origem_tipo: "custo_adicional_producao",
                  origem_id: payload.producao_id,
                  producao_id: payload.producao_id,
                  valor_total: custo.valor,
                  data_emissao: payload.data_confirmacao,
                  status:
                    custo.status_pagamento === "A_VISTA" ? "PAGO" : "ABERTO",
                },
              );

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
                {
                  id: custo.parcela_id,
                  conta_pagar_id: custo.conta_pagar_id,
                  parcela_num: 1,
                  vencimento: payload.data_confirmacao,
                  valor: custo.valor,
                  status:
                    custo.status_pagamento === "A_VISTA" ? "PAGA" : "ABERTA",
                  data_pagamento:
                    custo.status_pagamento === "A_VISTA"
                      ? payload.data_confirmacao
                      : null,
                  forma_pagamento:
                    custo.status_pagamento === "A_VISTA"
                      ? custo.forma_pagamento || "Transferência"
                      : null,
                  producao_id: payload.producao_id,
                },
              );
            }
          }

          await insertRow(
            client,
            "movimento_producao",
            [
              "id",
              "insumo_id",
              "tipo_movimento",
              "custo_unitario",
              "quantidade_entrada",
              "quantidade_saida",
              "data_movimentacao",
              "referencia_tipo",
              "referencia_id",
              "producao_id",
              "obs",
            ],
            {
              id: payload.movimento_entrada_id,
              insumo_id: producao.insumo_final_id,
              tipo_movimento: "ENTRADA_PRODUCAO",
              custo_unitario: custoUnitarioReal,
              quantidade_entrada: pesoReal,
              quantidade_saida: 0,
              data_movimentacao: payload.data_confirmacao,
              referencia_tipo: "producao",
              referencia_id: payload.producao_id,
              producao_id: payload.producao_id,
              obs: payload.obs || "",
            },
          );

          const saldoResult = await client.query(
            "SELECT COALESCE(SUM(quantidade_entrada - quantidade_saida), 0) AS saldo FROM movimento_producao WHERE insumo_id = $1",
            [producao.insumo_final_id],
          );
          const insumoAtualResult = await client.query(
            "SELECT preco_kg FROM insumos WHERE id = $1",
            [producao.insumo_final_id],
          );
          const saldoAtual = getNumber(saldoResult.rows[0]?.saldo) - pesoReal;
          const precoAtual = getNumber(insumoAtualResult.rows[0]?.preco_kg);
          const novoSaldo = saldoAtual + pesoReal;
          const precoMedioNovo =
            novoSaldo > 0
              ? (saldoAtual * precoAtual + pesoReal * custoUnitarioReal) /
                novoSaldo
              : custoUnitarioReal;

          await client.query("UPDATE insumos SET preco_kg = $2 WHERE id = $1", [
            producao.insumo_final_id,
            precoMedioNovo,
          ]);
        });
        break;
      case "deleteProducao":
        await withTransaction(async (client) => {
          await client.query("DELETE FROM producao WHERE id = $1", [
            payload.producao_id,
          ]);
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
              "data_programada_entrega",
              "data_entrega",
              "status_entrega",
              "obs",
            ],
            payload.venda,
          );

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
                "producao_id",
              ],
              parcela,
            );
          }

          for (const detalhe of payload.vendaDetalhes || []) {
            await insertRow(
              client,
              "venda_detalhes",
              [
                "id",
                "venda_id",
                "parcela_id",
                "tipo_evento",
                "descricao",
                "valor",
                "data_evento",
              ],
              detalhe,
            );
          }
        });
        break;
      case "confirmarEntregaVenda":
        await withTransaction(async (client) => {
          await client.query(
            "UPDATE vendas SET status_entrega = $2, data_entrega = $3 WHERE id = $1",
            [payload.venda_id, "ENTREGUE", payload.data_entrega],
          );

          for (const contaPagar of payload.contasPagar || []) {
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
                "venda_id",
              ],
              contaPagar,
            );
          }

          for (const parcela of payload.parcelas || []) {
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
                "producao_id",
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
        await withTransaction(async (client) => {
          await client.query(
            "UPDATE contas_receber_parcelas SET status = $2, data_recebimento = $3, forma_recebimento = $4 WHERE id = $1",
            [
              payload.id,
              payload.status,
              payload.data_recebimento,
              payload.forma_recebimento,
            ],
          );

          if (payload.ajuste && getNumber(payload.ajuste.valor) !== 0) {
            await insertRow(
              client,
              "venda_detalhes",
              [
                "id",
                "venda_id",
                "parcela_id",
                "tipo_evento",
                "descricao",
                "valor",
                "data_evento",
              ],
              {
                id: payload.ajuste.id,
                venda_id: payload.ajuste.venda_id,
                parcela_id: payload.id,
                tipo_evento: payload.ajuste.tipo_evento,
                descricao: payload.ajuste.descricao,
                valor: payload.ajuste.valor,
                data_evento: payload.data_recebimento,
              },
            );
          }
        });
        break;
      default:
        return res.status(400).json({ error: "Ação não reconhecida." });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao executar comando." });
  }
}
