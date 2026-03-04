exports.up = (pgm) => {
  pgm.sql(`
    DELETE FROM usuarios u
    USING (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY email
          ORDER BY criado_em DESC NULLS LAST, id DESC
        ) AS rn
      FROM usuarios
    ) d
    WHERE u.id = d.id
      AND d.rn > 1
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_unique
    ON usuarios (email)
  `);
};

exports.down = (pgm) => {
  pgm.sql("DROP INDEX IF EXISTS usuarios_email_unique");
};
