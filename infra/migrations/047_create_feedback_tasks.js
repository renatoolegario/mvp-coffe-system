exports.up = (pgm) => {
  pgm.createTable("feedback_tasks", {
    id: { type: "serial", primaryKey: true },
    descricao: { type: "text", notNull: true },
    onde: { type: "varchar(255)", notNull: true },
    quem: { type: "varchar(255)" },
    url_anexo: { type: "text" },
    url_anexos: { type: "text[]" },
    status: {
      type: "integer",
      notNull: true,
      default: 1,
      check: "status IN (1, 2, 3)",
    },
    git_commit: { type: "varchar(120)" },
    parecer: { type: "text" },
    legacy_feedback_id: { type: "text", unique: true },
    criado_em: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    atualizado_em: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("feedback_tasks", ["status", "id"], {
    name: "feedback_tasks_status_id_idx",
  });
  pgm.createIndex("feedback_tasks", ["onde"], {
    name: "feedback_tasks_onde_idx",
  });
  pgm.createIndex("feedback_tasks", ["criado_em"], {
    name: "feedback_tasks_criado_em_idx",
  });

  pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('public.feedback') IS NOT NULL THEN
        INSERT INTO feedback_tasks (
          descricao,
          onde,
          quem,
          url_anexo,
          url_anexos,
          status,
          git_commit,
          parecer,
          legacy_feedback_id,
          criado_em,
          atualizado_em
        )
        SELECT
          f.descricao,
          COALESCE(NULLIF(BTRIM(f.nome_pagina), ''), 'Configuração da Empresa'),
          NULL,
          NULLIF(BTRIM(f.anexo_base64), ''),
          CASE
            WHEN NULLIF(BTRIM(f.anexo_base64), '') IS NULL THEN NULL
            ELSE ARRAY[NULLIF(BTRIM(f.anexo_base64), '')]
          END,
          CASE
            WHEN UPPER(COALESCE(f.status, '')) = 'FINALIZADO' THEN 3
            ELSE 1
          END,
          NULL,
          CASE
            WHEN UPPER(COALESCE(f.status, '')) = 'FINALIZADO'
              THEN 'Migrado automaticamente do fluxo legado de configuração da empresa.'
            ELSE NULL
          END,
          f.id,
          COALESCE(f.criado_em, now()),
          COALESCE(f.atualizado_em, f.criado_em, now())
        FROM feedback f
        WHERE NOT EXISTS (
          SELECT 1
          FROM feedback_tasks ft
          WHERE ft.legacy_feedback_id = f.id
        );
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable("feedback_tasks");
};
