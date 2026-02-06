import { query } from "../../../../infra/database";
import { conversaoCripto } from "../../../../utils/crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const senha = String(req.body?.senha || "").trim();

  if (!email || !senha) {
    return res.status(400).json({ error: "Email e senha são obrigatórios." });
  }

  try {
    const senhaCriptografada = await conversaoCripto(senha);
    const result = await query(
      "SELECT id, nome, email, perfil FROM usuarios WHERE email = $1 AND senha = $2 AND ativo = true LIMIT 1",
      [email, senhaCriptografada],
    );

    const usuario = result.rows[0];
    if (!usuario) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    return res.status(200).json({ usuario });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao autenticar usuário." });
  }
}
