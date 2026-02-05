exports.up = (pgm) => {
  pgm.createTable("vendas", {
    id: { type: "text", primaryKey: true },
    cliente_id: {
      type: "text",
      references: "clientes",
      onDelete: "SET NULL",
    },
    data_venda: { type: "timestamptz", notNull: true },
    valor_total: { type: "numeric", notNull: true },
    parcelas_qtd: { type: "integer" },
    valor_negociado: { type: "numeric" },
    status: { type: "text", notNull: true },
    obs: { type: "text" },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("vendas");
};
