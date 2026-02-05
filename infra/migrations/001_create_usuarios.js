exports.up = (pgm) => {
  pgm.createTable("usuarios", {
    id: { type: "text", primaryKey: true },
    nome: { type: "text", notNull: true },
    email: { type: "text", notNull: true },
    senha: { type: "text", notNull: true },
    perfil: { type: "text", notNull: true },
    ativo: { type: "boolean", notNull: true, default: true },
    criado_em: { type: "timestamptz", notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("usuarios");
};
