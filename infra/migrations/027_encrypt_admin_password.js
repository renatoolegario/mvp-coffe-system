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
  const senhaCriptografada = encrypt("Admin@123");

  await pgm.db.query(
    `
    UPDATE usuarios
    SET senha = $1
    WHERE email = 'admin@essenciasdobrasil.local'
    `,
    [senhaCriptografada],
  );
};

exports.down = async (pgm) => {
  await pgm.db.query(
    `
    UPDATE usuarios
    SET senha = 'Admin@123'
    WHERE email = 'admin@essenciasdobrasil.local'
    `,
  );
};
