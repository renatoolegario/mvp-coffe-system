const path = require("path");
const { randomUUID } = require("crypto");
const CryptoJS = require("crypto-js");

const seedRaw = require(path.resolve(__dirname, "../../docs/seed.json"));

const fmt = (value) => String(value).padStart(2, "0");

const toTimestamp = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value || "").replace("T", " ").replace("Z", "");
  }

  return `${date.getFullYear()}-${fmt(date.getMonth() + 1)}-${fmt(date.getDate())} ${fmt(date.getHours())}:${fmt(date.getMinutes())}:${fmt(date.getSeconds())}`;
};

const toDateOnly = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    const raw = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return null;
  }
  return `${date.getFullYear()}-${fmt(date.getMonth() + 1)}-${fmt(date.getDate())}`;
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const mapUsuariosFromSeed = (usuarios) =>
  safeArray(usuarios).map((usuario) => {
    const { senha_hash, ...rest } = usuario || {};
    return {
      ...rest,
      senha: usuario?.senha ?? senha_hash ?? "",
    };
  });

const normalizeSeedData = (seed) => ({
  usuarios: mapUsuariosFromSeed(seed?.usuarios),
  clientes: safeArray(seed?.clientes),
  fornecedores: safeArray(seed?.fornecedores),
  insumos: safeArray(seed?.insumos),
  producao: safeArray(seed?.producao),
  detalhesProducao: safeArray(seed?.detalhes_producao),
  custosAdicionaisProducao: safeArray(seed?.custos_adicionais_producao),
  movimentoProducao: safeArray(seed?.movimento_producao),
  transferencias: safeArray(seed?.transferencias),
  vendas: safeArray(seed?.vendas),
  vendaItens: safeArray(seed?.venda_itens ?? seed?.vendaItens),
  contasReceber: safeArray(seed?.contas_receber),
  contasReceberParcelas: safeArray(seed?.contas_receber_parcelas),
  contasPagar: safeArray(seed?.contas_pagar),
  contasPagarParcelas: safeArray(seed?.contas_pagar_parcelas),
  vendaDetalhes: safeArray(seed?.venda_detalhes),
});

const getCryptoConfig = () => {
  const secretKey = process.env.SECRET_KEY;
  const ivValue = process.env.IV;

  if (!secretKey || !ivValue) {
    throw new Error("As variaveis SECRET_KEY e IV sao obrigatorias.");
  }

  return {
    key: CryptoJS.SHA256(String(secretKey)),
    iv: CryptoJS.MD5(String(ivValue)),
  };
};

