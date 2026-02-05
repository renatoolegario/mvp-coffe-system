exports.up = (pgm) => {
  pgm.addColumn("tipos_cafe", {
    kg_saco_venda: {
      type: "numeric",
      notNull: true,
      default: 1,
      check: "kg_saco_venda > 0",
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("tipos_cafe", "kg_saco_venda");
};
