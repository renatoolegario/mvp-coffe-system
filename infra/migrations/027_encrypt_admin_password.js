const CryptoJS = require("crypto-js");

const encrypt = (content) => {
  const secretKey = process.env.SECRET_KEY;
  const ivValue = process.env.IV;

  if (!secretKey || !ivValue) {
    throw new Error("As variáveis SECRET_KEY e IV são obrigatórias.");
  }

  const iv = CryptoJS.enc.Utf8.parse(ivValue);
  const key = CryptoJS.enc.Utf8.parse(secretKey);

  return CryptoJS.AES.encrypt(content, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
};

exports.up = async (pgm) => {
  const senhaCriptografada = encrypt("mvp_admin_123");

  await pgm.db.query(
    `
    UPDATE usuarios
    SET senha = $1
    WHERE email = 'admin@cafemvp.com'
    `,
    [senhaCriptografada],
  );
};

exports.down = async (pgm) => {
  await pgm.db.query(
    `
    UPDATE usuarios
    SET senha = 'mvp_admin_123'
    WHERE email = 'admin@cafemvp.com'
    `,
  );
};