const encrypt = (content) => {
  const { key, iv } = getCryptoConfig();
  return CryptoJS.AES.encrypt(String(content ?? ""), key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
};

const buildInsert = async (pgm, table, columns, rows) => {
  if (!rows.length) return;

  const values = [];
  const placeholders = rows.map((row, rowIndex) => {
    const rowPlaceholders = columns.map(
      (_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`,
    );
    values.push(...columns.map((column) => row[column] ?? null));
    return `(${rowPlaceholders.join(", ")})`;
  });

  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders.join(", ")}`;
  await pgm.db.query(sql, values);
};

const hasColumn = async (pgm, tableName, columnName) => {
  const result = await pgm.db.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `,
    [tableName, columnName],
  );

  return Boolean(result.rows[0]);
};

const toUpperText = (value, fallback = "") =>
  String(value ?? fallback)
    .trim()
    .toUpperCase();

exports.up = async (pgm) => {
  const seed = normalizeSeedData(seedRaw);

  await pgm.db.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");

  const hasClientesEmail = await hasColumn(pgm, "clientes", "email");
  const hasFornecedoresEmail = await hasColumn(pgm, "fornecedores", "email");

  await pgm.db.query(`
    TRUNCATE TABLE
      auth_tokens,
      venda_detalhes,
      venda_itens,
      transferencias,
      custos_adicionais_producao,
      detalhes_producao,
      producao,
      movimento_producao,
      contas_receber_parcelas,
      contas_receber,
      contas_pagar_parcelas,
      contas_pagar,
      vendas,
      insumos,
      fornecedores,
      clientes,
      usuarios
    RESTART IDENTITY CASCADE
  `);

  const unidadesResult = await pgm.db.query(
    "SELECT id, codigo FROM aux_unidade WHERE codigo IN ('KG', 'SACO')",
  );
  const unidadeByCodigo = Object.fromEntries(
    unidadesResult.rows.map((row) => [String(row.codigo || "").toUpperCase(), Number(row.id)]),
  );

  const kgId = unidadeByCodigo.KG;
  const sacoId = unidadeByCodigo.SACO;

  if (!kgId || !sacoId) {
    throw new Error("Unidades KG e SACO sao obrigatorias em aux_unidade.");
  }

  const usuariosRows = seed.usuarios.map((usuario, index) => {
    const email = String(usuario.email || `usuario${index + 1}@mvpcoffee.local`)
      .trim()
      .toLowerCase();

    return {
      id: usuario.id || randomUUID(),
      nome: encrypt(usuario.nome || `Usuario ${index + 1}`),
      email: encrypt(email),
      senha: encrypt(usuario.senha || "123456"),
      perfil: Number(usuario.perfil) || 2,
      ativo: usuario.ativo !== false,
      criado_em: toTimestamp(usuario.criado_em),
    };
  });

  await buildInsert(
    pgm,
    "usuarios",
    ["id", "nome", "email", "senha", "perfil", "ativo", "criado_em"],
    usuariosRows,
  );

  const clientesRows = seed.clientes.map((cliente, index) => {
    const row = {
      id: cliente.id || randomUUID(),
      nome: encrypt(cliente.nome || `Cliente ${index + 1}`),
      cpf_cnpj: encrypt(cliente.cpf_cnpj || ""),
      telefone: encrypt(cliente.telefone || ""),
      endereco: encrypt(cliente.endereco || ""),
      ativo: cliente.ativo !== false,
      criado_em: toTimestamp(cliente.criado_em),
      protegido: Boolean(cliente.protegido),
    };

    if (hasClientesEmail) {
      const email = String(cliente.email || `cliente${index + 1}@mvpcoffee.local`)
        .trim()
        .toLowerCase();
      row.email = encrypt(email);
    }

    return row;
  });

  const clientesColumns = ["id", "nome", "cpf_cnpj", "telefone", "endereco", "ativo", "criado_em", "protegido"];
  if (hasClientesEmail) {
    clientesColumns.splice(2, 0, "email");
  }

  await buildInsert(pgm, "clientes", clientesColumns, clientesRows);

  const fornecedoresRows = seed.fornecedores.map((fornecedor, index) => {
    const row = {
      id: fornecedor.id || randomUUID(),
      razao_social: encrypt(fornecedor.razao_social || `Fornecedor ${index + 1}`),
      cpf_cnpj: encrypt(fornecedor.cpf_cnpj || ""),
      telefone: encrypt(fornecedor.telefone || ""),
      endereco: encrypt(fornecedor.endereco || ""),
      ativo: fornecedor.ativo !== false,
      criado_em: toTimestamp(fornecedor.criado_em),
    };

    if (hasFornecedoresEmail) {
      const email = String(
        fornecedor.email || `fornecedor${index + 1}@mvpcoffee.local`,
      )
        .trim()
        .toLowerCase();
      row.email = encrypt(email);
    }

    return row;
  });

  const fornecedoresColumns = [
    "id",
    "razao_social",
    "cpf_cnpj",
    "telefone",
    "endereco",
    "ativo",
    "criado_em",
  ];
  if (hasFornecedoresEmail) {
    fornecedoresColumns.splice(2, 0, "email");
  }

  await buildInsert(pgm, "fornecedores", fornecedoresColumns, fornecedoresRows);

  const insumosRows = seed.insumos.map((insumo, index) => {
    const unidadeCodigo = toUpperText(insumo.unidade_codigo || insumo.unidade, "KG");
    const estoqueUnidadeCodigo = toUpperText(
      insumo.estoque_minimo_unidade_codigo ||
        insumo.estoque_minimo_unidade ||
        unidadeCodigo,
      "KG",
    );

    return {
      id: String(insumo.id || `insumo_${index + 1}`),
      nome: String(insumo.nome || `Insumo ${index + 1}`),
      estoque_minimo: Number(insumo.estoque_minimo) || 0,
      kg_por_saco: Math.max(0.001, Number(insumo.kg_por_saco) || 1),
      ativo: insumo.ativo !== false,
      criado_em: toTimestamp(insumo.criado_em),
      pode_ser_insumo: insumo.pode_ser_insumo !== false,
      pode_ser_produzivel: Boolean(insumo.pode_ser_produzivel),
      pode_ser_vendido: Boolean(insumo.pode_ser_vendido),
      unidade_id: unidadeByCodigo[unidadeCodigo] || kgId,
      estoque_minimo_unidade_id: unidadeByCodigo[estoqueUnidadeCodigo] || kgId,
    };
  });

  await buildInsert(
    pgm,
    "insumos",
    [
      "id",
      "nome",
      "estoque_minimo",
      "kg_por_saco",
      "ativo",
      "criado_em",
      "pode_ser_insumo",
      "pode_ser_produzivel",
      "pode_ser_vendido",
      "unidade_id",
      "estoque_minimo_unidade_id",
    ],
    insumosRows,
  );

  const producaoRows = seed.producao.map((item, index) => ({
    id: String(item.id || `prd-${String(index + 1).padStart(4, "0")}`),
    data_producao: toTimestamp(item.data_producao),
    insumo_final_id: item.insumo_final_id || null,
    status: item.status || "PENDENTE",
    modo_geracao: item.modo_geracao || "manual",
    peso_real: item.peso_real ?? null,
    anexo_base64: item.anexo_base64 || null,
    custo_total_previsto: Number(item.custo_total_previsto) || 0,
    custo_total_real: item.custo_total_real ?? null,
    custo_unitario_real: item.custo_unitario_real ?? null,
    obs: item.obs || null,
    criado_em: toTimestamp(item.criado_em),
  }));

  await buildInsert(
    pgm,
    "producao",
    [
      "id",
      "data_producao",
      "insumo_final_id",
      "status",
      "modo_geracao",
      "peso_real",
      "anexo_base64",
      "custo_total_previsto",
      "custo_total_real",
      "custo_unitario_real",
      "obs",
      "criado_em",
    ],
    producaoRows,
  );

  const detalhesProducaoRows = seed.detalhesProducao.map((item, index) => ({
    id: String(item.id || `dp-${String(index + 1).padStart(6, "0")}`),
    producao_id: item.producao_id || null,
    insumo_id: item.insumo_id || null,
    quantidade_kg: Number(item.quantidade_kg) || 0,
    custo_unitario_previsto: Number(item.custo_unitario_previsto) || 0,
    custo_total_previsto: Number(item.custo_total_previsto) || 0,
  }));

  await buildInsert(
    pgm,
    "detalhes_producao",
    [
      "id",
      "producao_id",
      "insumo_id",
      "quantidade_kg",
      "custo_unitario_previsto",
      "custo_total_previsto",
    ],
    detalhesProducaoRows,
  );

  const custosAdicionaisRows = seed.custosAdicionaisProducao.map((item, index) => ({
    id: String(item.id || `cap-${String(index + 1).padStart(6, "0")}`),
    producao_id: item.producao_id || null,
    fornecedor_id: item.fornecedor_id || null,
    descricao: item.descricao || "Custo adicional",
    valor: Number(item.valor) || 0,
    status_pagamento: item.status_pagamento || "PENDENTE",
  }));

  await buildInsert(
    pgm,
    "custos_adicionais_producao",
    ["id", "producao_id", "fornecedor_id", "descricao", "valor", "status_pagamento"],
    custosAdicionaisRows,
  );

  const movimentoRows = seed.movimentoProducao.map((item, index) => ({
    id: String(item.id || `mov-${String(index + 1).padStart(8, "0")}`),
    insumo_id: item.insumo_id || null,
    tipo_movimento: item.tipo_movimento || item.tipo || "AJUSTE",
    custo_unitario: Number(item.custo_unitario ?? item.custo_unit) || 0,
    quantidade_entrada: Number(item.quantidade_entrada) || 0,
    quantidade_saida: Number(item.quantidade_saida) || 0,
    data_movimentacao: toTimestamp(item.data_movimentacao || item.data),
    referencia_tipo: item.referencia_tipo || null,
    referencia_id: item.referencia_id || null,
    obs: item.obs || null,
    producao_id: item.producao_id || null,
  }));

  await buildInsert(
    pgm,
    "movimento_producao",
    [
      "id",
      "insumo_id",
      "tipo_movimento",
      "custo_unitario",
      "quantidade_entrada",
      "quantidade_saida",
      "data_movimentacao",
      "referencia_tipo",
      "referencia_id",
      "obs",
      "producao_id",
    ],
    movimentoRows,
  );

  const transferenciasRows = seed.transferencias.map((item) => {
    const unidadeCodigo = toUpperText(item.unidade_operacao_codigo, "KG");
    const unidadeId =
      Number(item.unidade_operacao_id) || unidadeByCodigo[unidadeCodigo] || kgId;

    return {
      id: item.id || randomUUID(),
      origem_id: item.origem_id || null,
      destino_id: item.destino_id || null,
      quantidade_kg: Number(item.quantidade_kg) || 0,
      custo_unitario: Number(item.custo_unitario) || 0,
      data_transferencia: toTimestamp(item.data_transferencia),
      obs: item.obs || null,
      unidade_operacao_id: unidadeId,
      quantidade_informada:
        item.quantidade_informada === undefined || item.quantidade_informada === null
          ? Number(item.quantidade_kg) || 0
          : Number(item.quantidade_informada) || 0,
      kg_por_saco_informado:
        item.kg_por_saco_informado === undefined || item.kg_por_saco_informado === null
          ? null
          : Number(item.kg_por_saco_informado) || null,
    };
  });

  await buildInsert(
    pgm,
    "transferencias",
    [
      "id",
      "origem_id",
      "destino_id",
      "quantidade_kg",
      "custo_unitario",
      "data_transferencia",
      "obs",
      "unidade_operacao_id",
      "quantidade_informada",
      "kg_por_saco_informado",
    ],
    transferenciasRows,
  );

  const vendasRows = seed.vendas.map((item, index) => ({
    id: String(item.id || `vnd-${String(index + 1).padStart(5, "0")}`),
    cliente_id: item.cliente_id || null,
    data_venda: toTimestamp(item.data_venda),
    valor_total: Number(item.valor_total) || 0,
    parcelas_qtd: Number(item.parcelas_qtd) || 1,
    valor_negociado:
      item.valor_negociado === undefined || item.valor_negociado === null
        ? Number(item.valor_total) || 0
        : Number(item.valor_negociado) || 0,
    status: item.status || "FECHADA",
    data_programada_entrega: toDateOnly(item.data_programada_entrega),
    data_entrega: toDateOnly(item.data_entrega),
    status_entrega:
      item.status_entrega || (item.data_entrega ? "ENTREGUE" : "PENDENTE"),
    obs: item.obs || null,
    tipo_pagamento: item.tipo_pagamento || "A_VISTA",
    forma_pagamento: item.forma_pagamento || null,
    desconto_tipo: item.desconto_tipo || null,
    desconto_valor: Number(item.desconto_valor) || 0,
    desconto_descricao: item.desconto_descricao || null,
    acrescimo_tipo: item.acrescimo_tipo || null,
    acrescimo_valor: Number(item.acrescimo_valor) || 0,
    acrescimo_descricao: item.acrescimo_descricao || null,
  }));

  await buildInsert(
    pgm,
    "vendas",
    [
      "id",
      "cliente_id",
      "data_venda",
      "valor_total",
      "parcelas_qtd",
      "valor_negociado",
      "status",
      "data_programada_entrega",
      "data_entrega",
      "status_entrega",
      "obs",
      "tipo_pagamento",
      "forma_pagamento",
      "desconto_tipo",
      "desconto_valor",
      "desconto_descricao",
      "acrescimo_tipo",
      "acrescimo_valor",
      "acrescimo_descricao",
    ],
    vendasRows,
  );

  const vendaItensRows = seed.vendaItens.map((item, index) => {
    const unidadeCodigo = toUpperText(item.unidade_codigo, "KG");
    const unidadeId = Number(item.unidade_id) || unidadeByCodigo[unidadeCodigo] || kgId;

    const quantidadeInformada = Number(item.quantidade_informada) || 0;
    const kgPorSaco = Number(item.kg_por_saco) || 0;
    const quantidadeKg =
      item.quantidade_kg !== undefined && item.quantidade_kg !== null
        ? Number(item.quantidade_kg) || 0
        : unidadeCodigo === "SACO"
          ? quantidadeInformada * (kgPorSaco || 1)
          : quantidadeInformada;

    const precoUnitario = Number(item.preco_unitario) || 0;

    return {
      id: String(item.id || `vit-${String(index + 1).padStart(6, "0")}`),
      venda_id: item.venda_id || null,
      insumo_id: item.insumo_id || null,
      quantidade_kg: quantidadeKg,
      quantidade_informada: quantidadeInformada,
      unidade_id: unidadeId,
      kg_por_saco: kgPorSaco || null,
      preco_unitario: precoUnitario,
      valor_total: Number(item.valor_total) || quantidadeInformada * precoUnitario,
      criado_em: toTimestamp(item.criado_em),
    };
  });

  await buildInsert(
    pgm,
    "venda_itens",
    [
      "id",
      "venda_id",
      "insumo_id",
      "quantidade_kg",
      "quantidade_informada",
      "unidade_id",
      "kg_por_saco",
      "preco_unitario",
      "valor_total",
      "criado_em",
    ],
    vendaItensRows,
  );

  const contasReceberRows = seed.contasReceber.map((item, index) => ({
    id: String(item.id || `cr-${String(index + 1).padStart(5, "0")}`),
    cliente_id: item.cliente_id || null,
    origem_tipo: item.origem_tipo || null,
    origem_id: item.origem_id || null,
    valor_total: Number(item.valor_total) || 0,
    data_emissao: toTimestamp(item.data_emissao),
    status: item.status || "ABERTO",
    producao_id: item.producao_id || null,
  }));

  await buildInsert(
    pgm,
    "contas_receber",
    [
      "id",
      "cliente_id",
      "origem_tipo",
      "origem_id",
      "valor_total",
      "data_emissao",
      "status",
      "producao_id",
    ],
    contasReceberRows,
  );

  const contasReceberParcelasRows = seed.contasReceberParcelas.map((item, index) => ({
    id: String(item.id || `crp-${String(index + 1).padStart(6, "0")}`),
    conta_receber_id: item.conta_receber_id || null,
    parcela_num: Number(item.parcela_num) || index + 1,
    vencimento: toTimestamp(item.vencimento),
    valor: Number(item.valor) || 0,
    status: item.status || "ABERTA",
    data_recebimento: item.data_recebimento ? toTimestamp(item.data_recebimento) : null,
    forma_recebimento: item.forma_recebimento || null,
    producao_id: item.producao_id || null,
    valor_programado:
      item.valor_programado === undefined || item.valor_programado === null
        ? Number(item.valor) || 0
        : Number(item.valor_programado) || 0,
    valor_recebido:
      item.valor_recebido === undefined || item.valor_recebido === null
        ? null
        : Number(item.valor_recebido) || 0,
    forma_recebimento_real: item.forma_recebimento_real || null,
    motivo_diferenca: item.motivo_diferenca || null,
    acao_diferenca: item.acao_diferenca || null,
    origem_recebimento: item.origem_recebimento || "NORMAL",
    fornecedor_destino_id: item.fornecedor_destino_id || null,
    comprovante_url: item.comprovante_url || null,
    observacao_recebimento: item.observacao_recebimento || null,
  }));

  await buildInsert(
    pgm,
    "contas_receber_parcelas",
    [
      "id",
      "conta_receber_id",
      "parcela_num",
      "vencimento",
      "valor",
      "status",
      "data_recebimento",
      "forma_recebimento",
      "producao_id",
      "valor_programado",
      "valor_recebido",
      "forma_recebimento_real",
      "motivo_diferenca",
      "acao_diferenca",
      "origem_recebimento",
      "fornecedor_destino_id",
      "comprovante_url",
      "observacao_recebimento",
    ],
    contasReceberParcelasRows,
  );

  const contasPagarRows = seed.contasPagar.map((item, index) => ({
    id: String(item.id || `cp-${String(index + 1).padStart(5, "0")}`),
    fornecedor_id: item.fornecedor_id || null,
    origem_tipo: item.origem_tipo || null,
    origem_id: item.origem_id || null,
    valor_total: Number(item.valor_total) || 0,
    data_emissao: toTimestamp(item.data_emissao),
    status: item.status || "ABERTO",
    producao_id: item.producao_id || null,
    venda_id: item.venda_id || null,
  }));

  await buildInsert(
    pgm,
    "contas_pagar",
    [
      "id",
      "fornecedor_id",
      "origem_tipo",
      "origem_id",
      "valor_total",
      "data_emissao",
      "status",
      "producao_id",
      "venda_id",
    ],
    contasPagarRows,
  );

  const contasPagarParcelasRows = seed.contasPagarParcelas.map((item, index) => ({
    id: String(item.id || `cpp-${String(index + 1).padStart(6, "0")}`),
    conta_pagar_id: item.conta_pagar_id || null,
    parcela_num: Number(item.parcela_num) || index + 1,
    vencimento: toTimestamp(item.vencimento),
    valor: Number(item.valor) || 0,
    status: item.status || "ABERTA",
    data_pagamento: item.data_pagamento ? toTimestamp(item.data_pagamento) : null,
    forma_pagamento: item.forma_pagamento || null,
    producao_id: item.producao_id || null,
  }));

  await buildInsert(
    pgm,
    "contas_pagar_parcelas",
    [
      "id",
      "conta_pagar_id",
      "parcela_num",
      "vencimento",
      "valor",
      "status",
      "data_pagamento",
      "forma_pagamento",
      "producao_id",
    ],
    contasPagarParcelasRows,
  );

  const vendaDetalhesRows = seed.vendaDetalhes.map((item, index) => ({
    id: String(item.id || `vd-${String(index + 1).padStart(6, "0")}`),
    venda_id: item.venda_id || null,
    parcela_id: item.parcela_id || null,
    tipo_evento: item.tipo_evento || "PARCELA",
    descricao: item.descricao || "Evento de venda",
    valor: Number(item.valor) || 0,
    data_evento: toTimestamp(item.data_evento),
  }));

  await buildInsert(
    pgm,
    "venda_detalhes",
    ["id", "venda_id", "parcela_id", "tipo_evento", "descricao", "valor", "data_evento"],
    vendaDetalhesRows,
  );
};

exports.down = () => {};
