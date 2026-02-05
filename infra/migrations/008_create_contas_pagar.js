exports.up = (pgm) => {
  pgm.createTable("contas_pagar", {
    id: { type: "text", primaryKey: true },
    fornecedor_id: {
      type: "text",
      references: "fornecedores",
      onDelete: "SET NULL",
    },
    origem_tipo: { type: "text" },
    origem_id: { type: "text" },
    valor_total: { type: "numeric", notNull: true },
    data_emissao: { type: "timestamptz", notNull: true },
    status: { type: "text", notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("contas_pagar");
};
