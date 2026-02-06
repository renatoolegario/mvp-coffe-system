exports.up = (pgm) => {
  pgm.createTable("empresa_configuracao_integracoes", {
    provedor: { type: "text", primaryKey: true },
    chave_criptografada: { type: "text", notNull: true },
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
};

exports.down = (pgm) => {
  pgm.dropTable("empresa_configuracao_integracoes");
};
