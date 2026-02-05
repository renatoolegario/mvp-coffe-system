exports.up = (pgm) => {
  pgm.createTable("mov_insumos", {
    id: { type: "text", primaryKey: true },
    insumo_id: {
      type: "text",
      references: "insumos",
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
  pgm.dropTable("mov_insumos");
};
