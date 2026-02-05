exports.up = (pgm) => {
  pgm.createTable("tipos_cafe", {
    id: { type: "text", primaryKey: true },
    nome: { type: "text", notNull: true },
    insumo_id: {
      type: "text",
      references: "insumos",
      onDelete: "SET NULL",
    },
    rendimento_percent: { type: "numeric" },
    margem_lucro_percent: { type: "numeric" },
    ativo: { type: "boolean", notNull: true, default: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("tipos_cafe");
};
