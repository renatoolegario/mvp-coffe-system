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

exports.up = async (pgm) => {
  const usersResult = await pgm.db.query(
    "SELECT id FROM usuarios ORDER BY criado_em ASC LIMIT 4",
  );

  const defaults = [
    { nome: "Administrador Geral", email: "admin@mvpcoffee.local", senha: "Admin@123", perfil: 1 },
    { nome: "Gestor Financeiro", email: "financeiro@mvpcoffee.local", senha: "Finance@123", perfil: 1 },
    { nome: "Operador Estoque", email: "estoque@mvpcoffee.local", senha: "Estoque@123", perfil: 2 },
    { nome: "Operador Comercial", email: "comercial@mvpcoffee.local", senha: "Comercial@123", perfil: 2 },
  ];

  for (let i = 0; i < usersResult.rows.length; i += 1) {
    const user = usersResult.rows[i];
    const item = defaults[i] || defaults[defaults.length - 1];

    await pgm.db.query(
      `
      UPDATE usuarios
      SET nome = $2,
          email = $3,
          senha = $4,
          perfil = $5,
          ativo = true
      WHERE id = $1
      `,
      [
        user.id,
        encrypt(item.nome),
        encrypt(item.email),
        encrypt(item.senha),
        item.perfil,
      ],
    );
  }
};

exports.down = () => {};
