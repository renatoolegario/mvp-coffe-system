const { randomUUID } = require("crypto");
const CryptoJS = require("crypto-js");

const fmt = (value, size = 2) => String(value).padStart(size, "0");

const toTimestamp = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value || "").replace("T", " ").replace("Z", "");
  }

  return `${date.getFullYear()}-${fmt(date.getMonth() + 1)}-${fmt(date.getDate())} ${fmt(
    date.getHours(),
  )}:${fmt(date.getMinutes())}:${fmt(date.getSeconds())}`;
};

const toDateOnly = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${fmt(date.getMonth() + 1)}-${fmt(date.getDate())}`;
};

const addDays = (value, days) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setDate(date.getDate() + Number(days || 0));
  return date;
};

const withTime = (value, hours = 8, minutes = 0) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const round2 = (value) => Number(Number(value || 0).toFixed(2));
const round3 = (value) => Number(Number(value || 0).toFixed(3));
const round6 = (value) => Number(Number(value || 0).toFixed(6));

const splitAmount = (total, installments) => {
  const qtd = Math.max(1, Number(installments) || 1);
  let cents = Math.round(Number(total || 0) * 100);
  const rows = [];

  for (let i = 0; i < qtd; i += 1) {
    const itemCents = i === qtd - 1 ? cents : Math.floor(cents / (qtd - i));
    rows.push(Number((itemCents / 100).toFixed(2)));
    cents -= itemCents;
  }

  return rows;
};

const buildInsert = async (pgm, table, columns, rows) => {
  if (!rows.length) return;

  const maxChunkSize = Math.max(1, Math.floor(60000 / columns.length));
  for (let offset = 0; offset < rows.length; offset += maxChunkSize) {
    const chunk = rows.slice(offset, offset + maxChunkSize);
    const values = [];
    const placeholders = chunk.map((row, rowIndex) => {
      const rowPlaceholders = columns.map(
        (_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`,
      );
      values.push(...columns.map((column) => row[column] ?? null));
      return `(${rowPlaceholders.join(", ")})`;
    });

    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders.join(
      ", ",
    )}`;
    await pgm.db.query(sql, values);
  }
};

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

const isAllEqualDigits = (digits) =>
  String(digits || "")
    .split("")
    .every((char) => char === String(digits || "")[0]);

const cpfDigit = (base, factorStart) => {
  let sum = 0;
  for (let i = 0; i < base.length; i += 1) {
    sum += Number(base[i]) * (factorStart - i);
  }
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
};

const formatCpf = (digits) => {
  const raw = String(digits || "").replace(/\D/g, "").padStart(11, "0");
  return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
};

const generateCpf = (index) => {
  let base = String(200000000 + Number(index || 0)).slice(-9);
  if (isAllEqualDigits(base)) {
    base = String(123456789 + Number(index || 0)).slice(-9);
  }
  const d1 = cpfDigit(base, 10);
  const d2 = cpfDigit(`${base}${d1}`, 11);
  return formatCpf(`${base}${d1}${d2}`);
};

const cnpjDigit = (base, factors) => {
  let sum = 0;
  for (let i = 0; i < base.length; i += 1) {
    sum += Number(base[i]) * factors[i];
  }
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
};

const formatCnpj = (digits) => {
  const raw = String(digits || "").replace(/\D/g, "").padStart(14, "0");
  return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12)}`;
};

const generateCnpj = (index) => {
  let root = String(30000000 + Number(index || 0)).slice(-8);
  if (isAllEqualDigits(root)) {
    root = String(23456789 + Number(index || 0)).slice(-8);
  }
  const base = `${root}0001`;
  const d1 = cnpjDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = cnpjDigit(`${base}${d1}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return formatCnpj(`${base}${d1}${d2}`);
};

const normalizeContaReceberStatus = (parcelas) => {
  if (!parcelas.length) return "ABERTO";
  const recebidas = parcelas.filter((parcela) => parcela.status === "RECEBIDA").length;
  if (recebidas === parcelas.length) return "RECEBIDO";
  if (recebidas > 0) return "PARCIAL";
  return "ABERTO";
};

const normalizeContaPagarStatus = (parcelas) => {
  if (!parcelas.length) return "ABERTO";
  const pagas = parcelas.filter((parcela) => parcela.status === "PAGA").length;
  return pagas === parcelas.length ? "PAGO" : "ABERTO";
};

const textId = (prefix, seq, size = 6) => `${prefix}-${fmt(seq, size)}`;

const quoteIdent = (name) => `"${String(name || "").replace(/"/g, '""')}"`;

