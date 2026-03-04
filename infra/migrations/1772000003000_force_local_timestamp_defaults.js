exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    DECLARE
      rec record;
    BEGIN
      FOR rec IN
        SELECT table_schema, table_name, column_name, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type = 'timestamp without time zone'
          AND column_default IS NOT NULL
          AND (
            column_default ILIKE '%now()%'
            OR column_default ILIKE '%CURRENT_TIMESTAMP%'
            OR column_default ILIKE '%transaction_timestamp()%'
          )
          AND column_default NOT ILIKE '%timezone(''America/Sao_Paulo''%'
      LOOP
        EXECUTE format(
          'ALTER TABLE %I.%I ALTER COLUMN %I SET DEFAULT timezone(''America/Sao_Paulo'', now())',
          rec.table_schema,
          rec.table_name,
          rec.column_name
        );
      END LOOP;
    END $$;
  `);
};

exports.down = () => {};
