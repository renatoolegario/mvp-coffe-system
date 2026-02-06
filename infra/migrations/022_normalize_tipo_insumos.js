exports.up = (pgm) => {
  pgm.sql(`
    UPDATE insumos
    SET tipo = CASE
      WHEN UPPER(COALESCE(tipo, '')) = 'FISICO' THEN 'FISICO'
      ELSE 'CONSUMIVEL'
    END
  `);

  pgm.alterColumn("insumos", "tipo", {
    type: "text",
    notNull: true,
    default: "CONSUMIVEL",
  });
};

exports.down = (pgm) => {
  pgm.alterColumn("insumos", "tipo", {
    type: "text",
    notNull: true,
    default: "MATERIA_PRIMA",
  });

  pgm.sql(`
    UPDATE insumos
    SET tipo = CASE
      WHEN tipo = 'FISICO' THEN 'FISICO'
      ELSE 'MATERIA_PRIMA'
    END
  `);
};
