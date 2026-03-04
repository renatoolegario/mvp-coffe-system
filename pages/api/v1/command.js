import { query, withTransaction } from "../../../infra/database";
import { encryptIfNeeded } from "../../../utils/crypto";
import { toPerfilCode } from "../../../utils/profile";
import { isAdmin, requireAuth } from "../../../infra/auth";

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

const resolveUnidadeId = async (client, unidadeInput, fallbackCode = "KG") => {
  const input = String(unidadeInput || "").trim().toUpperCase();
  if (/^\d+$/.test(input)) {
    return Number(input);
  }

  if (input) {
    const byCode = await client.query(
      "SELECT id FROM aux_unidade WHERE codigo = $1 LIMIT 1",
      [input],
    );
    if (byCode.rows[0]) return Number(byCode.rows[0].id);
  }

  const fallback = await client.query(
    "SELECT id FROM aux_unidade WHERE codigo = $1 LIMIT 1",
    [fallbackCode],
  );
  return Number(fallback.rows[0]?.id || 1);
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const { action, payload } = req.body || {};

  try {
    switch (action) {
      case "addUsuario":
        {
          if (!isAdmin(auth)) {
            return res
              .status(403)
              .json({ error: "Apenas administradores podem cadastrar usuários." });
          }

          const normalizedEmail = String(payload.email || "")
            .trim()
            .toLowerCase();
          const encryptedEmail = encryptIfNeeded(normalizedEmail);

          const existingUserResult = await query(
            "SELECT id FROM usuarios WHERE email = $1 LIMIT 1",
            [encryptedEmail],
          );

          if (existingUserResult.rows[0]) {
            return res
              .status(409)
              .json({ error: "Já existe um usuário com esse email." });
          }

          await query(
            "INSERT INTO usuarios (id, nome, email, senha, perfil, ativo, criado_em) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [
              payload.id,
              encryptIfNeeded(payload.nome),
              encryptedEmail,
              encryptIfNeeded(payload.senha),
              toPerfilCode(payload.perfil),
              payload.ativo,
              payload.criado_em,
            ],
          );
        }
        break;
      case "toggleUsuario":
        if (!isAdmin(auth)) {
          return res
            .status(403)
            .json({ error: "Apenas administradores podem alterar usuários." });
        }

        await query("UPDATE usuarios SET ativo = $2 WHERE id = $1", [
          payload.id,
          payload.ativo,
        ]);
        break;
      case "addCliente":
        await query(
          "INSERT INTO clientes (id, nome, cpf_cnpj, telefone, endereco, ativo, criado_em, protegido) VALUES ($1, $2, $3, $4, $5, $6, $7, false)",
          [
            payload.id,
            encryptIfNeeded(payload.nome),
            encryptIfNeeded(payload.cpf_cnpj),
            encryptIfNeeded(payload.telefone),
            encryptIfNeeded(payload.endereco),
            payload.ativo,
            payload.criado_em,
          ],
        );
        break;
      case "updateCliente":
        {
          const clienteResult = await query(
            "SELECT protegido FROM clientes WHERE id = $1 LIMIT 1",
            [payload.id],
          );
          if (clienteResult.rows[0]?.protegido) {
            return res.status(403).json({
              error: "Cliente Balcão é protegido e só pode ser alterado por migration.",
            });
          }
        }

        await query(
          "UPDATE clientes SET nome = $2, cpf_cnpj = $3, telefone = $4, endereco = $5 WHERE id = $1",
          [
            payload.id,
            encryptIfNeeded(payload.nome),
            encryptIfNeeded(payload.cpf_cnpj),
            encryptIfNeeded(payload.telefone),
            encryptIfNeeded(payload.endereco),
          ],
        );
        break;
      case "addFornecedor":
        await query(
          "INSERT INTO fornecedores (id, razao_social, cpf_cnpj, telefone, endereco, ativo, criado_em) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [
            payload.id,
            encryptIfNeeded(payload.razao_social),
            encryptIfNeeded(payload.cpf_cnpj),
            encryptIfNeeded(payload.telefone),
            encryptIfNeeded(payload.endereco),
            payload.ativo,
            payload.criado_em,
          ],
        );
        break;
      case "addInsumo":
        await withTransaction(async (client) => {
          const unidadeId = await resolveUnidadeId(
            client,
            payload.unidade_id || payload.unidade_codigo || payload.unidade,
          );
          const estoqueMinimoUnidadeId = await resolveUnidadeId(
            client,
            payload.estoque_minimo_unidade_id ||
              payload.estoque_minimo_unidade_codigo ||
              payload.estoque_minimo_unidade ||
              payload.unidade_id ||
              payload.unidade_codigo ||
              payload.unidade,
          );

          await client.query(
            `
            INSERT INTO insumos (
              id,
              nome,
              estoque_minimo,
              kg_por_saco,
              ativo,
              criado_em,
              pode_ser_insumo,
              pode_ser_produzivel,
              pode_ser_vendido,
              unidade_id,
              estoque_minimo_unidade_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `,
            [
              payload.id,
              payload.nome,
              getNumber(payload.estoque_minimo),
              getNumber(payload.kg_por_saco) || 1,
              payload.ativo,
              payload.criado_em,
              payload.pode_ser_insumo ?? true,
              payload.pode_ser_produzivel ?? false,
              payload.pode_ser_vendido ?? false,
              unidadeId,
              estoqueMinimoUnidadeId,
            ],
          );
        });
        break;
      case "updateInsumo":
        await withTransaction(async (client) => {
          const unidadeId = await resolveUnidadeId(
            client,
            payload.unidade_id || payload.unidade_codigo || payload.unidade,
          );
          const estoqueMinimoUnidadeId = await resolveUnidadeId(
            client,
            payload.estoque_minimo_unidade_id ||
              payload.estoque_minimo_unidade_codigo ||
              payload.estoque_minimo_unidade ||
              payload.unidade_id ||
              payload.unidade_codigo ||
              payload.unidade,
          );

          await client.query(
            `
            UPDATE insumos
            SET nome = $2,
                estoque_minimo = $3,
                kg_por_saco = $4,
                pode_ser_insumo = $5,
                pode_ser_produzivel = $6,
                pode_ser_vendido = $7,
                unidade_id = $8,
                estoque_minimo_unidade_id = $9
            WHERE id = $1
            `,
            [
              payload.id,
              payload.nome,
              getNumber(payload.estoque_minimo),
              getNumber(payload.kg_por_saco) || 1,
              payload.pode_ser_insumo ?? true,
              payload.pode_ser_produzivel ?? false,
              payload.pode_ser_vendido ?? false,
              unidadeId,
              estoqueMinimoUnidadeId,
            ],
          );
        });
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
                tipo_movimento: "RESERVA_PRODUCAO",
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
          if (!producao || producao.status !== "PENDENTE") {
            throw new Error("Produção não encontrada ou já finalizada.");
          }

          const detalhesResult = await client.query(
            "SELECT dp.* FROM detalhes_producao dp WHERE producao_id = $1",
            [payload.producao_id],
          );

          const custoInsumos = detalhesResult.rows.reduce(
            (acc, item) =>
              acc +
              getNumber(item.quantidade_kg) *
                getNumber(item.custo_unitario_previsto),
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
            "UPDATE producao SET status = 'CONCLUIDA', peso_real = $2, anexo_base64 = $3, custo_total_real = $4, custo_unitario_real = $5, obs = COALESCE($6, obs) WHERE id = $1",
            [
              payload.producao_id,
              pesoReal,
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
        });
        break;
      case "deleteProducao":
        await withTransaction(async (client) => {
          await client.query("DELETE FROM producao WHERE id = $1", [
            payload.producao_id,
          ]);
        });
        break;
      case "cancelarProducao":
        await withTransaction(async (client) => {
          await client.query("UPDATE producao SET status = 'CANCELADA' WHERE id = $1", [
            payload.producao_id,
          ]);
          for (const estorno of payload.estornos || []) {
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
              estorno
            );
          }
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
              "tipo_pagamento",
              "forma_pagamento",
              "desconto_tipo",
              "desconto_valor",
              "desconto_descricao",
              "acrescimo_tipo",
              "acrescimo_valor",
              "acrescimo_descricao",
            ],
            payload.venda,
          );

          for (const item of payload.itens || []) {
            await insertRow(
              client,
              "venda_itens",
              [
                "id",
                "venda_id",
                "insumo_id",
                "quantidade_kg",
                "quantidade_informada",
                "unidade_id",
                "kg_por_saco",
                "preco_unitario",
                "valor_total",
                "criado_em",
              ],
              item,
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

          for (const parcela of payload.parcelas || []) {
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
                "valor_programado",
                "valor_recebido",
                "forma_recebimento_real",
                "motivo_diferenca",
                "acao_diferenca",
                "origem_recebimento",
                "fornecedor_destino_id",
                "comprovante_url",
                "observacao_recebimento",
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
          const valorRecebido = getNumber(payload.valor_recebido);
          const valorProgramado =
            getNumber(payload.valor_programado) || getNumber(payload.valor);
          const diferenca = Number((valorProgramado - valorRecebido).toFixed(2));

          await client.query(
            `
            UPDATE contas_receber_parcelas
            SET status = $2,
                data_recebimento = $3,
                forma_recebimento = $4,
                valor_programado = $5,
                valor_recebido = $6,
                forma_recebimento_real = $7,
                motivo_diferenca = $8,
                acao_diferenca = $9,
                origem_recebimento = $10,
                fornecedor_destino_id = $11,
                comprovante_url = $12,
                observacao_recebimento = $13
            WHERE id = $1
            `,
            [
              payload.id,
              payload.status,
              payload.data_recebimento,
              payload.forma_recebimento,
              valorProgramado,
              valorRecebido || null,
              payload.forma_recebimento_real || payload.forma_recebimento,
              payload.motivo_diferenca || null,
              payload.acao_diferenca || null,
              payload.origem_recebimento || "NORMAL",
              payload.fornecedor_destino_id || null,
              payload.comprovante_url || null,
              payload.observacao_recebimento || null,
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

          if (diferenca > 0 && payload.acao_diferenca === "JOGAR_PROXIMA") {
            const proximaParcelaResult = await client.query(
              `
              SELECT id, valor, valor_programado
              FROM contas_receber_parcelas
              WHERE conta_receber_id = $1
                AND parcela_num > $2
              ORDER BY parcela_num ASC
              LIMIT 1
              `,
              [payload.conta_receber_id, payload.parcela_num],
            );

            const proximaParcela = proximaParcelaResult.rows[0];
            if (proximaParcela) {
              const baseValor =
                getNumber(proximaParcela.valor_programado) ||
                getNumber(proximaParcela.valor);
              await client.query(
                `
                UPDATE contas_receber_parcelas
                SET valor = $2,
                    valor_programado = $2
                WHERE id = $1
                `,
                [
                  proximaParcela.id,
                  Number((baseValor + diferenca).toFixed(2)),
                ],
              );
            }
          }

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

          for (const parcelaPagar of payload.parcelasPagar || []) {
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
              parcelaPagar,
            );
          }
        });
        break;
      case "createTransferencia":
        await withTransaction(async (client) => {
          const { transferencia, movimento_origem_id, movimento_destino_id } =
            payload;

          const unidadeOperacaoId = await resolveUnidadeId(
            client,
            transferencia.unidade_operacao_id || transferencia.unidade_codigo,
          );

          const transferenciaData = {
            ...transferencia,
            unidade_operacao_id: unidadeOperacaoId,
          };

          await insertRow(
            client,
            "transferencias",
            [
              "id",
              "origem_id",
              "destino_id",
              "quantidade_kg",
              "custo_unitario",
              "data_transferencia",
              "obs",
              "unidade_operacao_id",
              "quantidade_informada",
              "kg_por_saco_informado",
            ],
            transferenciaData,
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
              id: movimento_origem_id,
              insumo_id: transferenciaData.origem_id,
              tipo_movimento: "TRANSFERENCIA_SAIDA",
              custo_unitario: transferenciaData.custo_unitario,
              quantidade_entrada: 0,
              quantidade_saida: transferenciaData.quantidade_kg,
              data_movimentacao: transferenciaData.data_transferencia,
              referencia_tipo: "transferencia",
              referencia_id: transferenciaData.id,
              producao_id: null,
              obs: transferenciaData.obs || "",
            },
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
              id: movimento_destino_id,
              insumo_id: transferenciaData.destino_id,
              tipo_movimento: "TRANSFERENCIA_ENTRADA",
              custo_unitario: transferenciaData.custo_unitario,
              quantidade_entrada: transferenciaData.quantidade_kg,
              quantidade_saida: 0,
              data_movimentacao: transferenciaData.data_transferencia,
              referencia_tipo: "transferencia",
              referencia_id: transferenciaData.id,
              producao_id: null,
              obs: transferenciaData.obs || "",
            },
          );
        });
        break;
      default:
        return res.status(400).json({ error: "Ação não reconhecida." });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: "Registro duplicado." });
    }
    return res.status(500).json({ error: "Erro ao executar comando." });
  }
}
