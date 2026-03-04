import seedRaw from "../../../../docs/seed.json";
import { normalizeSeedData } from "../../../../utils/seed";
import { withTransaction } from "../../../../infra/database";
import { encryptIfNeeded } from "../../../../utils/crypto";
import { toPerfilCode } from "../../../../utils/profile";
import { requireAdmin } from "../../../../infra/auth";

const tableList = [
  "auth_tokens",
  "venda_detalhes",
  "venda_itens",
  "transferencias",
  "custos_adicionais_producao",
  "detalhes_producao",
  "producao",
  "movimento_producao",
  "contas_receber_parcelas",
  "contas_receber",
  "contas_pagar_parcelas",
  "contas_pagar",
  "vendas",
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

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const seedData = normalizeSeedData(seedRaw);

  try {
    await withTransaction(async (client) => {
      await client.query(
        `TRUNCATE ${tableList.join(", ")} RESTART IDENTITY CASCADE`,
      );

      for (const usuario of seedData.usuarios || []) {
        await insertRow(
          client,
          "usuarios",
          ["id", "nome", "email", "senha", "perfil", "ativo", "criado_em"],
          {
            ...usuario,
            nome: encryptIfNeeded(usuario.nome),
            email: encryptIfNeeded(String(usuario.email || "").toLowerCase()),
            senha: encryptIfNeeded(usuario.senha),
            perfil: toPerfilCode(usuario.perfil),
          },
        );
      }

      for (const cliente of seedData.clientes || []) {
        await insertRow(
          client,
          "clientes",
          [
            "id",
            "nome",
            "email",
            "cpf_cnpj",
            "telefone",
            "endereco",
            "ativo",
            "criado_em",
            "protegido",
          ],
          {
            ...cliente,
            nome: encryptIfNeeded(cliente.nome),
            email: encryptIfNeeded(
              String(cliente.email || "")
                .trim()
                .toLowerCase(),
            ),
            cpf_cnpj: encryptIfNeeded(cliente.cpf_cnpj),
            telefone: encryptIfNeeded(cliente.telefone),
            endereco: encryptIfNeeded(cliente.endereco),
            protegido: false,
          },
        );
      }

      for (const fornecedor of seedData.fornecedores || []) {
        await insertRow(
          client,
          "fornecedores",
          [
            "id",
            "razao_social",
            "email",
            "cpf_cnpj",
            "telefone",
            "endereco",
            "ativo",
            "criado_em",
          ],
          {
            ...fornecedor,
            razao_social: encryptIfNeeded(fornecedor.razao_social),
            email: encryptIfNeeded(
              String(fornecedor.email || "")
                .trim()
                .toLowerCase(),
            ),
            cpf_cnpj: encryptIfNeeded(fornecedor.cpf_cnpj),
            telefone: encryptIfNeeded(fornecedor.telefone),
            endereco: encryptIfNeeded(fornecedor.endereco),
          },
        );
      }

      const unidadesResult = await client.query(
        "SELECT id, codigo FROM aux_unidade WHERE codigo IN ('KG', 'SACO')",
      );
      const unidadeByCodigo = Object.fromEntries(
        unidadesResult.rows.map((row) => [row.codigo, row.id]),
      );
      const kgId = unidadeByCodigo.KG;
      const sacoId = unidadeByCodigo.SACO;

      for (const insumo of seedData.insumos || []) {
        const unidadeCodigo = String(insumo.unidade || "kg").trim().toUpperCase();
        const estoqueUnidadeCodigo = String(
          insumo.estoque_minimo_unidade || insumo.unidade || "kg",
        )
          .trim()
          .toUpperCase();
        await insertRow(
          client,
          "insumos",
          [
            "id",
            "nome",
            "estoque_minimo",
            "kg_por_saco",
            "ativo",
            "criado_em",
            "unidade_id",
            "estoque_minimo_unidade_id",
            "pode_ser_insumo",
            "pode_ser_produzivel",
            "pode_ser_vendido",
          ],
          {
            ...insumo,
            unidade_id: unidadeCodigo === "SACO" ? sacoId : kgId,
            estoque_minimo_unidade_id:
              estoqueUnidadeCodigo === "SACO" ? sacoId : kgId,
            pode_ser_insumo: insumo.pode_ser_insumo ?? true,
            pode_ser_produzivel: insumo.pode_ser_produzivel ?? false,
            pode_ser_vendido: insumo.pode_ser_vendido ?? false,
          },
        );
      }
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao semear dados." });
  }
}
