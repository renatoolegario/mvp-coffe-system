/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS transferencias (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      origem_id text NOT NULL REFERENCES insumos ON DELETE RESTRICT,
      destino_id text NOT NULL REFERENCES insumos ON DELETE RESTRICT,
      quantidade_kg numeric(10,3) NOT NULL,
      custo_unitario numeric(15,4) NOT NULL,
      data_transferencia timestamp NOT NULL DEFAULT current_timestamp,
      obs text
    )
  `);
};

exports.down = (pgm) => {
    pgm.sql("DROP TABLE IF EXISTS transferencias");
};
