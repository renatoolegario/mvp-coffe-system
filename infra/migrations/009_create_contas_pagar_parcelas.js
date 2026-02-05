exports.up = (pgm) => {
  pgm.createTable("contas_pagar_parcelas", {
    id: { type: "text", primaryKey: true },
    conta_pagar_id: {
      type: "text",
      references: "contas_pagar",
      onDelete: "CASCADE",
    },
    parcela_num: { type: "integer", notNull: true },
    vencimento: { type: "timestamptz", notNull: true },
    valor: { type: "numeric", notNull: true },
    status: { type: "text", notNull: true },
    data_pagamento: { type: "timestamptz" },
    forma_pagamento: { type: "text" },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("contas_pagar_parcelas");
};
