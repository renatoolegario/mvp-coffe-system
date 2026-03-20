exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS data_aniversario date;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE clientes
    DROP COLUMN IF EXISTS data_aniversario;
  `);
};
