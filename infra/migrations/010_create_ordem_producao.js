exports.up = (pgm) => {
  pgm.createTable("ordem_producao", {
    id: { type: "text", primaryKey: true },
    data_fabricacao: { type: "timestamptz", notNull: true },
    tipo_cafe_id: {
      type: "text",
      references: "tipos_cafe",
      onDelete: "SET NULL",
    },
    quantidade_gerada: { type: "numeric", notNull: true },
    quantidade_insumo: { type: "numeric", notNull: true },
    insumo_id: {
      type: "text",
      references: "insumos",
      onDelete: "SET NULL",
    },
    custo_total: { type: "numeric", notNull: true },
    status: { type: "text", notNull: true },
    obs: { type: "text" },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("ordem_producao");
};
