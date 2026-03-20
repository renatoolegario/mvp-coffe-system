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
  await pgm.db.query(
    "ALTER TABLE clientes DISABLE TRIGGER trg_bloquear_cliente_protegido",
  );

  await pgm.db.query(
    `
    UPDATE usuarios
    SET nome = $2,
        email = $3,
        senha = $4
    WHERE id = $1
    `,
    [
      "00000000-0000-4000-8000-000000000001",
      encrypt("Administrador"),
      encrypt("admin@essenciasdobrasil.local"),
      encrypt("Admin@123"),
    ],
  );

  await pgm.db.query(
    `
    UPDATE usuarios
    SET nome = $2,
        email = $3,
        senha = $4
    WHERE id = $1
    `,
    [
      "00000000-0000-4000-8000-000000000002",
      encrypt("Operador Comum"),
      encrypt("operador@essenciasdobrasil.local"),
      encrypt("12345"),
    ],
  );

  await pgm.db.query(
    `
    UPDATE clientes
    SET nome = $2,
        cpf_cnpj = $3,
        telefone = $4,
        endereco = $5
    WHERE id = $1
    `,
    [
      "00000000-0000-4000-8000-000000000101",
      encrypt("Cliente Balcão"),
      encrypt("487.123.220-40"),
      encrypt(""),
      encrypt(""),
    ],
  );

  await pgm.db.query(
    `
    UPDATE clientes
    SET nome = $2,
        cpf_cnpj = $3,
        telefone = $4,
        endereco = $5
    WHERE id = $1
    `,
    [
      "00000000-0000-4000-8000-000000000102",
      encrypt("Cooperativa Mantiqueira"),
      encrypt("12.345.678/0001-90"),
      encrypt("(35) 3333-1111"),
      encrypt("Rua das Palmeiras, 120"),
    ],
  );

  await pgm.db.query(
    `
    UPDATE clientes
    SET nome = $2,
        cpf_cnpj = $3,
        telefone = $4,
        endereco = $5
    WHERE id = $1
    `,
    [
      "00000000-0000-4000-8000-000000000103",
      encrypt("Cafeteria Central"),
      encrypt("98.765.432/0001-55"),
      encrypt("(35) 99999-2222"),
      encrypt("Av. Brasil, 90"),
    ],
  );

  await pgm.db.query(
    `
    UPDATE fornecedores
    SET razao_social = $2,
        cpf_cnpj = $3,
        telefone = $4,
        endereco = $5
    WHERE id = $1
    `,
    [
      "00000000-0000-4000-8000-000000000201",
      encrypt("Fazenda Boa Safra"),
      encrypt("11.111.111/0001-11"),
      encrypt("(35) 3333-5555"),
      encrypt("Zona Rural, km 8"),
    ],
  );

  await pgm.db.query(
    `
    UPDATE fornecedores
    SET razao_social = $2,
        cpf_cnpj = $3,
        telefone = $4,
        endereco = $5
    WHERE id = $1
    `,
    [
      "00000000-0000-4000-8000-000000000202",
      encrypt("Transportes Serra Azul"),
      encrypt("22.222.222/0001-22"),
      encrypt("(35) 3333-8888"),
      encrypt("Distrito Industrial, 45"),
    ],
  );

  await pgm.db.query(
    "ALTER TABLE clientes ENABLE TRIGGER trg_bloquear_cliente_protegido",
  );
};

exports.down = () => {};
