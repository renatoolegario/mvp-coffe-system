exports.up = (pgm) => {
  pgm.createTable("empresa_configuracao_estoque", {
    chave: { type: "text", primaryKey: true },
    label: { type: "text", notNull: true },
    percentual_min: { type: "numeric", notNull: true },
    percentual_max: { type: "numeric" },
    ordem: { type: "integer", notNull: true },
    criado_em: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    atualizado_em: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.sql(`
    INSERT INTO empresa_configuracao_estoque (chave, label, percentual_min, percentual_max, ordem)
    VALUES
      ('CRITICO', 'Crítico', 0, 30, 1),
      ('NORMAL', 'Normal', 30, 80, 2),
      ('ELEVADO', 'Elevado', 80, 130, 3),
      ('EXCESSO', 'Excesso', 130, NULL, 4)
  `);
};

exports.down = (pgm) => {
  pgm.dropTable("empresa_configuracao_estoque");
};
