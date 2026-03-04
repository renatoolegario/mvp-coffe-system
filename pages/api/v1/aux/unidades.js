import { query } from "../../../../infra/database";
import { requireAuth } from "../../../../infra/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const result = await query(
      "SELECT id, codigo, label, is_default FROM aux_unidade ORDER BY is_default DESC, label ASC",
    );
    return res.status(200).json({ unidades: result.rows });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao carregar unidades." });
  }
}
