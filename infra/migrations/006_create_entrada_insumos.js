exports.up = (pgm) => {
  pgm.createTable("entrada_insumos", {
    id: { type: "text", primaryKey: true },
    fornecedor_id: {
      type: "text",
      references: "fornecedores",
      onDelete: "SET NULL",
    },
    data_entrada: { type: "timestamptz", notNull: true },
    valor_total: { type: "numeric", notNull: true },
    forma_pagamento: { type: "text" },
    parcelas_qtd: { type: "integer" },
    obs: { type: "text" },
    status: { type: "text", notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("entrada_insumos");
};
