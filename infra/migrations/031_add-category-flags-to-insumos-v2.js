/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    ALTER TABLE insumos
      ADD COLUMN IF NOT EXISTS pode_ser_insumo boolean,
      ADD COLUMN IF NOT EXISTS pode_ser_produzivel boolean,
      ADD COLUMN IF NOT EXISTS pode_ser_vendido boolean
  `);

    // Garante valores para linhas antigas (quando a coluna já existia sem defaults/not null).
    pgm.sql(`
    UPDATE insumos
    SET
      pode_ser_insumo = COALESCE(pode_ser_insumo, true),
      pode_ser_produzivel = COALESCE(pode_ser_produzivel, false),
      pode_ser_vendido = COALESCE(pode_ser_vendido, false)
  `);

    pgm.sql(`
    ALTER TABLE insumos
      ALTER COLUMN pode_ser_insumo SET DEFAULT true,
      ALTER COLUMN pode_ser_produzivel SET DEFAULT false,
      ALTER COLUMN pode_ser_vendido SET DEFAULT false,
      ALTER COLUMN pode_ser_insumo SET NOT NULL,
      ALTER COLUMN pode_ser_produzivel SET NOT NULL,
      ALTER COLUMN pode_ser_vendido SET NOT NULL
  `);

    // Atualiza categorias baseadas em dados existentes
    // "MATERIA_PRIMA" geralmente é o insumo principal
    pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'insumos'
          AND column_name = 'tipo'
      ) THEN
        UPDATE insumos
        SET pode_ser_insumo = true, pode_ser_produzivel = false, pode_ser_vendido = true
        WHERE tipo = 'MATERIA_PRIMA';
      END IF;
    END $$;
  `);
};

exports.down = pgm => {
    pgm.sql(`
    ALTER TABLE insumos
      DROP COLUMN IF EXISTS pode_ser_insumo,
      DROP COLUMN IF EXISTS pode_ser_produzivel,
      DROP COLUMN IF EXISTS pode_ser_vendido
  `);
};
