exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE contas_receber_parcelas
    ADD COLUMN IF NOT EXISTS asaas_cobranca_emitida boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS asaas_cobranca_status text,
    ADD COLUMN IF NOT EXISTS asaas_cobranca_link text
  `);

  pgm.sql(`
    UPDATE contas_receber_parcelas crp
    SET
      asaas_cobranca_emitida =
        CASE
          WHEN ac.conta_receber_parcela_id IS NULL THEN false
          WHEN ac.deleted = true OR UPPER(COALESCE(ac.status, '')) = 'DELETED' THEN false
          ELSE true
        END,
      asaas_cobranca_status = ac.status,
      asaas_cobranca_link = CASE
        WHEN ac.deleted = true OR UPPER(COALESCE(ac.status, '')) = 'DELETED' THEN NULL
        ELSE COALESCE(NULLIF(ac.invoice_url, ''), NULLIF(ac.bank_slip_url, ''))
      END
    FROM (
      SELECT DISTINCT ON (conta_receber_parcela_id)
        conta_receber_parcela_id,
        status,
        deleted,
        invoice_url,
        bank_slip_url
      FROM asaas_cobrancas
      WHERE COALESCE(conta_receber_parcela_id, '') <> ''
      ORDER BY conta_receber_parcela_id, deleted ASC, atualizado_em DESC, criado_em DESC
    ) ac
    WHERE crp.id = ac.conta_receber_parcela_id
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE contas_receber_parcelas
    DROP COLUMN IF EXISTS asaas_cobranca_link,
    DROP COLUMN IF EXISTS asaas_cobranca_status,
    DROP COLUMN IF EXISTS asaas_cobranca_emitida
  `);
};
