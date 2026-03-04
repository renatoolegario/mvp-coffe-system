exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS email text
  `);

  pgm.sql(`
    ALTER TABLE fornecedores
    ADD COLUMN IF NOT EXISTS email text
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS clientes_email_unique
    ON clientes (email)
    WHERE COALESCE(email, '') <> ''
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS fornecedores_email_unique
    ON fornecedores (email)
    WHERE COALESCE(email, '') <> ''
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS clientes_cpf_cnpj_unique
    ON clientes (cpf_cnpj)
    WHERE COALESCE(cpf_cnpj, '') <> ''
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS fornecedores_cpf_cnpj_unique
    ON fornecedores (cpf_cnpj)
    WHERE COALESCE(cpf_cnpj, '') <> ''
  `);
};

exports.down = (pgm) => {
  pgm.sql("DROP INDEX IF EXISTS clientes_email_unique");
  pgm.sql("DROP INDEX IF EXISTS fornecedores_email_unique");
  pgm.sql("DROP INDEX IF EXISTS clientes_cpf_cnpj_unique");
  pgm.sql("DROP INDEX IF EXISTS fornecedores_cpf_cnpj_unique");
  pgm.sql("ALTER TABLE clientes DROP COLUMN IF EXISTS email");
  pgm.sql("ALTER TABLE fornecedores DROP COLUMN IF EXISTS email");
};
