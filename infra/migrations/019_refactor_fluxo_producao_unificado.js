exports.up = (pgm) => {
  pgm.addColumn("insumos", {
    preco_kg: {
      type: "numeric",
      notNull: true,
      default: 0,
    },
    tipo: {
      type: "text",
      notNull: true,
      default: "MATERIA_PRIMA",
    },
  });

  pgm.createTable("producao", {
    id: { type: "text", primaryKey: true },
    data_producao: { type: "timestamptz", notNull: true },
    insumo_final_id: {
      type: "text",
      notNull: true,
      references: "insumos",
      onDelete: "RESTRICT",
    },
    status: { type: "smallint", notNull: true, default: 1 },
    modo_geracao: { type: "text", notNull: true },
    taxa_conversao_planejada: { type: "numeric", notNull: true, default: 76 },
    taxa_conversao_real: { type: "numeric" },
    peso_previsto: { type: "numeric", notNull: true, default: 0 },
    peso_real: { type: "numeric" },
    anexo_base64: { type: "text" },
    custo_total_previsto: { type: "numeric", notNull: true, default: 0 },
    custo_total_real: { type: "numeric" },
    custo_unitario_real: { type: "numeric" },
    obs: { type: "text" },
    criado_em: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createTable("detalhes_producao", {
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
    quantidade_kg: { type: "numeric", notNull: true },
    custo_unitario_previsto: { type: "numeric", notNull: true, default: 0 },
    custo_total_previsto: { type: "numeric", notNull: true, default: 0 },
  });

  pgm.createTable("custos_adicionais_producao", {
    id: { type: "text", primaryKey: true },
    producao_id: {
      type: "text",
      notNull: true,
      references: "producao",
      onDelete: "CASCADE",
    },
    fornecedor_id: {
      type: "text",
      references: "fornecedores",
      onDelete: "SET NULL",
    },
    descricao: { type: "text", notNull: true },
    valor: { type: "numeric", notNull: true },
    status_pagamento: { type: "text", notNull: true, default: "PENDENTE" },
  });

  pgm.createTable("movimento_producao", {
    id: { type: "text", primaryKey: true },
    insumo_id: {
      type: "text",
      references: "insumos",
      onDelete: "SET NULL",
    },
    tipo_movimento: { type: "text", notNull: true },
    custo_unitario: { type: "numeric", notNull: true, default: 0 },
    quantidade_entrada: { type: "numeric", notNull: true, default: 0 },
    quantidade_saida: { type: "numeric", notNull: true, default: 0 },
    data_movimentacao: { type: "timestamptz", notNull: true },
    referencia_tipo: { type: "text" },
    referencia_id: { type: "text" },
    obs: { type: "text" },
  });

  pgm.dropTable("mov_lotes", { ifExists: true, cascade: true });
  pgm.dropTable("ordem_producao", { ifExists: true, cascade: true });
  pgm.dropTable("tipos_cafe", { ifExists: true, cascade: true });
  pgm.dropTable("mov_insumos", { ifExists: true, cascade: true });
  pgm.dropTable("entrada_insumos", { ifExists: true, cascade: true });
};

exports.down = (pgm) => {
  pgm.createTable("entrada_insumos", {
    id: { type: "text", primaryKey: true },
    fornecedor_id: {
      type: "text",
      references: "fornecedores",
      onDelete: "SET NULL",
    },
    data_entrada: { type: "timestamptz", notNull: true },
    valor_total: { type: "numeric", notNull: true },
    forma_pagamento: { type: "text" },
    parcelas_qtd: { type: "integer" },
    obs: { type: "text" },
    status: { type: "text", notNull: true },
  });

  pgm.createTable("mov_insumos", {
    id: { type: "text", primaryKey: true },
    insumo_id: {
      type: "text",
      references: "insumos",
      onDelete: "SET NULL",
    },
    tipo: { type: "text", notNull: true },
    quantidade: { type: "numeric", notNull: true },
    custo_unit: { type: "numeric", notNull: true },
    custo_total: { type: "numeric", notNull: true },
    data: { type: "timestamptz", notNull: true },
    referencia_tipo: { type: "text" },
    referencia_id: { type: "text" },
    obs: { type: "text" },
  });

  pgm.createTable("tipos_cafe", {
    id: { type: "text", primaryKey: true },
    nome: { type: "text", notNull: true },
    insumo_id: {
      type: "text",
      references: "insumos",
      onDelete: "SET NULL",
    },
    rendimento_percent: { type: "numeric" },
    margem_lucro_percent: { type: "numeric" },
    ativo: { type: "boolean", notNull: true, default: true },
  });

  pgm.createTable("ordem_producao", {
    id: { type: "text", primaryKey: true },
    data_fabricacao: { type: "timestamptz", notNull: true },
    tipo_cafe_id: {
      type: "text",
      references: "tipos_cafe",
      onDelete: "SET NULL",
    },
    quantidade_gerada: { type: "numeric", notNull: true },
    quantidade_insumo: { type: "numeric", notNull: true },
    insumo_id: {
      type: "text",
      references: "insumos",
      onDelete: "SET NULL",
    },
    custo_total: { type: "numeric", notNull: true },
    status: { type: "text", notNull: true },
    obs: { type: "text" },
  });

  pgm.createTable("mov_lotes", {
    id: { type: "text", primaryKey: true },
    tipo_cafe_id: {
      type: "text",
      references: "tipos_cafe",
      onDelete: "SET NULL",
    },
    tipo: { type: "text", notNull: true },
    quantidade: { type: "numeric", notNull: true },
    custo_unit: { type: "numeric", notNull: true },
    custo_total: { type: "numeric", notNull: true },
    data: { type: "timestamptz", notNull: true },
    referencia_tipo: { type: "text" },
    referencia_id: { type: "text" },
    obs: { type: "text" },
  });

  pgm.dropTable("movimento_producao", { ifExists: true, cascade: true });
  pgm.dropTable("custos_adicionais_producao", {
    ifExists: true,
    cascade: true,
  });
  pgm.dropTable("detalhes_producao", { ifExists: true, cascade: true });
  pgm.dropTable("producao", { ifExists: true, cascade: true });

  pgm.dropColumn("insumos", ["preco_kg", "tipo"]);
};
