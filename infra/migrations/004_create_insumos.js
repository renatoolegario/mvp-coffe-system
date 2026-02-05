exports.up = (pgm) => {
  pgm.createTable("insumos", {
    id: { type: "text", primaryKey: true },
    nome: { type: "text", notNull: true },
    unidade: { type: "text", notNull: true },
    estoque_minimo: { type: "numeric" },
    ativo: { type: "boolean", notNull: true, default: true },
    criado_em: { type: "timestamptz", notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("insumos");
};
