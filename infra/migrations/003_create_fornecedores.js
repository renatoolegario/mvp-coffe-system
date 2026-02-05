exports.up = (pgm) => {
  pgm.createTable("fornecedores", {
    id: { type: "text", primaryKey: true },
    razao_social: { type: "text", notNull: true },
    cpf_cnpj: { type: "text", notNull: true },
    telefone: { type: "text" },
    endereco: { type: "text" },
    ativo: { type: "boolean", notNull: true, default: true },
    criado_em: { type: "timestamptz", notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("fornecedores");
};
