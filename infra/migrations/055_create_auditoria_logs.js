exports.up = (pgm) => {
  pgm.sql("CREATE EXTENSION IF NOT EXISTS pgcrypto");

  pgm.createTable("auditoria_logs", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    tipo: { type: "varchar(30)", notNull: true },
    chave: { type: "varchar(120)", notNull: true },
    descricao: { type: "varchar(255)", notNull: true },
    endpoint: { type: "varchar(255)", notNull: true },
    metodo: { type: "varchar(12)", notNull: true },
    origem: { type: "varchar(120)", notNull: true },
    status: { type: "varchar(40)", notNull: true },
    http_status: { type: "integer" },
    evento: { type: "varchar(120)" },
    referencia: { type: "varchar(255)" },
    request_headers: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    request_payload: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    response_payload: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    metadados: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    erro: { type: "text" },
    executado_em: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    criado_em: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("auditoria_logs", ["tipo", "executado_em"], {
    name: "auditoria_logs_tipo_executado_em_idx",
  });
  pgm.createIndex("auditoria_logs", ["status", "executado_em"], {
    name: "auditoria_logs_status_executado_em_idx",
  });
  pgm.createIndex("auditoria_logs", ["chave", "executado_em"], {
    name: "auditoria_logs_chave_executado_em_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("auditoria_logs");
};
