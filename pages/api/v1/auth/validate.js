import { requireAuth } from "../../../../infra/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método não permitido." });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  return res.status(200).json({
    ok: true,
    usuario: auth.usuario,
    expira_em: auth.expira_em,
  });
}
