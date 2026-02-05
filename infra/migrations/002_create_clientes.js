exports.up = (pgm) => {
  pgm.createTable("clientes", {
    id: { type: "text", primaryKey: true },
    nome: { type: "text", notNull: true },
    cpf_cnpj: { type: "text", notNull: true },
    telefone: { type: "text" },
    endereco: { type: "text" },
    ativo: { type: "boolean", notNull: true, default: true },
    criado_em: { type: "timestamptz", notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("clientes");
};
