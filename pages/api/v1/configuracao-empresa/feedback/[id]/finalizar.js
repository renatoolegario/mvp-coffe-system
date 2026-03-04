import { query } from "../../../../../../infra/database";
import { requireAdmin } from "../../../../../../infra/auth";

const mapFeedback = (row) => ({
  id: row.id,
  data: row.data,
  nome_pagina: row.nome_pagina || "",
  descricao: row.descricao,
  anexo_base64: row.anexo_base64 || "",
  status: row.status,
  criado_em: row.criado_em,
  atualizado_em: row.atualizado_em,
  finalizado_em: row.finalizado_em,
});

export default async function handler(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = String(req.query?.id || "").trim();
  if (!id) {
    return res.status(400).json({ error: "ID do feedback é obrigatório." });
  }

  try {
    const result = await query(
      `
        UPDATE feedback
        SET
          status = 'FINALIZADO',
          finalizado_em = COALESCE(finalizado_em, now()),
          atualizado_em = now()
        WHERE id = $1
        RETURNING
          id,
          data,
          nome_pagina,
          descricao,
          anexo_base64,
          status,
          criado_em,
          atualizado_em,
          finalizado_em
      `,
      [id],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Feedback não encontrado." });
    }

    return res.status(200).json({ feedback: mapFeedback(result.rows[0]) });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao finalizar feedback." });
  }
}
