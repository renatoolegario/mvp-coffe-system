/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    DO $$
    DECLARE
      status_type text;
    BEGIN
      SELECT data_type
      INTO status_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'producao'
        AND column_name = 'status';

      IF status_type = 'smallint' THEN
        ALTER TABLE producao
          ALTER COLUMN status TYPE text
          USING CASE WHEN status = 1 THEN 'PENDENTE' ELSE 'CONCLUIDA' END,
          ALTER COLUMN status SET DEFAULT 'PENDENTE';
      ELSIF status_type = 'text' THEN
        ALTER TABLE producao
          ALTER COLUMN status SET DEFAULT 'PENDENTE';
      END IF;
    END $$;
  `);
};

exports.down = pgm => {
    pgm.sql(`
    DO $$
    DECLARE
      status_type text;
    BEGIN
      SELECT data_type
      INTO status_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'producao'
        AND column_name = 'status';

      IF status_type = 'text' THEN
        ALTER TABLE producao
          ALTER COLUMN status TYPE smallint
          USING CASE WHEN status = 'PENDENTE' THEN 1 ELSE 2 END,
          ALTER COLUMN status SET DEFAULT 1;
      ELSIF status_type = 'smallint' THEN
        ALTER TABLE producao
          ALTER COLUMN status SET DEFAULT 1;
      END IF;
    END $$;
  `);
};
