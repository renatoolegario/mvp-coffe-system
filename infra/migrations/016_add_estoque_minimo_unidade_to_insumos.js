exports.up = (pgm) => {
  pgm.addColumn("insumos", {
    estoque_minimo_unidade: {
      type: "text",
      notNull: true,
      default: "kg",
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("insumos", "estoque_minimo_unidade");
};
