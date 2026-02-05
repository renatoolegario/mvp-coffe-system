exports.up = (pgm) => {
  pgm.createTable("mov_lotes", {
    id: { type: "text", primaryKey: true },
    tipo_cafe_id: {
      type: "text",
      references: "tipos_cafe",
      onDelete: "SET NULL",
    },
    tipo: { type: "text", notNull: true },
    quantidade: { type: "numeric", notNull: true },
    custo_unit: { type: "numeric", notNull: true },
    custo_total: { type: "numeric", notNull: true },
    data: { type: "timestamptz", notNull: true },
    referencia_tipo: { type: "text" },
    referencia_id: { type: "text" },
    obs: { type: "text" },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("mov_lotes");
};
