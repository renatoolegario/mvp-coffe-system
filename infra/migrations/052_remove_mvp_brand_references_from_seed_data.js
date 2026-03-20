const CryptoJS = require("crypto-js");

const getCryptoConfig = () => {
  const secretKey = process.env.SECRET_KEY;
  const ivValue = process.env.IV;

  if (!secretKey || !ivValue) {
    throw new Error("As variáveis SECRET_KEY e IV são obrigatórias.");
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

const decrypt = (content) => {
  if (content === null || content === undefined || content === "") {
    return "";
  }

  try {
    const { key, iv } = getCryptoConfig();
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(String(content)),
    });
    const bytes = CryptoJS.AES.decrypt(cipherParams, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    return "";
  }
};

const isEncryptedText = (value) => {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  const decrypted = decrypt(value);
  if (!decrypted) return false;
  return encrypt(decrypted) === value;
};

const decryptIfNeeded = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!text) return "";
  return isEncryptedText(text) ? decrypt(text) : text;
};

const encryptIfNeeded = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value);
  if (!text) return "";
  return isEncryptedText(text) ? text : encrypt(text);
};

const replaceLegacyDomain = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/@mvpcoffee\.local$/i, "@essenciasdobrasil.local")
    .replace(/@mvpcafe\.local$/i, "@essenciasdobrasil.local")
    .replace(/@cafemvp\.com$/i, "@essenciasdobrasil.local");

const migrateTableEmails = async (pgm, tableName) => {
  const result = await pgm.db.query(
    `SELECT id, email FROM ${tableName} WHERE COALESCE(email, '') <> ''`,
  );

  for (const row of result.rows) {
    const currentEmail = decryptIfNeeded(row.email);
    const nextEmail = replaceLegacyDomain(currentEmail);

    if (!nextEmail || nextEmail === currentEmail) {
      continue;
    }

    await pgm.db.query(
      `UPDATE ${tableName} SET email = $2 WHERE id = $1`,
      [row.id, encryptIfNeeded(nextEmail)],
    );
  }
};

const withClientesTriggerDisabled = async (pgm, handler) => {
  const triggerResult = await pgm.db.query(
    `
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'trg_bloquear_cliente_protegido'
      LIMIT 1
    `,
  );

  const hasTrigger = Boolean(triggerResult.rowCount);

  if (hasTrigger) {
    await pgm.db.query(
      "ALTER TABLE clientes DISABLE TRIGGER trg_bloquear_cliente_protegido",
    );
  }

  try {
    await handler();
  } finally {
    if (hasTrigger) {
      await pgm.db.query(
        "ALTER TABLE clientes ENABLE TRIGGER trg_bloquear_cliente_protegido",
      );
    }
  }
};

exports.up = async (pgm) => {
  await migrateTableEmails(pgm, "usuarios");
  await withClientesTriggerDisabled(pgm, async () => {
    await migrateTableEmails(pgm, "clientes");
  });
  await migrateTableEmails(pgm, "fornecedores");
};

exports.down = () => {};
