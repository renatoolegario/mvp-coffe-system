/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
    pgm.sql(`
    ALTER TABLE producao
      DROP COLUMN IF EXISTS peso_previsto,
      DROP COLUMN IF EXISTS taxa_conversao_planejada,
      DROP COLUMN IF EXISTS taxa_conversao_real
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
    pgm.sql(`
    ALTER TABLE producao
      ADD COLUMN IF NOT EXISTS peso_previsto numeric(10,3) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS taxa_conversao_planejada numeric(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS taxa_conversao_real numeric(5,2) DEFAULT 0
  `);
};
