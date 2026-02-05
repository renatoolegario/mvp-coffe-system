exports.up = (pgm) => {
  pgm.createTable("contas_receber_parcelas", {
    id: { type: "text", primaryKey: true },
    conta_receber_id: {
      type: "text",
      references: "contas_receber",
      onDelete: "CASCADE",
    },
    parcela_num: { type: "integer", notNull: true },
    vencimento: { type: "timestamptz", notNull: true },
    valor: { type: "numeric", notNull: true },
    status: { type: "text", notNull: true },
    data_recebimento: { type: "timestamptz" },
    forma_recebimento: { type: "text" },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("contas_receber_parcelas");
};
