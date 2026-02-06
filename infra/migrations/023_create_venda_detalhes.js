exports.up = (pgm) => {
  pgm.createTable("venda_detalhes", {
    id: { type: "text", primaryKey: true },
    venda_id: {
      type: "text",
      notNull: true,
      references: "vendas",
      onDelete: "CASCADE",
    },
    parcela_id: {
      type: "text",
      references: "contas_receber_parcelas",
      onDelete: "SET NULL",
    },
    tipo_evento: { type: "text", notNull: true },
    descricao: { type: "text", notNull: true },
    valor: { type: "numeric", notNull: true },
    data_evento: { type: "timestamptz", notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("venda_detalhes");
};
