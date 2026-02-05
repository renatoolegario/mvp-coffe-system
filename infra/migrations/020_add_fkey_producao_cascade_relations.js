exports.up = (pgm) => {
  pgm.addColumn("movimento_producao", {
    producao_id: {
      type: "text",
      references: "producao",
      onDelete: "CASCADE",
    },
  });

  pgm.addColumn("contas_pagar", {
    producao_id: {
      type: "text",
      references: "producao",
      onDelete: "CASCADE",
    },
  });

  pgm.addColumn("contas_receber", {
    producao_id: {
      type: "text",
      references: "producao",
      onDelete: "CASCADE",
    },
  });

  pgm.sql(`
    UPDATE movimento_producao
    SET producao_id = referencia_id
    WHERE referencia_tipo = 'producao'
      AND referencia_id IS NOT NULL
  `);

  pgm.sql(`
    UPDATE contas_pagar
    SET producao_id = origem_id
    WHERE origem_tipo = 'custo_adicional_producao'
      AND origem_id IS NOT NULL
  `);

  pgm.sql(`
    UPDATE contas_receber
    SET producao_id = origem_id
    WHERE origem_tipo = 'producao'
      AND origem_id IS NOT NULL
  `);

  pgm.createIndex("movimento_producao", "producao_id");
  pgm.createIndex("contas_pagar", "producao_id");
  pgm.createIndex("contas_receber", "producao_id");
};

exports.down = (pgm) => {
  pgm.dropIndex("movimento_producao", "producao_id", { ifExists: true });
  pgm.dropIndex("contas_pagar", "producao_id", { ifExists: true });
  pgm.dropIndex("contas_receber", "producao_id", { ifExists: true });

  pgm.dropColumn("movimento_producao", "producao_id");
  pgm.dropColumn("contas_pagar", "producao_id");
  pgm.dropColumn("contas_receber", "producao_id");
};
