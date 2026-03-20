exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE fornecedores
    ADD COLUMN IF NOT EXISTS data_aniversario date;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE fornecedores
    DROP COLUMN IF EXISTS data_aniversario;
  `);
};
