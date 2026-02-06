import seedRaw from "../../../../docs/seed.json";
import { normalizeSeedData } from "../../../../utils/seed";
import { withTransaction } from "../../../../infra/database";

const tableList = [
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
          usuario,
        );
      }

      for (const cliente of seedData.clientes || []) {
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

      for (const fornecedor of seedData.fornecedores || []) {
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

      for (const insumo of seedData.insumos || []) {
        await insertRow(
          client,
          "insumos",
          [
            "id",
            "nome",
            "unidade",
            "estoque_minimo",
            "estoque_minimo_unidade",
            "kg_por_saco",
            "preco_kg",
            "tipo",
            "ativo",
            "criado_em",
          ],
          {
            ...insumo,
            preco_kg: insumo.preco_kg || 0,
            tipo: insumo.tipo === "FISICO" ? "FISICO" : "CONSUMIVEL",
          },
        );
      }
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao semear dados." });
  }
}
