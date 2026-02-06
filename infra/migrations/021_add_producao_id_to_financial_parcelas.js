exports.up = (pgm) => {
  pgm.addColumn("contas_pagar_parcelas", {
    producao_id: {
      type: "text",
      references: "producao",
      onDelete: "CASCADE",
    },
  });

  pgm.addColumn("contas_receber_parcelas", {
    producao_id: {
      type: "text",
      references: "producao",
      onDelete: "CASCADE",
    },
  });

  pgm.sql(`
    UPDATE contas_pagar_parcelas cpp
    SET producao_id = cp.producao_id
    FROM contas_pagar cp
    WHERE cp.id = cpp.conta_pagar_id
      AND cp.producao_id IS NOT NULL
  `);

  pgm.sql(`
    UPDATE contas_receber_parcelas crp
    SET producao_id = cr.producao_id
    FROM contas_receber cr
    WHERE cr.id = crp.conta_receber_id
      AND cr.producao_id IS NOT NULL
  `);

  pgm.createIndex("contas_pagar_parcelas", "producao_id");
  pgm.createIndex("contas_receber_parcelas", "producao_id");
};

exports.down = (pgm) => {
  pgm.dropIndex("contas_pagar_parcelas", "producao_id", { ifExists: true });
  pgm.dropIndex("contas_receber_parcelas", "producao_id", {
    ifExists: true,
  });

  pgm.dropColumn("contas_pagar_parcelas", "producao_id");
  pgm.dropColumn("contas_receber_parcelas", "producao_id");
};
