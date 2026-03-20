exports.up = (pgm) => {
  pgm.sql("CREATE EXTENSION IF NOT EXISTS pgcrypto");

  pgm.sql(`
    ALTER TABLE empresa_configuracao_integracoes
    ADD COLUMN IF NOT EXISTS configuracao jsonb NOT NULL DEFAULT '{}'::jsonb
  `);

  pgm.sql(`
    ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS asaas_customer_id text
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS clientes_asaas_customer_id_unique
    ON clientes (asaas_customer_id)
    WHERE COALESCE(asaas_customer_id, '') <> ''
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS asaas_cobrancas (
      id text PRIMARY KEY,
      asaas_payment_id text NOT NULL UNIQUE,
      asaas_customer_id text NOT NULL,
      cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE,
      venda_id text REFERENCES vendas(id) ON DELETE SET NULL,
      conta_receber_id text REFERENCES contas_receber(id) ON DELETE SET NULL,
      conta_receber_parcela_id text REFERENCES contas_receber_parcelas(id) ON DELETE SET NULL,
      origem_tipo text NOT NULL,
      descricao text,
      billing_type text NOT NULL,
      status text NOT NULL DEFAULT 'PENDING',
      due_date date NOT NULL,
      value numeric NOT NULL DEFAULT 0,
      external_reference text,
      invoice_url text,
      bank_slip_url text,
      pix_payload text,
      deleted boolean NOT NULL DEFAULT false,
      last_event text,
      last_event_at timestamp,
      raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      criado_em timestamp NOT NULL DEFAULT now(),
      atualizado_em timestamp NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS asaas_cobrancas_cliente_id_idx
    ON asaas_cobrancas (cliente_id)
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS asaas_cobrancas_venda_id_idx
    ON asaas_cobrancas (venda_id)
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS asaas_cobrancas_due_date_idx
    ON asaas_cobrancas (due_date)
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS asaas_cobrancas_status_idx
    ON asaas_cobrancas (status)
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS email_notificacoes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      categoria text NOT NULL,
      referencia_data date NOT NULL,
      destinatario text NOT NULL,
      provider_message_id text,
      status text NOT NULL DEFAULT 'PENDENTE',
      erro text,
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      criado_em timestamp NOT NULL DEFAULT now(),
      atualizado_em timestamp NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS email_notificacoes_categoria_data_destinatario_unique
    ON email_notificacoes (categoria, referencia_data, destinatario)
  `);
};

exports.down = (pgm) => {
  pgm.sql("DROP INDEX IF EXISTS email_notificacoes_categoria_data_destinatario_unique");
  pgm.sql("DROP TABLE IF EXISTS email_notificacoes");

  pgm.sql("DROP INDEX IF EXISTS asaas_cobrancas_status_idx");
  pgm.sql("DROP INDEX IF EXISTS asaas_cobrancas_due_date_idx");
  pgm.sql("DROP INDEX IF EXISTS asaas_cobrancas_venda_id_idx");
  pgm.sql("DROP INDEX IF EXISTS asaas_cobrancas_cliente_id_idx");
  pgm.sql("DROP TABLE IF EXISTS asaas_cobrancas");

  pgm.sql("DROP INDEX IF EXISTS clientes_asaas_customer_id_unique");
  pgm.sql("ALTER TABLE clientes DROP COLUMN IF EXISTS asaas_customer_id");

  pgm.sql(
    "ALTER TABLE empresa_configuracao_integracoes DROP COLUMN IF EXISTS configuracao",
  );
};
