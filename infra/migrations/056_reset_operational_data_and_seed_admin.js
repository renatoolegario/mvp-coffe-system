const { randomUUID } = require("crypto");
const CryptoJS = require("crypto-js");

const KEEP_TABLES = new Set([
  "pgmigrations",
  "aux_unidade",
  "aux_forma_pagamento",
  "empresa_configuracao_estoque",
  "empresa_configuracao_integracoes",
]);

const pad = (value) => String(value).padStart(2, "0");

const toTimestamp = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}`;
};

const quoteIdent = (name) => `"${String(name || "").replace(/"/g, '""')}"`;

const getCryptoConfig = () => {
  const secretKey = process.env.SECRET_KEY;
  const ivValue = process.env.IV;

  if (!secretKey || !ivValue) {
    throw new Error("As variaveis SECRET_KEY e IV sao obrigatorias.");
  }

  return {
    key: CryptoJS.SHA256(String(secretKey)),
    iv: CryptoJS.MD5(String(ivValue)),
  };
};

const encrypt = (content) => {
  const { key, iv } = getCryptoConfig();

  return CryptoJS.AES.encrypt(String(content ?? ""), key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
};

exports.up = async (pgm) => {
  await pgm.db.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");

  const allTables = await pgm.db.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
  );

  const truncateTargets = allTables.rows
    .map((row) => String(row.tablename || ""))
    .filter((tableName) => tableName && !KEEP_TABLES.has(tableName));

  if (truncateTargets.length) {
    await pgm.db.query(
      `TRUNCATE TABLE ${truncateTargets
        .map((tableName) => quoteIdent(tableName))
        .join(", ")} RESTART IDENTITY CASCADE`,
    );
  }

  await pgm.db.query(
    `
    INSERT INTO usuarios (id, nome, email, senha, perfil, ativo, criado_em)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      randomUUID(),
      encrypt("Administrador"),
      encrypt("admin@essenciasdobrasil.local"),
      encrypt("Admin@123"),
      1,
      true,
      toTimestamp(new Date()),
    ],
  );
};

exports.down = () => {};
