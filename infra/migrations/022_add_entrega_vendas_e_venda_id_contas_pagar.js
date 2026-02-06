exports.up = (pgm) => {
  pgm.addColumns("vendas", {
    data_programada_entrega: { type: "date" },
    data_entrega: { type: "date" },
    status_entrega: {
      type: "text",
      notNull: true,
      default: "PENDENTE",
    },
  });

  pgm.addColumns("contas_pagar", {
    venda_id: {
      type: "text",
      references: "vendas",
      onDelete: "CASCADE",
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("contas_pagar", ["venda_id"]);
  pgm.dropColumns("vendas", [
    "data_programada_entrega",
    "data_entrega",
    "status_entrega",
  ]);
};
