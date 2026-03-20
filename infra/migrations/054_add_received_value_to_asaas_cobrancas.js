exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE asaas_cobrancas
    ADD COLUMN IF NOT EXISTS received_value numeric
  `);

  pgm.sql(`
    UPDATE asaas_cobrancas
    SET
      value = COALESCE(
        NULLIF(raw_payload->>'originalValue', '')::numeric,
        value
      ),
      received_value = CASE
        WHEN COALESCE(raw_payload->>'status', '') IN (
          'CONFIRMED',
          'RECEIVED',
          'RECEIVED_IN_CASH',
          'REFUNDED'
        )
          THEN COALESCE(
            NULLIF(raw_payload->>'value', '')::numeric,
            received_value
          )
        ELSE received_value
      END
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE asaas_cobrancas
    DROP COLUMN IF EXISTS received_value
  `);
};
