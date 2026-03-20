import { query, withTransaction } from "../../../infra/database";
import { decryptIfNeeded, encryptIfNeeded } from "../../../utils/crypto";
import { confirmActiveAsaasChargeReceivedInCashByParcela } from "../../../services/asaas";
import {
  isValidClienteEmail,
  normalizeClienteEmail,
} from "../../../utils/cliente";
import { toPerfilCode } from "../../../utils/profile";
import { isValidCpfCnpj, normalizeCpfCnpj } from "../../../utils/document";
import { normalizeImageBase64 } from "../../../utils/image";
import { isAdmin, requireAuth } from "../../../infra/auth";
import { randomUUID } from "crypto";

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

const normalizeContaPagarParcela = (parcela = {}, dataLancamento) => {
  const statusRaw = String(parcela.status || "")
    .trim()
    .toUpperCase();
  const isPago = statusRaw === "PAGA" || statusRaw === "PAGO";
  return {
    ...parcela,
    vencimento: parcela.vencimento || dataLancamento,
    status: isPago ? "PAGA" : "ABERTA",
    data_pagamento: isPago ? parcela.data_pagamento || dataLancamento : null,
    forma_pagamento: isPago
      ? parcela.forma_pagamento || "Entrada manual"
      : null,
  };
};

const normalizeProducaoResultado = (
  resultado = {},
  defaultTipoResultado = "PROGRAMADO",
) => {
  const tipoResultadoRaw = String(
    resultado.tipo_resultado || defaultTipoResultado || "PROGRAMADO",
  )
    .trim()
    .toUpperCase();
  const tipoResultado = tipoResultadoRaw === "EXTRA" ? "EXTRA" : "PROGRAMADO";

  return {
    id: resultado.id || randomUUID(),
    resultado_id: resultado.resultado_id || null,
    producao_id: resultado.producao_id || null,
    insumo_id: resultado.insumo_id || null,
    tipo_resultado: tipoResultado,
    quantidade_planejada_kg: getNumber(resultado.quantidade_planejada_kg),
    quantidade_real_kg:
      resultado.quantidade_real_kg === null ||
      resultado.quantidade_real_kg === undefined
        ? null
        : getNumber(resultado.quantidade_real_kg),
    criado_em: resultado.criado_em || null,
  };
};

const normalizeEmail = normalizeClienteEmail;
const isValidEmail = isValidClienteEmail;

const normalizeDateOnly = (value) => {
  const parsed = String(value || "").trim();
  if (!parsed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed)) return null;

  const [year, month, day] = parsed.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const findDuplicateInEncryptedColumn = async ({
  queryText,
  column,
  normalizedValue,
  normalizeValue,
  excludeId = "",
}) => {
  if (!normalizedValue) return false;
  const result = await query(queryText);
  return result.rows.some(
    (row) =>
      String(row.id || "") !== String(excludeId || "") &&
      normalizeValue(decryptIfNeeded(row[column] || "")) === normalizedValue,
  );
};

const resolveUnidadeInfo = async (
  client,
  unidadeInput,
  fallbackCode = "KG",
) => {
  const input = String(unidadeInput || "")
    .trim()
    .toUpperCase();

  if (/^\d+$/.test(input)) {
    const byId = await client.query(
      "SELECT id, codigo, label FROM aux_unidade WHERE id = $1 LIMIT 1",
      [Number(input)],
    );
    if (byId.rows[0]) {
      return {
        id: Number(byId.rows[0].id),
        codigo: byId.rows[0].codigo,
        label: byId.rows[0].label,
      };
    }
  }

  if (input) {
    const byCode = await client.query(
      "SELECT id, codigo, label FROM aux_unidade WHERE codigo = $1 LIMIT 1",
      [input],
    );
    if (byCode.rows[0]) {
      return {
        id: Number(byCode.rows[0].id),
        codigo: byCode.rows[0].codigo,
        label: byCode.rows[0].label,
      };
    }
  }

  const fallback = await client.query(
    "SELECT id, codigo, label FROM aux_unidade WHERE codigo = $1 LIMIT 1",
    [
      String(fallbackCode || "KG")
        .trim()
        .toUpperCase(),
    ],
  );

  return {
    id: Number(fallback.rows[0]?.id || 1),
    codigo: fallback.rows[0]?.codigo || "KG",
    label: fallback.rows[0]?.label || "Quilograma",
  };
};

