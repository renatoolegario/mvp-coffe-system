/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("producao_resultados", {
    id: { type: "text", primaryKey: true },
    producao_id: {
      type: "text",
      notNull: true,
      references: "producao",
      onDelete: "CASCADE",
    },
    insumo_id: {
      type: "text",
      notNull: true,
      references: "insumos",
      onDelete: "RESTRICT",
    },
    tipo_resultado: {
      type: "text",
      notNull: true,
      default: "PROGRAMADO",
    },
    quantidade_planejada_kg: {
      type: "numeric",
      notNull: true,
      default: 0,
    },
    quantidade_real_kg: { type: "numeric" },
    criado_em: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.addConstraint(
    "producao_resultados",
    "producao_resultados_tipo_resultado_check",
    {
      check: "tipo_resultado IN ('PROGRAMADO', 'EXTRA')",
    },
  );

  pgm.createIndex("producao_resultados", "producao_id");
  pgm.createIndex("producao_resultados", ["producao_id", "insumo_id", "tipo_resultado"], {
    unique: true,
    name: "producao_resultados_unique_saida",
  });

  pgm.sql(`
    INSERT INTO producao_resultados (
      id,
      producao_id,
      insumo_id,
      tipo_resultado,
      quantidade_planejada_kg,
      quantidade_real_kg,
      criado_em
    )
    SELECT
      'prr-' || substr(md5(random()::text || clock_timestamp()::text || p.id), 1, 24) AS id,
      p.id,
      p.insumo_final_id,
      'PROGRAMADO',
      CASE
        WHEN p.status = 'CONCLUIDA' THEN COALESCE(p.peso_real, 0)
        ELSE 0
      END AS quantidade_planejada_kg,
      CASE
        WHEN p.status = 'CONCLUIDA' THEN COALESCE(p.peso_real, 0)
        ELSE NULL
      END AS quantidade_real_kg,
      COALESCE(p.criado_em, p.data_producao, now()) AS criado_em
    FROM producao p
    WHERE p.insumo_final_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM producao_resultados pr
        WHERE pr.producao_id = p.id
      );
  `);
};

exports.down = (pgm) => {
  pgm.dropIndex("producao_resultados", ["producao_id", "insumo_id", "tipo_resultado"], {
    ifExists: true,
    name: "producao_resultados_unique_saida",
  });
  pgm.dropIndex("producao_resultados", "producao_id", { ifExists: true });
  pgm.dropConstraint("producao_resultados", "producao_resultados_tipo_resultado_check", {
    ifExists: true,
  });
  pgm.dropTable("producao_resultados", { ifExists: true, cascade: true });
};

