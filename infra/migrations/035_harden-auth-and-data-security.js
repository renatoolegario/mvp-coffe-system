const CryptoJS = require("crypto-js");

const UUID_REGEX =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";

const pad = (value) => String(value).padStart(2, "0");

const toLocalDateTime = (input = new Date()) => {
  const date = input instanceof Date ? input : new Date(input);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const getCryptoConfig = () => {
  const secretKey = process.env.SECRET_KEY;
  const ivValue = process.env.IV;

  if (!secretKey || !ivValue) {
    throw new Error("As variáveis SECRET_KEY e IV são obrigatórias.");
  }

  return {
    iv: CryptoJS.enc.Utf8.parse(ivValue),
    key: CryptoJS.enc.Utf8.parse(secretKey),
  };
};

const encrypt = (content) => {
  const { iv, key } = getCryptoConfig();
  return CryptoJS.AES.encrypt(String(content ?? ""), key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
};

const decrypt = (content) => {
  if (content === null || content === undefined || content === "") return "";
  try {
    const { iv, key } = getCryptoConfig();
    const bytes = CryptoJS.AES.decrypt(String(content), key, {
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
  if (value === null || value === undefined || value === "") return false;
  const decrypted = decrypt(value);
  if (!decrypted) return false;
  return encrypt(decrypted) === value;
};

const encryptIfNeeded = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value);
  if (!text) return "";
  return isEncryptedText(text) ? text : encrypt(text);
};

const toPerfilCode = (value) => {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 4) return parsed;

  const role = String(value || "")
    .trim()
    .toLowerCase();
  if (role === "admin") return 1;
  if (role === "financeiro") return 2;
  if (role === "producao") return 3;
  return 4;
};

exports.up = async (pgm) => {
  pgm.sql("CREATE EXTENSION IF NOT EXISTS pgcrypto");

  const getColumnType = async (tableName, columnName) => {
    const result = await pgm.db.query(
      `
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
      `,
      [tableName, columnName],
    );
    return result.rows[0]?.data_type || null;
  };

  const hasTable = async (tableName) => {
    const result = await pgm.db.query(
      `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
      LIMIT 1
      `,
      [tableName],
    );
    return Boolean(result.rowCount);
  };

  const usuariosIdType = await getColumnType("usuarios", "id");
  if (usuariosIdType !== "uuid") {
    pgm.sql(`
      ALTER TABLE usuarios ADD COLUMN id_uuid uuid;
      UPDATE usuarios
      SET id_uuid = CASE
        WHEN id::text ~* '${UUID_REGEX}' THEN id::uuid
        ELSE gen_random_uuid()
      END;

      ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_pkey;
      ALTER TABLE usuarios DROP COLUMN id;
      ALTER TABLE usuarios RENAME COLUMN id_uuid TO id;
      ALTER TABLE usuarios ALTER COLUMN id SET NOT NULL;
      ALTER TABLE usuarios ALTER COLUMN id SET DEFAULT gen_random_uuid();
      ALTER TABLE usuarios ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);
    `);
  }

  const clientesIdType = await getColumnType("clientes", "id");
  const vendasClienteIdType = await getColumnType("vendas", "cliente_id");
  const contasReceberClienteIdType = await getColumnType("contas_receber", "cliente_id");
  if (
    clientesIdType !== "uuid" ||
    vendasClienteIdType !== "uuid" ||
    contasReceberClienteIdType !== "uuid"
  ) {
    pgm.sql(`
      ALTER TABLE clientes ADD COLUMN id_uuid uuid;
      UPDATE clientes
      SET id_uuid = CASE
        WHEN id::text ~* '${UUID_REGEX}' THEN id::uuid
        ELSE gen_random_uuid()
      END;

      ALTER TABLE vendas ADD COLUMN cliente_id_uuid uuid;
      ALTER TABLE contas_receber ADD COLUMN cliente_id_uuid uuid;

      UPDATE vendas v
      SET cliente_id_uuid = c.id_uuid
      FROM clientes c
      WHERE v.cliente_id = c.id;

      UPDATE contas_receber cr
      SET cliente_id_uuid = c.id_uuid
      FROM clientes c
      WHERE cr.cliente_id = c.id;

      ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_cliente_id_fkey;
      ALTER TABLE contas_receber DROP CONSTRAINT IF EXISTS contas_receber_cliente_id_fkey;

      ALTER TABLE vendas DROP COLUMN cliente_id;
      ALTER TABLE contas_receber DROP COLUMN cliente_id;

      ALTER TABLE vendas RENAME COLUMN cliente_id_uuid TO cliente_id;
      ALTER TABLE contas_receber RENAME COLUMN cliente_id_uuid TO cliente_id;

      ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_pkey;
      ALTER TABLE clientes DROP COLUMN id;
      ALTER TABLE clientes RENAME COLUMN id_uuid TO id;
      ALTER TABLE clientes ALTER COLUMN id SET NOT NULL;
      ALTER TABLE clientes ALTER COLUMN id SET DEFAULT gen_random_uuid();
      ALTER TABLE clientes ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);

      ALTER TABLE vendas
        ADD CONSTRAINT vendas_cliente_id_fkey
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;

      ALTER TABLE contas_receber
        ADD CONSTRAINT contas_receber_cliente_id_fkey
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;
    `);
  }

  const fornecedoresIdType = await getColumnType("fornecedores", "id");
  const contasPagarFornecedorIdType = await getColumnType("contas_pagar", "fornecedor_id");
  const custosFornecedorIdType = await getColumnType(
    "custos_adicionais_producao",
    "fornecedor_id",
  );
  if (
    fornecedoresIdType !== "uuid" ||
    contasPagarFornecedorIdType !== "uuid" ||
    custosFornecedorIdType !== "uuid"
  ) {
    pgm.sql(`
      ALTER TABLE fornecedores ADD COLUMN id_uuid uuid;
      UPDATE fornecedores
      SET id_uuid = CASE
        WHEN id::text ~* '${UUID_REGEX}' THEN id::uuid
        ELSE gen_random_uuid()
      END;

      ALTER TABLE contas_pagar ADD COLUMN fornecedor_id_uuid uuid;
      ALTER TABLE custos_adicionais_producao ADD COLUMN fornecedor_id_uuid uuid;

      UPDATE contas_pagar cp
      SET fornecedor_id_uuid = f.id_uuid
      FROM fornecedores f
      WHERE cp.fornecedor_id = f.id;

      UPDATE custos_adicionais_producao cap
      SET fornecedor_id_uuid = f.id_uuid
      FROM fornecedores f
      WHERE cap.fornecedor_id = f.id;

      ALTER TABLE contas_pagar DROP CONSTRAINT IF EXISTS contas_pagar_fornecedor_id_fkey;
      ALTER TABLE custos_adicionais_producao DROP CONSTRAINT IF EXISTS custos_adicionais_producao_fornecedor_id_fkey;

      ALTER TABLE contas_pagar DROP COLUMN fornecedor_id;
      ALTER TABLE custos_adicionais_producao DROP COLUMN fornecedor_id;

      ALTER TABLE contas_pagar RENAME COLUMN fornecedor_id_uuid TO fornecedor_id;
      ALTER TABLE custos_adicionais_producao RENAME COLUMN fornecedor_id_uuid TO fornecedor_id;

      ALTER TABLE fornecedores DROP CONSTRAINT IF EXISTS fornecedores_pkey;
      ALTER TABLE fornecedores DROP COLUMN id;
      ALTER TABLE fornecedores RENAME COLUMN id_uuid TO id;
      ALTER TABLE fornecedores ALTER COLUMN id SET NOT NULL;
      ALTER TABLE fornecedores ALTER COLUMN id SET DEFAULT gen_random_uuid();
      ALTER TABLE fornecedores ADD CONSTRAINT fornecedores_pkey PRIMARY KEY (id);

      ALTER TABLE contas_pagar
        ADD CONSTRAINT contas_pagar_fornecedor_id_fkey
        FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL;

      ALTER TABLE custos_adicionais_producao
        ADD CONSTRAINT custos_adicionais_producao_fornecedor_id_fkey
        FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL;
    `);
  }

  const usuariosPerfilType = await getColumnType("usuarios", "perfil");
  if (usuariosPerfilType !== "integer") {
    pgm.sql(`
      ALTER TABLE usuarios ADD COLUMN perfil_novo integer;
      UPDATE usuarios
      SET perfil_novo = CASE
        WHEN perfil::text = 'admin' THEN 1
        WHEN perfil::text = 'financeiro' THEN 2
        WHEN perfil::text = 'producao' THEN 3
        WHEN perfil::text = 'vendas' THEN 4
        WHEN perfil::text ~ '^[0-9]+$' THEN LEAST(GREATEST((perfil::text)::integer, 1), 4)
        ELSE 4
      END;
      ALTER TABLE usuarios DROP COLUMN perfil;
      ALTER TABLE usuarios RENAME COLUMN perfil_novo TO perfil;
      ALTER TABLE usuarios ALTER COLUMN perfil SET NOT NULL;
      ALTER TABLE usuarios ALTER COLUMN perfil SET DEFAULT 4;
    `);
  }

  if (!(await hasTable("auth_tokens"))) {
    pgm.sql(`
      CREATE TABLE IF NOT EXISTS auth_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        token text UNIQUE NOT NULL,
        criado_em timestamp NOT NULL DEFAULT now(),
        expira_em timestamp NOT NULL,
        revogado_em timestamp,
        ultimo_acesso_em timestamp
      )
    `);
  }

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS auth_tokens_usuario_id_index ON auth_tokens (usuario_id);
    CREATE INDEX IF NOT EXISTS auth_tokens_expira_em_index ON auth_tokens (expira_em);
  `);

  pgm.sql(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type = 'timestamp with time zone'
      LOOP
        EXECUTE format(
          'ALTER TABLE %I ALTER COLUMN %I TYPE timestamp USING (%I AT TIME ZONE ''America/Sao_Paulo'')',
          r.table_name,
          r.column_name,
          r.column_name
        );
      END LOOP;
    END $$;
  `);

  const usuariosResult = await pgm.db.query(
    "SELECT id, nome, email, senha, perfil FROM usuarios",
  );
  for (const usuario of usuariosResult.rows) {
    await pgm.db.query(
      `
      UPDATE usuarios
      SET nome = $2, email = $3, senha = $4, perfil = $5
      WHERE id = $1
      `,
      [
        usuario.id,
        encryptIfNeeded(usuario.nome),
        encryptIfNeeded(String(usuario.email || "").trim().toLowerCase()),
        encryptIfNeeded(usuario.senha),
        toPerfilCode(usuario.perfil),
      ],
    );
  }

  await pgm.db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_bloquear_cliente_protegido'
          AND tgrelid = 'clientes'::regclass
          AND NOT tgisinternal
      ) THEN
        ALTER TABLE clientes DISABLE TRIGGER trg_bloquear_cliente_protegido;
      END IF;
    END $$;
  `);

  const clientesResult = await pgm.db.query(
    "SELECT id, nome, cpf_cnpj, telefone, endereco FROM clientes",
  );
  for (const cliente of clientesResult.rows) {
    await pgm.db.query(
      `
      UPDATE clientes
      SET nome = $2, cpf_cnpj = $3, telefone = $4, endereco = $5
      WHERE id = $1
      `,
      [
        cliente.id,
        encryptIfNeeded(cliente.nome),
        encryptIfNeeded(cliente.cpf_cnpj),
        encryptIfNeeded(cliente.telefone),
        encryptIfNeeded(cliente.endereco),
      ],
    );
  }

  await pgm.db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_bloquear_cliente_protegido'
          AND tgrelid = 'clientes'::regclass
          AND NOT tgisinternal
      ) THEN
        ALTER TABLE clientes ENABLE TRIGGER trg_bloquear_cliente_protegido;
      END IF;
    END $$;
  `);

  const fornecedoresResult = await pgm.db.query(
    "SELECT id, razao_social, cpf_cnpj, telefone, endereco FROM fornecedores",
  );
  for (const fornecedor of fornecedoresResult.rows) {
    await pgm.db.query(
      `
      UPDATE fornecedores
      SET razao_social = $2, cpf_cnpj = $3, telefone = $4, endereco = $5
      WHERE id = $1
      `,
      [
        fornecedor.id,
        encryptIfNeeded(fornecedor.razao_social),
        encryptIfNeeded(fornecedor.cpf_cnpj),
        encryptIfNeeded(fornecedor.telefone),
        encryptIfNeeded(fornecedor.endereco),
      ],
    );
  }

  const usuariosAfterResult = await pgm.db.query("SELECT email FROM usuarios");
  const hasAdmin = usuariosAfterResult.rows.some((row) => {
    const plainEmail = isEncryptedText(row.email) ? decrypt(row.email) : row.email;
    return String(plainEmail || "").trim().toLowerCase() === "admin@cafemvp.com";
  });

  if (!hasAdmin) {
    await pgm.db.query(
      `
      INSERT INTO usuarios (id, nome, email, senha, perfil, ativo, criado_em)
      VALUES (gen_random_uuid(), $1, $2, $3, 1, true, $4)
      `,
      [
        encrypt("Administrador"),
        encrypt("admin@cafemvp.com"),
        encrypt("mvp_admin_123"),
        toLocalDateTime(),
      ],
    );
  }
};

exports.down = (pgm) => {
  pgm.dropTable("auth_tokens", { ifExists: true });
};