let rngSeed = 46032026;
const rng = () => {
  rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0;
  return rngSeed / 4294967296;
};
const randInt = (min, max) =>
  Math.floor(rng() * (Number(max) - Number(min) + 1)) + Number(min);
const pick = (items) => items[randInt(0, items.length - 1)];

exports.up = async (pgm) => {
  await pgm.db.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");

  const hasResultados = await pgm.db.query(
    `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'producao_resultados'
      LIMIT 1
    `,
  );

  if (!hasResultados.rows[0]) {
    throw new Error(
      "A tabela producao_resultados não existe. Rode a migration 045 antes desta seed.",
    );
  }

  const keepTables = new Set([
    "pgmigrations",
    "aux_unidade",
    "aux_forma_pagamento",
    "empresa_configuracao_estoque",
    "empresa_configuracao_integracoes",
  ]);

  const allTables = await pgm.db.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
  );

  const truncateTargets = allTables.rows
    .map((row) => String(row.tablename || ""))
    .filter((table) => table && !keepTables.has(table));

  if (truncateTargets.length) {
    await pgm.db.query(
      `TRUNCATE TABLE ${truncateTargets
        .map((table) => quoteIdent(table))
        .join(", ")} RESTART IDENTITY CASCADE`,
    );
  }

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

  const now = new Date();
  const baseDate = addDays(now, -420);

  const usuariosBase = [
    { nome: "Administrador Geral", email: "admin@essenciasdobrasil.local", senha: "Admin@123", perfil: 1 },
    { nome: "Gestor Financeiro", email: "financeiro@essenciasdobrasil.local", senha: "Finance@123", perfil: 1 },
    { nome: "Operador Estoque", email: "estoque@essenciasdobrasil.local", senha: "Estoque@123", perfil: 2 },
    { nome: "Operador Comercial", email: "comercial@essenciasdobrasil.local", senha: "Comercial@123", perfil: 2 },
    { nome: "Analista Auditoria", email: "auditoria@essenciasdobrasil.local", senha: "Auditoria@123", perfil: 1 },
  ];

  const usuariosRows = usuariosBase.map((usuario, index) => ({
    id: randomUUID(),
    nome: encrypt(usuario.nome),
    email: encrypt(usuario.email),
    senha: encrypt(usuario.senha),
    perfil: usuario.perfil,
    ativo: true,
    criado_em: toTimestamp(addDays(baseDate, index)),
  }));

  await buildInsert(
    pgm,
    "usuarios",
    ["id", "nome", "email", "senha", "perfil", "ativo", "criado_em"],
    usuariosRows,
  );

  const clientesNomes = [
    "Cliente Balcao",
    "Cafeteria Serra Alta",
    "Emporio Mantiqueira",
    "Padaria Grao Fino",
    "Bistro Horizonte",
    "Mercado Nova Safra",
    "Loja Cafe da Vila",
    "Armazem Bom Aroma",
    "Hotel Vale do Cafe",
    "Restaurante Brasa Nobre",
    "Doceria Campo Doce",
    "Lanchonete Ponto Quente",
    "Mercadinho Bom Grao",
    "Delicias da Serra",
    "Espaco Sabor Minas",
  ];

  const fornecedoresNomes = [
    "Fazenda Alta Colheita",
    "Cooperativa Grao Real",
    "Agro Minas Logistica",
    "Beneficiadora Serra Verde",
    "Embalagens Cafe Brasil",
    "Transporte Vale Azul",
    "Cafeicultura Horizonte",
    "Torrefacao Sul de Minas",
    "Comercial Vale do Grao",
    "Solucoes Embalagem Premium",
    "Fazenda Chapada Dourada",
    "Distribuidora Bom Cafe",
    "Nutrientes Agroblend",
    "Logistica Cafe Forte",
    "Fornecedora Select Beans",
  ];

  const cidades = [
    "Uberlandia - MG",
    "Uberaba - MG",
    "Patos de Minas - MG",
    "Araxa - MG",
    "Franca - SP",
    "Ribeirao Preto - SP",
    "Varginha - MG",
    "Belo Horizonte - MG",
  ];

  const clientesRows = clientesNomes.map((nome, index) => {
    const idx = index + 1;
    return {
      id: randomUUID(),
      nome: encrypt(nome),
      email: encrypt(`cliente.seed3.${fmt(idx)}@essenciasdobrasil.local`),
      cpf_cnpj: encrypt(idx % 3 === 0 ? generateCpf(100 + idx) : generateCnpj(200 + idx)),
      telefone: encrypt(`(34) 9${fmt(3000 + idx, 4)}-${fmt(5000 + idx, 4)}`),
      endereco: encrypt(`Rua Comercial ${idx}, ${pick(cidades)}`),
      ativo: true,
      criado_em: toTimestamp(addDays(baseDate, idx * 2)),
      protegido: index === 0,
    };
  });

  await buildInsert(
    pgm,
    "clientes",
    [
      "id",
      "nome",
      "email",
      "cpf_cnpj",
      "telefone",
      "endereco",
      "ativo",
      "criado_em",
      "protegido",
    ],
    clientesRows,
  );

  const fornecedoresRows = fornecedoresNomes.map((razaoSocial, index) => {
    const idx = index + 1;
    return {
      id: randomUUID(),
      razao_social: encrypt(razaoSocial),
      email: encrypt(`fornecedor.seed3.${fmt(idx)}@essenciasdobrasil.local`),
      cpf_cnpj: encrypt(idx % 2 === 0 ? generateCnpj(500 + idx) : generateCpf(800 + idx)),
      telefone: encrypt(`(35) 9${fmt(4000 + idx, 4)}-${fmt(6000 + idx, 4)}`),
      endereco: encrypt(`Avenida Industrial ${idx}, ${pick(cidades)}`),
      ativo: true,
      criado_em: toTimestamp(addDays(baseDate, idx * 3)),
    };
  });

  await buildInsert(
    pgm,
    "fornecedores",
    [
      "id",
      "razao_social",
      "email",
      "cpf_cnpj",
      "telefone",
      "endereco",
      "ativo",
      "criado_em",
    ],
    fornecedoresRows,
  );

  const rawInsumos = [
    { id: "insumo-grao-arabica", nome: "Grao Arabica", kg_por_saco: 60, custo_base: 22.5 },
    { id: "insumo-grao-conilon", nome: "Grao Conilon", kg_por_saco: 60, custo_base: 18.8 },
    { id: "insumo-blend-verde", nome: "Blend Verde", kg_por_saco: 50, custo_base: 20.2 },
    { id: "insumo-cafe-cereja", nome: "Cafe Cereja", kg_por_saco: 60, custo_base: 24.3 },
    { id: "insumo-micro-lote", nome: "Micro Lote Especial", kg_por_saco: 40, custo_base: 29.4 },
    { id: "insumo-casca-beneficiada", nome: "Casca Beneficiada", kg_por_saco: 30, custo_base: 9.9 },
  ];

  const produtosProduzidos = [
    {
      id: "produto-saco-23kg-tipo-a",
      nome: "Saco 23kg Tipo A",
      kg_por_saco: 23,
      custo_base: 35.2,
      preco_venda_kg: 51.7,
      unidade_codigo: "SACO",
      estoque_minimo: 20,
    },
    {
      id: "produto-saco-20kg-tipo-b",
      nome: "Saco 20kg Tipo B",
      kg_por_saco: 20,
      custo_base: 33.8,
      preco_venda_kg: 49.5,
      unidade_codigo: "SACO",
      estoque_minimo: 24,
    },
    {
      id: "produto-agranel-balcao",
      nome: "Agranel Balcao",
      kg_por_saco: 1,
      custo_base: 31.4,
      preco_venda_kg: 47.2,
      unidade_codigo: "KG",
      estoque_minimo: 350,
    },
    {
      id: "produto-blend-premium",
      nome: "Blend Premium", 
      kg_por_saco: 10,
      custo_base: 39.7,
      preco_venda_kg: 58.3,
      unidade_codigo: "KG",
      estoque_minimo: 200,
    },
  ];

  const insumosRows = [
    ...rawInsumos.map((item, index) => ({
      id: item.id,
      nome: item.nome,
      estoque_minimo: 500 + index * 100,
      kg_por_saco: item.kg_por_saco,
      ativo: true,
      criado_em: toTimestamp(addDays(baseDate, index * 2)),
      pode_ser_insumo: true,
      pode_ser_produzivel: false,
      pode_ser_vendido: false,
      unidade_id: kgId,
      estoque_minimo_unidade_id: kgId,
    })),
    ...produtosProduzidos.map((item, index) => ({
      id: item.id,
      nome: item.nome,
      estoque_minimo: item.estoque_minimo,
      kg_por_saco: item.kg_por_saco,
      ativo: true,
      criado_em: toTimestamp(addDays(baseDate, 20 + index * 2)),
      pode_ser_insumo: false,
      pode_ser_produzivel: true,
      pode_ser_vendido: true,
      unidade_id: item.unidade_codigo === "SACO" ? sacoId : kgId,
      estoque_minimo_unidade_id: item.unidade_codigo === "SACO" ? sacoId : kgId,
    })),
  ];

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

  const custoBaseByInsumo = new Map(
    [...rawInsumos, ...produtosProduzidos].map((item) => [item.id, Number(item.custo_base) || 0]),
  );

  const movimentosRows = [];
  const contasPagarRows = [];
  const contasPagarParcelasRows = [];
  const producoesRows = [];
  const detalhesProducaoRows = [];
  const producaoResultadosRows = [];
  const custosAdicionaisRows = [];
  const vendasRows = [];
  const vendaItensRows = [];
  const contasReceberRows = [];
  const contasReceberParcelasRows = [];
  const vendaDetalhesRows = [];

  const formasPagamento = ["PIX", "TRANSFERENCIA", "DINHEIRO", "DEBITO"];
  let movimentoSeq = 1;
  let contaPagarSeq = 1;
  let contaPagarParcelaSeq = 1;
  let producaoSeq = 1;
  let detalheSeq = 1;
  let resultadoSeq = 1;
  let custoAdicionalSeq = 1;
  let vendaSeq = 1;
  let vendaItemSeq = 1;
  let contaReceberSeq = 1;
  let contaReceberParcelaSeq = 1;
  let vendaDetalheSeq = 1;

  for (let fornecedorIndex = 0; fornecedorIndex < fornecedoresRows.length; fornecedorIndex += 1) {
    const fornecedor = fornecedoresRows[fornecedorIndex];

    for (let entregaIndex = 0; entregaIndex < 20; entregaIndex += 1) {
      const entregaSeq = fornecedorIndex * 20 + entregaIndex + 1;
      const insumo = rawInsumos[(fornecedorIndex + entregaIndex) % rawInsumos.length];
      const entregaDate = withTime(addDays(baseDate, fornecedorIndex * 4 + entregaIndex * 3), 7 + (entregaIndex % 9), 15);
      const quantidadeKg = round3(650 + randInt(0, 750));
      const custoUnitario = round2((custoBaseByInsumo.get(insumo.id) || 18) + randInt(0, 500) / 100);
      const valorTotal = round2(quantidadeKg * custoUnitario);
      const parcelaQtd = entregaIndex % 5 === 0 ? 2 : 1;
      const parcelaValores = splitAmount(valorTotal, parcelaQtd);

      const statusParcelas = [];
      for (let parcelaIndex = 0; parcelaIndex < parcelaQtd; parcelaIndex += 1) {
        let status = "ABERTA";
        if (parcelaQtd === 1) {
          status = entregaIndex % 4 === 0 ? "PAGA" : "ABERTA";
        } else if (entregaIndex % 8 === 0 && parcelaIndex === 0) {
          status = "PAGA";
        } else if (entregaIndex % 6 === 0) {
          status = "PAGA";
        }
        statusParcelas.push(status);
      }

      const contaPagarId = textId("cp-ent", contaPagarSeq);
      contaPagarSeq += 1;

      const parcelasConta = parcelaValores.map((valorParcela, parcelaIndex) => {
        const vencimento = withTime(addDays(entregaDate, 25 + parcelaIndex * 30), 12, 0);
        const status = statusParcelas[parcelaIndex];
        const dataPagamento =
          status === "PAGA"
            ? withTime(addDays(vencimento, -(parcelaIndex + 2)), 14, 30)
            : null;

        const parcela = {
          id: textId("cpp-ent", contaPagarParcelaSeq),
          conta_pagar_id: contaPagarId,
          parcela_num: parcelaIndex + 1,
          vencimento: toTimestamp(vencimento),
          valor: round2(valorParcela),
          status,
          data_pagamento: dataPagamento ? toTimestamp(dataPagamento) : null,
          forma_pagamento: status === "PAGA" ? pick(formasPagamento) : null,
          producao_id: null,
        };

        contaPagarParcelaSeq += 1;
        return parcela;
      });

      contasPagarRows.push({
        id: contaPagarId,
        fornecedor_id: fornecedor.id,
        origem_tipo: "entrada_insumos",
        origem_id: textId("entrada", entregaSeq),
        valor_total: valorTotal,
        data_emissao: toTimestamp(entregaDate),
        status: normalizeContaPagarStatus(parcelasConta),
        producao_id: null,
        venda_id: null,
      });

      contasPagarParcelasRows.push(...parcelasConta);

      movimentosRows.push({
        id: textId("mov", movimentoSeq),
        insumo_id: insumo.id,
        tipo_movimento: "ENTRADA_INSUMO",
        custo_unitario: custoUnitario,
        quantidade_entrada: quantidadeKg,
        quantidade_saida: 0,
        data_movimentacao: toTimestamp(entregaDate),
        referencia_tipo: "entrada_insumos",
        referencia_id: textId("entrada", entregaSeq),
        producao_id: null,
        obs: `Entrega ${entregaSeq} - ${insumo.nome}`,
      });
      movimentoSeq += 1;
    }
  }

  const totalProducoes = 90;
  const producaoBaseDate = addDays(now, -260);

  for (let i = 0; i < totalProducoes; i += 1) {
    const concluida = i < 65;
    const producaoId = textId("prd", producaoSeq, 5);
    producaoSeq += 1;

    const produtoPrincipal = produtosProduzidos[i % produtosProduzidos.length];
    const produtoSecundario = produtosProduzidos[(i + 1) % produtosProduzidos.length];
    const insumoA = rawInsumos[i % rawInsumos.length];
    const insumoB = rawInsumos[(i + 2) % rawInsumos.length];

    const dataProducao = withTime(addDays(producaoBaseDate, i * 2), 6 + (i % 10), 25);
    const quantidadeA = round3(210 + randInt(0, 290));
    const quantidadeB = round3(180 + randInt(0, 260));

    const custoA = round2((custoBaseByInsumo.get(insumoA.id) || 18) + randInt(0, 250) / 100);
    const custoB = round2((custoBaseByInsumo.get(insumoB.id) || 18) + randInt(0, 250) / 100);
    const custoPrevisto = round2(quantidadeA * custoA + quantidadeB * custoB);

    const hasCustoAdicional = concluida && i % 3 === 0;
    const custoAdicionalValor = hasCustoAdicional ? round2(280 + randInt(0, 520)) : 0;

    let pesoReal = null;
    let custoTotalReal = null;
    let custoUnitarioReal = null;

    if (concluida) {
      const taxaRendimento = 0.72 + (i % 8) * 0.01;
      pesoReal = round3((quantidadeA + quantidadeB) * taxaRendimento);
      custoTotalReal = round2(custoPrevisto + custoAdicionalValor);
      custoUnitarioReal = round6(custoTotalReal / Math.max(pesoReal, 0.001));
    }

    producoesRows.push({
      id: producaoId,
      data_producao: toTimestamp(dataProducao),
      insumo_final_id: produtoPrincipal.id,
      status: concluida ? "CONCLUIDA" : "PENDENTE",
      modo_geracao: "PRODUTO_FINAL",
      peso_real: pesoReal,
      anexo_base64: null,
      custo_total_previsto: custoPrevisto,
      custo_total_real: custoTotalReal,
      custo_unitario_real: custoUnitarioReal,
      obs: concluida ? "Retorno finalizado" : "Aguardando retorno de producao",
      criado_em: toTimestamp(addDays(dataProducao, 0)),
    });

    const detalheAId = textId("dpr", detalheSeq);
    detalheSeq += 1;
    const detalheBId = textId("dpr", detalheSeq);
    detalheSeq += 1;

    detalhesProducaoRows.push(
      {
        id: detalheAId,
        producao_id: producaoId,
        insumo_id: insumoA.id,
        quantidade_kg: quantidadeA,
        custo_unitario_previsto: custoA,
        custo_total_previsto: round2(quantidadeA * custoA),
      },
      {
        id: detalheBId,
        producao_id: producaoId,
        insumo_id: insumoB.id,
        quantidade_kg: quantidadeB,
        custo_unitario_previsto: custoB,
        custo_total_previsto: round2(quantidadeB * custoB),
      },
    );

    movimentosRows.push(
      {
        id: textId("mov", movimentoSeq),
        insumo_id: insumoA.id,
        tipo_movimento: "RESERVA_PRODUCAO",
        custo_unitario: custoA,
        quantidade_entrada: 0,
        quantidade_saida: quantidadeA,
        data_movimentacao: toTimestamp(dataProducao),
        referencia_tipo: "producao",
        referencia_id: producaoId,
        producao_id: producaoId,
        obs: "Reserva de insumo para producao",
      },
      {
        id: textId("mov", movimentoSeq + 1),
        insumo_id: insumoB.id,
        tipo_movimento: "RESERVA_PRODUCAO",
        custo_unitario: custoB,
        quantidade_entrada: 0,
        quantidade_saida: quantidadeB,
        data_movimentacao: toTimestamp(dataProducao),
        referencia_tipo: "producao",
        referencia_id: producaoId,
        producao_id: producaoId,
        obs: "Reserva de insumo para producao",
      },
    );
    movimentoSeq += 2;

    if (concluida) {
      const temSegundoProduto = i % 4 === 0;
      const quantidadePrincipal = temSegundoProduto
        ? round3(pesoReal * 0.7)
        : round3(pesoReal);
      const quantidadeSecundaria = temSegundoProduto
        ? round3(pesoReal - quantidadePrincipal)
        : 0;

      producaoResultadosRows.push({
        id: textId("prr", resultadoSeq),
        producao_id: producaoId,
        insumo_id: produtoPrincipal.id,
        tipo_resultado: "EXTRA",
        quantidade_planejada_kg: 0,
        quantidade_real_kg: quantidadePrincipal,
        criado_em: toTimestamp(addDays(dataProducao, 1)),
      });
      resultadoSeq += 1;

      movimentosRows.push({
        id: textId("mov", movimentoSeq),
        insumo_id: produtoPrincipal.id,
        tipo_movimento: "ENTRADA_PRODUCAO",
        custo_unitario: custoUnitarioReal,
        quantidade_entrada: quantidadePrincipal,
        quantidade_saida: 0,
        data_movimentacao: toTimestamp(addDays(dataProducao, 1)),
        referencia_tipo: "producao",
        referencia_id: producaoId,
        producao_id: producaoId,
        obs: "Entrada de retorno de producao",
      });
      movimentoSeq += 1;

      if (temSegundoProduto && quantidadeSecundaria > 0.001 && produtoSecundario.id !== produtoPrincipal.id) {
        producaoResultadosRows.push({
          id: textId("prr", resultadoSeq),
          producao_id: producaoId,
          insumo_id: produtoSecundario.id,
          tipo_resultado: "EXTRA",
          quantidade_planejada_kg: 0,
          quantidade_real_kg: quantidadeSecundaria,
          criado_em: toTimestamp(addDays(dataProducao, 1)),
        });
        resultadoSeq += 1;

        movimentosRows.push({
          id: textId("mov", movimentoSeq),
          insumo_id: produtoSecundario.id,
          tipo_movimento: "ENTRADA_PRODUCAO",
          custo_unitario: custoUnitarioReal,
          quantidade_entrada: quantidadeSecundaria,
          quantidade_saida: 0,
          data_movimentacao: toTimestamp(addDays(dataProducao, 1)),
          referencia_tipo: "producao",
          referencia_id: producaoId,
          producao_id: producaoId,
          obs: "Entrada de retorno de producao",
        });
        movimentoSeq += 1;
      }

      if (hasCustoAdicional) {
        const fornecedor = fornecedoresRows[i % fornecedoresRows.length];
        const custoId = textId("cad", custoAdicionalSeq);
        const contaPagarId = textId("cp-prod", contaPagarSeq);
        const parcelaId = textId("cpp-prod", contaPagarParcelaSeq);
        const pago = i % 6 === 0;

        custoAdicionalSeq += 1;
        contaPagarSeq += 1;
        contaPagarParcelaSeq += 1;

        custosAdicionaisRows.push({
          id: custoId,
          producao_id: producaoId,
          fornecedor_id: fornecedor.id,
          descricao: "Servico adicional de torra e acabamento",
          valor: custoAdicionalValor,
          status_pagamento: pago ? "A_VISTA" : "PENDENTE",
        });

        contasPagarRows.push({
          id: contaPagarId,
          fornecedor_id: fornecedor.id,
          origem_tipo: "custo_adicional_producao",
          origem_id: producaoId,
          valor_total: custoAdicionalValor,
          data_emissao: toTimestamp(addDays(dataProducao, 1)),
          status: pago ? "PAGO" : "ABERTO",
          producao_id: producaoId,
          venda_id: null,
        });

        contasPagarParcelasRows.push({
          id: parcelaId,
          conta_pagar_id: contaPagarId,
          parcela_num: 1,
          vencimento: toTimestamp(addDays(dataProducao, 8)),
          valor: custoAdicionalValor,
          status: pago ? "PAGA" : "ABERTA",
          data_pagamento: pago ? toTimestamp(addDays(dataProducao, 3)) : null,
          forma_pagamento: pago ? pick(formasPagamento) : null,
          producao_id: producaoId,
        });
      }
    }
  }

  for (let clienteIndex = 0; clienteIndex < clientesRows.length; clienteIndex += 1) {
    const cliente = clientesRows[clienteIndex];

    for (let compraIndex = 0; compraIndex < 20; compraIndex += 1) {
      const vendaId = textId("vnd", vendaSeq, 5);
      vendaSeq += 1;

      const dataVenda = withTime(addDays(baseDate, 40 + clienteIndex * 5 + compraIndex * 4), 9 + (compraIndex % 8), 10);
      const clienteProtegido = Boolean(cliente.protegido);
      const tipoPagamento = clienteProtegido
        ? "A_VISTA"
        : compraIndex % 3 === 0
          ? "A_PRAZO"
          : "A_VISTA";
      const parcelasQtd = tipoPagamento === "A_PRAZO" ? 2 + (compraIndex % 3) : 1;

      const itemCount = 1 + (compraIndex % 2);
      const itensVenda = [];
      for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
        const produto = produtosProduzidos[(clienteIndex + compraIndex + itemIndex) % produtosProduzidos.length];
        const usarSaco = produto.kg_por_saco > 1 && (compraIndex + itemIndex) % 3 === 0;
        const quantidadeInformada = usarSaco
          ? 1 + ((compraIndex + itemIndex) % 5)
          : round3(18 + ((clienteIndex * 11 + compraIndex * 7 + itemIndex * 13) % 85));
        const quantidadeKg = usarSaco
          ? round3(quantidadeInformada * produto.kg_por_saco)
          : round3(quantidadeInformada);
        const precoUnitario = usarSaco
          ? round2(produto.preco_venda_kg * produto.kg_por_saco)
          : round2(produto.preco_venda_kg + ((clienteIndex + itemIndex) % 4));
        const valorTotalItem = round2(quantidadeInformada * precoUnitario);

        itensVenda.push({
          id: textId("vit", vendaItemSeq),
          venda_id: vendaId,
          insumo_id: produto.id,
          quantidade_kg: quantidadeKg,
          quantidade_informada: quantidadeInformada,
          unidade_id: usarSaco ? sacoId : kgId,
          kg_por_saco: usarSaco ? produto.kg_por_saco : null,
          preco_unitario: precoUnitario,
          valor_total: valorTotalItem,
          criado_em: toTimestamp(dataVenda),
        });
        vendaItemSeq += 1;

        movimentosRows.push({
          id: textId("mov", movimentoSeq),
          insumo_id: produto.id,
          tipo_movimento: "SAIDA_VENDA",
          custo_unitario: round2((custoBaseByInsumo.get(produto.id) || 32) + 1.4),
          quantidade_entrada: 0,
          quantidade_saida: quantidadeKg,
          data_movimentacao: toTimestamp(dataVenda),
          referencia_tipo: "venda",
          referencia_id: vendaId,
          producao_id: null,
          obs: `Baixa da venda ${vendaId}`,
        });
        movimentoSeq += 1;
      }

      const subtotal = round2(itensVenda.reduce((acc, item) => acc + Number(item.valor_total || 0), 0));
      const descontoValor = compraIndex % 6 === 0 ? round2(subtotal * 0.03) : 0;
      const acrescimoValor = compraIndex % 11 === 0 ? round2(subtotal * 0.02) : 0;
      const valorTotalVenda = round2(subtotal - descontoValor + acrescimoValor);

      const entregaProgramada = toDateOnly(addDays(dataVenda, 2 + (compraIndex % 8)));
      const pendenteEntrega = compraIndex % 5 === 0 || (compraIndex % 7 === 0 && clienteIndex % 2 === 0);
      const dataEntrega = pendenteEntrega
        ? null
        : toDateOnly(addDays(dataVenda, 2 + (compraIndex % 6)));

      vendasRows.push({
        id: vendaId,
        cliente_id: cliente.id,
        data_venda: toTimestamp(dataVenda),
        valor_total: valorTotalVenda,
        parcelas_qtd: parcelasQtd,
        valor_negociado: valorTotalVenda,
        status: "ABERTO",
        data_programada_entrega: entregaProgramada,
        data_entrega: dataEntrega,
        status_entrega: pendenteEntrega ? "PENDENTE" : "ENTREGUE",
        obs: pendenteEntrega
          ? "Aguardando confirmacao de entrega"
          : "Entrega confirmada",
        tipo_pagamento: tipoPagamento,
        forma_pagamento: tipoPagamento === "A_VISTA" ? pick(formasPagamento) : null,
        desconto_tipo: descontoValor > 0 ? "PERCENTUAL" : null,
        desconto_valor: descontoValor,
        desconto_descricao: descontoValor > 0 ? "Desconto comercial" : null,
        acrescimo_tipo: acrescimoValor > 0 ? "PERCENTUAL" : null,
        acrescimo_valor: acrescimoValor,
        acrescimo_descricao: acrescimoValor > 0 ? "Ajuste de frete" : null,
      });

      vendaItensRows.push(...itensVenda);

      const contaReceberId = textId("cr", contaReceberSeq);
      contaReceberSeq += 1;

      const parcelasValores = splitAmount(valorTotalVenda, parcelasQtd);
      const parcelasConta = parcelasValores.map((valorParcela, parcelaIndex) => {
        let statusParcela = "ABERTA";
        if (tipoPagamento === "A_VISTA") {
          statusParcela = compraIndex % 4 === 0 ? "ABERTA" : "RECEBIDA";
        } else if (parcelaIndex === 0 && compraIndex % 3 !== 1) {
          statusParcela = "RECEBIDA";
        } else if (parcelaIndex === 1 && compraIndex % 8 === 0) {
          statusParcela = "RECEBIDA";
        }

        const vencimento = withTime(addDays(dataVenda, 30 * (parcelaIndex + 1)), 12, 0);
        const temDiferenca = statusParcela === "RECEBIDA" && compraIndex % 12 === 0 && parcelaIndex === 0;
        const valorProgramado = round2(valorParcela);
        const valorRecebido =
          statusParcela === "RECEBIDA"
            ? temDiferenca
              ? round2(Math.max(0, valorProgramado - 5))
              : valorProgramado
            : null;

        const parcela = {
          id: textId("crp", contaReceberParcelaSeq),
          conta_receber_id: contaReceberId,
          parcela_num: parcelaIndex + 1,
          vencimento: toTimestamp(vencimento),
          valor: valorProgramado,
          status: statusParcela,
          data_recebimento:
            statusParcela === "RECEBIDA"
              ? toTimestamp(addDays(dataVenda, 5 + parcelaIndex * 28))
              : null,
          forma_recebimento: statusParcela === "RECEBIDA" ? pick(formasPagamento) : null,
          producao_id: null,
          valor_programado: valorProgramado,
          valor_recebido: valorRecebido,
          forma_recebimento_real: statusParcela === "RECEBIDA" ? pick(formasPagamento) : null,
          motivo_diferenca: temDiferenca ? "Ajuste acordado com cliente" : null,
          acao_diferenca: temDiferenca ? "ACEITAR_ENCERRAR" : null,
          origem_recebimento: "NORMAL",
          fornecedor_destino_id: null,
          comprovante_url: null,
          observacao_recebimento:
            statusParcela === "RECEBIDA" ? "Recebimento confirmado na operacao" : null,
        };

        contaReceberParcelaSeq += 1;
        return parcela;
      });

      contasReceberRows.push({
        id: contaReceberId,
        cliente_id: cliente.id,
        origem_tipo: "venda",
        origem_id: vendaId,
        valor_total: valorTotalVenda,
        data_emissao: toTimestamp(dataVenda),
        status: normalizeContaReceberStatus(parcelasConta),
        producao_id: null,
      });

      contasReceberParcelasRows.push(...parcelasConta);

      vendaDetalhesRows.push({
        id: textId("vdt", vendaDetalheSeq),
        venda_id: vendaId,
        parcela_id: null,
        tipo_evento: "CRIACAO",
        descricao: "Venda registrada no seed operacional",
        valor: valorTotalVenda,
        data_evento: toTimestamp(dataVenda),
      });
      vendaDetalheSeq += 1;
    }
  }

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
    producoesRows,
  );

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

  await buildInsert(
    pgm,
    "producao_resultados",
    [
      "id",
      "producao_id",
      "insumo_id",
      "tipo_resultado",
      "quantidade_planejada_kg",
      "quantidade_real_kg",
      "criado_em",
    ],
    producaoResultadosRows,
  );

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
      "producao_id",
      "obs",
    ],
    movimentosRows,
  );

  await buildInsert(
    pgm,
    "custos_adicionais_producao",
    ["id", "producao_id", "fornecedor_id", "descricao", "valor", "status_pagamento"],
    custosAdicionaisRows,
  );

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

  await buildInsert(
    pgm,
    "venda_detalhes",
    ["id", "venda_id", "parcela_id", "tipo_evento", "descricao", "valor", "data_evento"],
    vendaDetalhesRows,
  );
};

exports.down = () => {};