const resolveUnidadeId = async (client, unidadeInput, fallbackCode = "KG") => {
  const unidadeInfo = await resolveUnidadeInfo(
    client,
    unidadeInput,
    fallbackCode,
  );
  return unidadeInfo.id;
};

const normalizeInsumoPayload = (payload = {}, unidadeCodigo = "KG") => {
  const nome = String(payload.nome || "").trim();
  if (!nome) {
    return { error: "Nome do insumo é obrigatório." };
  }

  const unidadeCodigoNormalizado = String(
    unidadeCodigo || payload.unidade_codigo || payload.unidade || "KG",
  )
    .trim()
    .toUpperCase();
  const kgPorSaco =
    unidadeCodigoNormalizado === "SACO" ? getNumber(payload.kg_por_saco) : 1;

  if (unidadeCodigoNormalizado === "SACO" && kgPorSaco <= 0) {
    return { error: "Informe quantos kg vêm em cada saco." };
  }

  const valorVenda = getNumber(payload.valor_venda);
  if (valorVenda < 0) {
    return { error: "O valor de venda não pode ser negativo." };
  }

  const descricao = String(payload.descricao || "").trim();
  const imagemPaginaInicialBase64 = normalizeImageBase64(
    payload.imagem_pagina_inicial_base64,
  );

  if (imagemPaginaInicialBase64 === null) {
    return {
      error:
        "A imagem da página inicial precisa estar em formato base64 de imagem válido.",
    };
  }

  const aparecerPaginaInicial = Boolean(payload.aparecer_pagina_inicial);
  const podeSerVendido = aparecerPaginaInicial
    ? true
    : (payload.pode_ser_vendido ?? false);

  if (aparecerPaginaInicial && !descricao) {
    return {
      error: "Informe uma descrição para exibir o produto na página inicial.",
    };
  }

  if (aparecerPaginaInicial && valorVenda <= 0) {
    return {
      error:
        "Informe um valor de venda maior que zero para exibir o produto na página inicial.",
    };
  }

  return {
    data: {
      nome,
      estoque_minimo: getNumber(payload.estoque_minimo),
      kg_por_saco: kgPorSaco || 1,
      ativo: payload.ativo,
      criado_em: payload.criado_em,
      pode_ser_insumo: payload.pode_ser_insumo ?? true,
      pode_ser_produzivel: payload.pode_ser_produzivel ?? false,
      pode_ser_vendido: podeSerVendido,
      aparecer_pagina_inicial: aparecerPaginaInicial,
      valor_venda: valorVenda,
      imagem_pagina_inicial_base64: imagemPaginaInicialBase64 || "",
      descricao,
    },
  };
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
    let responsePayload = { ok: true };

    switch (action) {
      case "addUsuario":
        {
          if (!isAdmin(auth)) {
            return res.status(403).json({
              error: "Apenas administradores podem cadastrar usuários.",
            });
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
              .json({ error: "Já existe um usuário com esse e-mail." });
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
        {
          const nome = String(payload.nome || "").trim();
          const emailNormalizado = normalizeEmail(payload.email);
          const cpfCnpjRaw = String(payload.cpf_cnpj || "").trim();
          const cpfCnpjNormalizado = normalizeCpfCnpj(cpfCnpjRaw);
          const dataAniversarioInput = String(
            payload.data_aniversario || "",
          ).trim();
          const dataAniversario = normalizeDateOnly(dataAniversarioInput);

          if (!nome) {
            return res
              .status(400)
              .json({ error: "Nome do cliente é obrigatório." });
          }
          if (!emailNormalizado) {
            return res
              .status(400)
              .json({ error: "E-mail do cliente é obrigatório." });
          }
          if (!isValidEmail(emailNormalizado)) {
            return res
              .status(400)
              .json({ error: "E-mail do cliente é inválido." });
          }
          if (!cpfCnpjNormalizado) {
            return res
              .status(400)
              .json({ error: "CPF/CNPJ do cliente é obrigatório." });
          }
          if (!isValidCpfCnpj(cpfCnpjNormalizado)) {
            return res
              .status(400)
              .json({ error: "CPF/CNPJ do cliente é inválido." });
          }
          if (dataAniversarioInput && !dataAniversario) {
            return res
              .status(400)
              .json({ error: "Data de aniversário do cliente é inválida." });
          }

          const emailJaExiste = await findDuplicateInEncryptedColumn({
            queryText:
              "SELECT email FROM clientes WHERE COALESCE(email, '') <> ''",
            column: "email",
            normalizedValue: emailNormalizado,
            normalizeValue: normalizeEmail,
          });
          if (emailJaExiste) {
            return res
              .status(409)
              .json({ error: "Já existe um cliente com este e-mail." });
          }

          const cpfCnpjJaExiste = await findDuplicateInEncryptedColumn({
            queryText:
              "SELECT cpf_cnpj FROM clientes WHERE COALESCE(cpf_cnpj, '') <> ''",
            column: "cpf_cnpj",
            normalizedValue: cpfCnpjNormalizado,
            normalizeValue: normalizeCpfCnpj,
          });
          if (cpfCnpjJaExiste) {
            return res
              .status(409)
              .json({ error: "Já existe um cliente com este CPF/CNPJ." });
          }

          await query(
            "INSERT INTO clientes (id, nome, email, cpf_cnpj, telefone, endereco, data_aniversario, ativo, criado_em, protegido) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)",
            [
              payload.id,
              encryptIfNeeded(nome),
              encryptIfNeeded(emailNormalizado),
              encryptIfNeeded(cpfCnpjRaw),
              encryptIfNeeded(payload.telefone),
              encryptIfNeeded(payload.endereco),
              dataAniversario,
              payload.ativo,
              payload.criado_em,
            ],
          );
        }
        break;
      case "updateCliente":
        {
          const nome = String(payload.nome || "").trim();
          const emailNormalizado = normalizeEmail(payload.email);
          const cpfCnpjRaw = String(payload.cpf_cnpj || "").trim();
          const cpfCnpjNormalizado = normalizeCpfCnpj(cpfCnpjRaw);
          const dataAniversarioInput = String(
            payload.data_aniversario || "",
          ).trim();
          const dataAniversario = normalizeDateOnly(dataAniversarioInput);

          const clienteResult = await query(
            "SELECT protegido FROM clientes WHERE id = $1 LIMIT 1",
            [payload.id],
          );
          if (clienteResult.rows[0]?.protegido) {
            return res.status(403).json({
              error:
                "Cliente Balcão é protegido e só pode ser alterado por migration.",
            });
          }
          if (!nome) {
            return res
              .status(400)
              .json({ error: "Nome do cliente é obrigatório." });
          }
          if (!emailNormalizado) {
            return res
              .status(400)
              .json({ error: "E-mail do cliente é obrigatório." });
          }
          if (!isValidEmail(emailNormalizado)) {
            return res
              .status(400)
              .json({ error: "E-mail do cliente é inválido." });
          }
          if (!cpfCnpjNormalizado) {
            return res
              .status(400)
              .json({ error: "CPF/CNPJ do cliente é obrigatório." });
          }
          if (!isValidCpfCnpj(cpfCnpjNormalizado)) {
            return res
              .status(400)
              .json({ error: "CPF/CNPJ do cliente é inválido." });
          }
          if (dataAniversarioInput && !dataAniversario) {
            return res
              .status(400)
              .json({ error: "Data de aniversário do cliente é inválida." });
          }

          const emailJaExiste = await findDuplicateInEncryptedColumn({
            queryText:
              "SELECT id, email FROM clientes WHERE COALESCE(email, '') <> ''",
            column: "email",
            normalizedValue: emailNormalizado,
            normalizeValue: normalizeEmail,
            excludeId: payload.id,
          });
          if (emailJaExiste) {
            return res
              .status(409)
              .json({ error: "Já existe um cliente com este e-mail." });
          }

          const cpfCnpjJaExiste = await findDuplicateInEncryptedColumn({
            queryText:
              "SELECT id, cpf_cnpj FROM clientes WHERE COALESCE(cpf_cnpj, '') <> ''",
            column: "cpf_cnpj",
            normalizedValue: cpfCnpjNormalizado,
            normalizeValue: normalizeCpfCnpj,
            excludeId: payload.id,
          });
          if (cpfCnpjJaExiste) {
            return res
              .status(409)
              .json({ error: "Já existe um cliente com este CPF/CNPJ." });
          }
        }

        await query(
          "UPDATE clientes SET nome = $2, email = $3, cpf_cnpj = $4, telefone = $5, endereco = $6, data_aniversario = $7 WHERE id = $1",
          [
            payload.id,
            encryptIfNeeded(payload.nome),
            encryptIfNeeded(normalizeEmail(payload.email)),
            encryptIfNeeded(payload.cpf_cnpj),
            encryptIfNeeded(payload.telefone),
            encryptIfNeeded(payload.endereco),
            normalizeDateOnly(payload.data_aniversario),
          ],
        );
        break;
      case "addFornecedor":
        {
          const razaoSocial = String(payload.razao_social || "").trim();
          const emailNormalizado = normalizeEmail(payload.email);
          const cpfCnpjRaw = String(payload.cpf_cnpj || "").trim();
          const cpfCnpjNormalizado = normalizeCpfCnpj(cpfCnpjRaw);
          const dataAniversarioInput = String(
            payload.data_aniversario || "",
          ).trim();
          const dataAniversario = normalizeDateOnly(dataAniversarioInput);

          if (!razaoSocial) {
            return res
              .status(400)
              .json({ error: "Razão social do fornecedor é obrigatória." });
          }
          if (!emailNormalizado) {
            return res
              .status(400)
              .json({ error: "E-mail do fornecedor é obrigatório." });
          }
          if (!isValidEmail(emailNormalizado)) {
            return res
              .status(400)
              .json({ error: "E-mail do fornecedor é inválido." });
          }
          if (!cpfCnpjNormalizado) {
            return res
              .status(400)
              .json({ error: "CPF/CNPJ do fornecedor é obrigatório." });
          }
          if (!isValidCpfCnpj(cpfCnpjNormalizado)) {
            return res
              .status(400)
              .json({ error: "CPF/CNPJ do fornecedor é inválido." });
          }
          if (dataAniversarioInput && !dataAniversario) {
            return res.status(400).json({
              error: "Data de aniversário do fornecedor é inválida.",
            });
          }

          const emailJaExiste = await findDuplicateInEncryptedColumn({
            queryText:
              "SELECT email FROM fornecedores WHERE COALESCE(email, '') <> ''",
            column: "email",
            normalizedValue: emailNormalizado,
            normalizeValue: normalizeEmail,
          });
          if (emailJaExiste) {
            return res
              .status(409)
              .json({ error: "Já existe um fornecedor com este e-mail." });
          }

          const cpfCnpjJaExiste = await findDuplicateInEncryptedColumn({
            queryText:
              "SELECT cpf_cnpj FROM fornecedores WHERE COALESCE(cpf_cnpj, '') <> ''",
            column: "cpf_cnpj",
            normalizedValue: cpfCnpjNormalizado,
            normalizeValue: normalizeCpfCnpj,
          });
          if (cpfCnpjJaExiste) {
            return res
              .status(409)
              .json({ error: "Já existe um fornecedor com este CPF/CNPJ." });
          }

          await query(
            "INSERT INTO fornecedores (id, razao_social, email, cpf_cnpj, telefone, endereco, data_aniversario, ativo, criado_em) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
            [
              payload.id,
              encryptIfNeeded(razaoSocial),
              encryptIfNeeded(emailNormalizado),
              encryptIfNeeded(cpfCnpjRaw),
              encryptIfNeeded(payload.telefone),
              encryptIfNeeded(payload.endereco),
              dataAniversario,
              payload.ativo,
              payload.criado_em,
            ],
          );
        }
        break;
      case "addInsumo": {
        const unidadeInfo = await resolveUnidadeInfo(
          { query },
          payload.unidade_id || payload.unidade_codigo || payload.unidade,
        );
        const normalizedInsumo = normalizeInsumoPayload(
          payload,
          unidadeInfo.codigo,
        );

        if (normalizedInsumo.error) {
          return res.status(400).json({ error: normalizedInsumo.error });
        }

        await withTransaction(async (client) => {
          const unidadeId = unidadeInfo.id;
          const estoqueMinimoUnidadeId = unidadeInfo.id;

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
              aparecer_pagina_inicial,
              valor_venda,
              imagem_pagina_inicial_base64,
              descricao,
              unidade_id,
              estoque_minimo_unidade_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `,
            [
              payload.id,
              normalizedInsumo.data.nome,
              normalizedInsumo.data.estoque_minimo,
              normalizedInsumo.data.kg_por_saco,
              normalizedInsumo.data.ativo,
              normalizedInsumo.data.criado_em,
              normalizedInsumo.data.pode_ser_insumo,
              normalizedInsumo.data.pode_ser_produzivel,
              normalizedInsumo.data.pode_ser_vendido,
              normalizedInsumo.data.aparecer_pagina_inicial,
              normalizedInsumo.data.valor_venda,
              normalizedInsumo.data.imagem_pagina_inicial_base64,
              normalizedInsumo.data.descricao,
              unidadeId,
              estoqueMinimoUnidadeId,
            ],
          );
        });
        break;
      }
      case "updateInsumo": {
        const unidadeInfo = await resolveUnidadeInfo(
          { query },
          payload.unidade_id || payload.unidade_codigo || payload.unidade,
        );
        const normalizedInsumo = normalizeInsumoPayload(
          payload,
          unidadeInfo.codigo,
        );

        if (normalizedInsumo.error) {
          return res.status(400).json({ error: normalizedInsumo.error });
        }

        await withTransaction(async (client) => {
          const unidadeId = unidadeInfo.id;
          const estoqueMinimoUnidadeId = unidadeInfo.id;

          await client.query(
            `
            UPDATE insumos
            SET nome = $2,
                estoque_minimo = $3,
                kg_por_saco = $4,
                pode_ser_insumo = $5,
                pode_ser_produzivel = $6,
                pode_ser_vendido = $7,
                aparecer_pagina_inicial = $8,
                valor_venda = $9,
                imagem_pagina_inicial_base64 = $10,
                descricao = $11,
                unidade_id = $12,
                estoque_minimo_unidade_id = $13
            WHERE id = $1
            `,
            [
              payload.id,
              normalizedInsumo.data.nome,
              normalizedInsumo.data.estoque_minimo,
              normalizedInsumo.data.kg_por_saco,
              normalizedInsumo.data.pode_ser_insumo,
              normalizedInsumo.data.pode_ser_produzivel,
              normalizedInsumo.data.pode_ser_vendido,
              normalizedInsumo.data.aparecer_pagina_inicial,
              normalizedInsumo.data.valor_venda,
              normalizedInsumo.data.imagem_pagina_inicial_base64,
              normalizedInsumo.data.descricao,
              unidadeId,
              estoqueMinimoUnidadeId,
            ],
          );
        });
        break;
      }
      case "addEntradaInsumos":
        await withTransaction(async (client) => {
          const dataLancamento =
            payload?.movimento?.data_movimentacao || new Date().toISOString();
          const parcelasNormalizadas = (payload.parcelas || []).map((parcela) =>
            normalizeContaPagarParcela(parcela, dataLancamento),
          );
          const parcelasPorConta = parcelasNormalizadas.reduce(
            (acc, parcela) => {
              const contaId = parcela.conta_pagar_id;
              if (!contaId) return acc;
              if (!acc.has(contaId)) acc.set(contaId, []);
              acc.get(contaId).push(parcela);
              return acc;
            },
            new Map(),
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
            payload.movimento,
          );

          for (const contaPagar of payload.contasPagar || []) {
            const parcelasConta = parcelasPorConta.get(contaPagar.id) || [];
            const statusConta =
              parcelasConta.length &&
              parcelasConta.every((parcela) => parcela.status === "PAGA")
                ? "PAGO"
                : "ABERTO";
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
              {
                ...contaPagar,
                status: statusConta,
              },
            );
          }

          for (const parcela of parcelasNormalizadas) {
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

          const resultadosNormalizados = (payload?.resultados || [])
            .map((resultado) =>
              normalizeProducaoResultado(resultado, "PROGRAMADO"),
            )
            .filter(
              (resultado) =>
                resultado.insumo_id &&
                getNumber(resultado.quantidade_planejada_kg) > 0,
            );

          const producaoPayload = {
            ...payload.producao,
            insumo_final_id:
              payload?.producao?.insumo_final_id ||
              resultadosNormalizados[0]?.insumo_id ||
              payload?.detalhes?.[0]?.insumo_id ||
              null,
          };

          if (!producaoPayload.insumo_final_id) {
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
            producaoPayload,
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
                data_movimentacao: producaoPayload.data_producao,
                referencia_tipo: "producao",
                referencia_id: producaoPayload.id,
                producao_id: producaoPayload.id,
                obs: producaoPayload.obs || "",
              },
            );
          }

          for (const resultado of resultadosNormalizados) {
            await insertRow(
              client,
              "producao_resultados",
              [
                "id",
                "producao_id",
                "insumo_id",
                "tipo_resultado",
                "quantidade_planejada_kg",
                "quantidade_real_kg",
                "criado_em",
              ],
              {
                id: resultado.id || randomUUID(),
                producao_id: producaoPayload.id,
                insumo_id: resultado.insumo_id,
                tipo_resultado: "PROGRAMADO",
                quantidade_planejada_kg: resultado.quantidade_planejada_kg,
                quantidade_real_kg: null,
                criado_em: resultado.criado_em || producaoPayload.data_producao,
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

          const resultadosProgramadosResult = await client.query(
            `
              SELECT *
              FROM producao_resultados
              WHERE producao_id = $1
                AND tipo_resultado = 'PROGRAMADO'
              ORDER BY criado_em ASC, id ASC
              FOR UPDATE
            `,
            [payload.producao_id],
          );
          const resultadosProgramados = resultadosProgramadosResult.rows || [];

          const resultadosRetorno = (payload.resultados_retorno || [])
            .map((resultado) =>
              normalizeProducaoResultado(resultado, "PROGRAMADO"),
            )
            .filter(
              (resultado) =>
                resultado.insumo_id &&
                getNumber(resultado.quantidade_real_kg) > 0,
            );

          if (!resultadosRetorno.length) {
            throw new Error(
              "Informe ao menos um produto com quantidade de retorno maior que zero.",
            );
          }

          const programadoById = new Map(
            resultadosProgramados.map((item) => [String(item.id), item]),
          );
          const programadoByInsumo = new Map(
            resultadosProgramados.map((item) => [String(item.insumo_id), item]),
          );
          const programadosPreenchidos = new Set();
          const resultadosProcessados = [];

          for (const resultado of resultadosRetorno) {
            const resultadoId = String(
              resultado.resultado_id || resultado.id || "",
            );
            const resultadoInsumoId = String(resultado.insumo_id || "");
            const podeTentarProgramado =
              resultado.tipo_resultado === "PROGRAMADO" ||
              Boolean(resultado.resultado_id);

            let programado = null;
            if (
              podeTentarProgramado &&
              resultadoId &&
              programadoById.has(resultadoId)
            ) {
              programado = programadoById.get(resultadoId);
            } else if (
              podeTentarProgramado &&
              programadoByInsumo.has(resultadoInsumoId)
            ) {
              programado = programadoByInsumo.get(resultadoInsumoId);
            }

            if (programado) {
              const quantidadePlanejadaAtual = getNumber(
                programado.quantidade_planejada_kg,
              );
              const quantidadePlanejadaEntrada = getNumber(
                resultado.quantidade_planejada_kg,
              );
              const quantidadePlanejada =
                quantidadePlanejadaAtual > 0
                  ? quantidadePlanejadaAtual
                  : quantidadePlanejadaEntrada;

              await client.query(
                `
                  UPDATE producao_resultados
                  SET quantidade_planejada_kg = $2,
                      quantidade_real_kg = $3
                  WHERE id = $1
                `,
                [
                  programado.id,
                  quantidadePlanejada,
                  getNumber(resultado.quantidade_real_kg),
                ],
              );

              programadosPreenchidos.add(String(programado.id));
              resultadosProcessados.push({
                id: programado.id,
                insumo_id: programado.insumo_id,
                quantidade_real_kg: getNumber(resultado.quantidade_real_kg),
                tipo_resultado: "PROGRAMADO",
              });
              continue;
            }

            const novoResultadoId = resultadoId || randomUUID();
            const quantidadePlanejadaExtra = getNumber(
              resultado.quantidade_planejada_kg,
            );
            await insertRow(
              client,
              "producao_resultados",
              [
                "id",
                "producao_id",
                "insumo_id",
                "tipo_resultado",
                "quantidade_planejada_kg",
                "quantidade_real_kg",
                "criado_em",
              ],
              {
                id: novoResultadoId,
                producao_id: payload.producao_id,
                insumo_id: resultado.insumo_id,
                tipo_resultado: "EXTRA",
                quantidade_planejada_kg: quantidadePlanejadaExtra,
                quantidade_real_kg: getNumber(resultado.quantidade_real_kg),
                criado_em: payload.data_confirmacao,
              },
            );

            resultadosProcessados.push({
              id: novoResultadoId,
              insumo_id: resultado.insumo_id,
              quantidade_real_kg: getNumber(resultado.quantidade_real_kg),
              tipo_resultado: "EXTRA",
            });
          }

          if (resultadosProgramados.length) {
            const pendentes = resultadosProgramados.filter(
              (programado) =>
                !programadosPreenchidos.has(String(programado.id)),
            );
            if (pendentes.length) {
              throw new Error(
                "Preencha a quantidade de chegada para todos os produtos programados.",
              );
            }
          }

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
          const pesoReal = resultadosProcessados.reduce(
            (acc, item) => acc + getNumber(item.quantidade_real_kg),
            0,
          );
          if (pesoReal <= 0) {
            throw new Error(
              "A soma dos produtos recebidos deve ser maior que zero.",
            );
          }
          const custoUnitarioReal =
            pesoReal > 0 ? custoTotalReal / pesoReal : 0;
          const insumoFinalAtualizado =
            resultadosProcessados[0]?.insumo_id || producao.insumo_final_id;

          await client.query(
            `
              UPDATE producao
              SET status = 'CONCLUIDA',
                  peso_real = $2,
                  anexo_base64 = $3,
                  custo_total_real = $4,
                  custo_unitario_real = $5,
                  obs = COALESCE($6, obs),
                  insumo_final_id = $7
              WHERE id = $1
            `,
            [
              payload.producao_id,
              pesoReal,
              payload.anexo_base64,
              custoTotalReal,
              custoUnitarioReal,
              payload.obs,
              insumoFinalAtualizado,
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

          for (const resultado of resultadosProcessados) {
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
                id: randomUUID(),
                insumo_id: resultado.insumo_id,
                tipo_movimento: "ENTRADA_PRODUCAO",
                custo_unitario: custoUnitarioReal,
                quantidade_entrada: getNumber(resultado.quantidade_real_kg),
                quantidade_saida: 0,
                data_movimentacao: payload.data_confirmacao,
                referencia_tipo: "producao",
                referencia_id: payload.producao_id,
                producao_id: payload.producao_id,
                obs: payload.obs || "",
              },
            );
          }
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
          await client.query(
            "UPDATE producao SET status = 'CANCELADA' WHERE id = $1",
            [payload.producao_id],
          );
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
              estorno,
            );
          }
        });
        break;
      case "addVenda":
        await withTransaction(async (client) => {
          const clienteId =
            payload?.venda?.cliente_id || payload?.contaReceber?.cliente_id;
          const tipoPagamento = String(
            payload?.venda?.tipo_pagamento || "A_VISTA",
          ).toUpperCase();
          const clienteResult = await client.query(
            "SELECT protegido FROM clientes WHERE id = $1 LIMIT 1",
            [clienteId],
          );
          const clienteProtegido = Boolean(clienteResult.rows[0]?.protegido);
          if (clienteProtegido && tipoPagamento === "A_PRAZO") {
            const error = new Error(
              "Cliente Balcão só pode ser vendido à vista.",
            );
            error.statusCode = 400;
            throw error;
          }

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

          const itensNormalizados = [];
          for (const item of payload.itens || []) {
            const unidadeId = await resolveUnidadeId(
              client,
              item.unidade_id || item.unidade_codigo || "KG",
            );
            const unidadeResult = await client.query(
              "SELECT codigo FROM aux_unidade WHERE id = $1 LIMIT 1",
              [unidadeId],
            );
            const unidadeCodigo = String(
              unidadeResult.rows[0]?.codigo || item.unidade_codigo || "KG",
            )
              .trim()
              .toUpperCase();

            const insumoResult = await client.query(
              "SELECT kg_por_saco FROM insumos WHERE id = $1 LIMIT 1",
              [item.insumo_id],
            );
            const kgPorSacoInsumo =
              getNumber(insumoResult.rows[0]?.kg_por_saco) || 1;
            const quantidadeInformada = getNumber(
              item.quantidade_informada ?? item.quantidade,
            );
            const kgPorSacoItem =
              getNumber(item.kg_por_saco) || kgPorSacoInsumo;
            const quantidadeKg =
              unidadeCodigo === "SACO"
                ? quantidadeInformada * kgPorSacoItem
                : quantidadeInformada;
            const precoUnitario = getNumber(
              item.preco_unitario ?? item.preco_unit,
            );
            const itemNormalizado = {
              ...item,
              unidade_id: unidadeId,
              quantidade_kg: Number(quantidadeKg.toFixed(6)),
              quantidade_informada: quantidadeInformada,
              kg_por_saco: unidadeCodigo === "SACO" ? kgPorSacoItem : null,
              preco_unitario: precoUnitario,
              valor_total: Number(
                (quantidadeInformada * precoUnitario).toFixed(2),
              ),
            };
            itensNormalizados.push(itemNormalizado);

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
              itemNormalizado,
            );
          }

          for (const item of itensNormalizados) {
            if (!item.insumo_id || getNumber(item.quantidade_kg) <= 0) continue;
            const custoResult = await client.query(
              `
              SELECT
                CASE
                  WHEN COALESCE(SUM(quantidade_entrada), 0) > 0 THEN
                    SUM(quantidade_entrada * custo_unitario) /
                    NULLIF(SUM(quantidade_entrada), 0)
                  ELSE 0
                END AS custo_medio_kg
              FROM movimento_producao
              WHERE insumo_id = $1
              `,
              [item.insumo_id],
            );
            const custoMedioKg = getNumber(custoResult.rows[0]?.custo_medio_kg);

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
                id: randomUUID(),
                insumo_id: item.insumo_id,
                tipo_movimento: "SAIDA_VENDA",
                custo_unitario: custoMedioKg,
                quantidade_entrada: 0,
                quantidade_saida: getNumber(item.quantidade_kg),
                data_movimentacao: payload.venda.data_venda,
                referencia_tipo: "venda",
                referencia_id: payload.venda.id,
                producao_id: null,
                obs: `Baixa de estoque da venda ${String(payload.venda.id || "").slice(0, 8)}`,
              },
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
        await withTransaction(async (client) => {
          const parcelaResult = await client.query(
            `
            UPDATE contas_pagar_parcelas
            SET status = $2,
                data_pagamento = $3,
                forma_pagamento = $4
            WHERE id = $1
            RETURNING conta_pagar_id
            `,
            [
              payload.id,
              payload.status,
              payload.data_pagamento,
              payload.forma_pagamento,
            ],
          );

          const contaPagarId =
            parcelaResult.rows[0]?.conta_pagar_id || payload.conta_pagar_id;

          if (contaPagarId) {
            await client.query(
              `
              UPDATE contas_pagar cp
              SET status = CASE
                WHEN EXISTS (
                  SELECT 1
                  FROM contas_pagar_parcelas cpp
                  WHERE cpp.conta_pagar_id = cp.id
                    AND cpp.status = 'ABERTA'
                ) THEN 'ABERTO'
                ELSE 'PAGO'
              END
              WHERE cp.id = $1
              `,
              [contaPagarId],
            );
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
      case "marcarParcelaRecebida":
        {
          const valorRecebidoAsaas =
            getNumber(payload.valor_recebido) ||
            getNumber(payload.valor_programado) ||
            getNumber(payload.valor);
          const asaasCharge = await confirmActiveAsaasChargeReceivedInCashByParcela({
            contaReceberParcelaId: payload.id,
            paymentDate: payload.data_recebimento,
            value: valorRecebidoAsaas,
          });

        await withTransaction(async (client) => {
          const valorRecebido = getNumber(payload.valor_recebido);
          const valorProgramado =
            getNumber(payload.valor_programado) || getNumber(payload.valor);
          const diferenca = Number(
            (valorProgramado - valorRecebido).toFixed(2),
          );

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
                [proximaParcela.id, Number((baseValor + diferenca).toFixed(2))],
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
          responsePayload = {
            ok: true,
            asaas_charge_synced: Boolean(asaasCharge),
            asaas_charge_id: asaasCharge?.id || null,
          };
        }
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

    return res.status(200).json(responsePayload);
  } catch (error) {
    if (error?.statusCode) {
      return res
        .status(error.statusCode)
        .json({ error: error.message || "Requisição inválida." });
    }
    if (error?.code === "23505") {
      return res.status(409).json({ error: "Registro duplicado." });
    }
    return res.status(500).json({ error: "Erro ao executar comando." });
  }
}
