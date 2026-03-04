exports.up = (pgm) => {
  pgm.createTable("feedback", {
    id: { type: "text", primaryKey: true },
    data: { type: "date", notNull: true },
    nome_pagina: { type: "text" },
    descricao: { type: "text", notNull: true },
    anexo_base64: { type: "text" },
    status: {
      type: "text",
      notNull: true,
      default: "PROGRAMADO",
      check: "status IN ('PROGRAMADO', 'FINALIZADO')",
    },
    finalizado_em: { type: "timestamptz" },
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

  pgm.createIndex("feedback", ["status", "data"], {
    name: "feedback_status_data_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("feedback");
};
