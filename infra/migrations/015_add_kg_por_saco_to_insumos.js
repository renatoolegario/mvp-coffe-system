exports.up = (pgm) => {
  pgm.addColumn("insumos", {
    kg_por_saco: {
      type: "numeric",
      notNull: true,
      default: 1,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("insumos", "kg_por_saco");
};
