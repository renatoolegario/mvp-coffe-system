import { query } from "../../../../infra/database";
import { encryptIfNeeded, decryptIfNeeded } from "../../../../utils/crypto";
import { generateAuthToken, tokenExpiresAt } from "../../../../infra/auth";
import { toPerfilCode } from "../../../../utils/profile";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método não permitido." });
  }

  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const senha = String(req.body?.senha || "").trim();

  if (!email || !senha) {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
  }

  try {
    const emailCriptografado = encryptIfNeeded(email);
    const senhaCriptografada = encryptIfNeeded(senha);
    const result = await query(
      "SELECT id, nome, email, perfil FROM usuarios WHERE email = $1 AND senha = $2 AND ativo = true LIMIT 1",
      [emailCriptografado, senhaCriptografada],
    );

    const usuario = result.rows[0];
    if (!usuario) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    const token = generateAuthToken();
    const expiraEm = tokenExpiresAt(7);

    await query(
      "INSERT INTO auth_tokens (usuario_id, token, expira_em, criado_em) VALUES ($1, $2, $3, now()::timestamp)",
      [usuario.id, token, expiraEm],
    );

    return res.status(200).json({
      token,
      expira_em: expiraEm,
      usuario: {
        id: usuario.id,
        nome: decryptIfNeeded(usuario.nome),
        email: decryptIfNeeded(usuario.email),
        perfil: toPerfilCode(usuario.perfil),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao autenticar o usuário." });
  }
}
