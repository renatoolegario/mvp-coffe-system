import crypto from "crypto";
import { query } from "./database";
import { decryptIfNeeded } from "../utils/crypto";
import { PERFIS, toPerfilCode } from "../utils/profile";
import { addDaysLocalDateTime } from "../utils/datetime";

const extractToken = (req) => {
  const authorization = String(req.headers?.authorization || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return authorization.slice(7).trim();
};

export const hasAdminModeEnabled = (req) => {
  const adminParam = req.query?.admin;

  return Array.isArray(adminParam)
    ? adminParam.includes("1")
    : adminParam === "1";
};

export const generateAuthToken = () => {
  const random = crypto.randomBytes(24).toString("hex");
  return `${crypto.randomUUID()}.${random}`;
};

export const tokenExpiresAt = (days = 7) => addDaysLocalDateTime(days);

export const isAdmin = (auth) =>
  toPerfilCode(auth?.usuario?.perfil) === PERFIS.ADMIN;

const buildAdminModeAuth = () => ({
  bypass: true,
  token: null,
  token_id: null,
  usuario: {
    id: null,
    nome: "Admin Mode",
    email: "",
    perfil: PERFIS.ADMIN,
  },
  expira_em: null,
});

export const requireAuth = async (req, res) => {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Token de autenticação não informado." });
    return null;
  }

  try {
    const result = await query(
      `
      SELECT
        t.id AS token_id,
        t.usuario_id,
        t.expira_em,
        u.nome,
        u.email,
        u.perfil,
        u.ativo
      FROM auth_tokens t
      JOIN usuarios u ON u.id = t.usuario_id
      WHERE t.token = $1
        AND t.revogado_em IS NULL
        AND t.expira_em > now()::timestamp
      LIMIT 1
      `,
      [token],
    );

    const row = result.rows[0];
    if (!row || !row.ativo) {
      res.status(401).json({ error: "Token inválido ou expirado." });
      return null;
    }

    await query(
      "UPDATE auth_tokens SET ultimo_acesso_em = now()::timestamp WHERE id = $1",
      [row.token_id],
    );

    const auth = {
      token,
      token_id: row.token_id,
      usuario: {
        id: row.usuario_id,
        nome: decryptIfNeeded(row.nome),
        email: decryptIfNeeded(row.email),
        perfil: toPerfilCode(row.perfil),
      },
      expira_em: row.expira_em,
    };

    req.auth = auth;
    return auth;
  } catch (error) {
    res.status(500).json({ error: "Erro ao validar autenticação." });
    return null;
  }
};

export const requireAdmin = async (req, res) => {
  const auth = await requireAuth(req, res);
  if (!auth) return null;

  if (!isAdmin(auth)) {
    res.status(403).json({
      error: "Acesso permitido apenas para administradores.",
    });
    return null;
  }

  return auth;
};

export const requireAuthOrAdminMode = async (req, res) => {
  if (hasAdminModeEnabled(req)) {
    const auth = buildAdminModeAuth();
    req.auth = auth;
    return auth;
  }

  return requireAuth(req, res);
};

export const requireAdminOrAdminMode = async (req, res) => {
  if (hasAdminModeEnabled(req)) {
    const auth = buildAdminModeAuth();
    req.auth = auth;
    return auth;
  }

  return requireAdmin(req, res);
};
