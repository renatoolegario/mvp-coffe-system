const CryptoJS = require("crypto-js");

const fmt = (value, size = 2) => String(value).padStart(size, "0");

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
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${fmt(date.getMonth() + 1)}-${fmt(date.getDate())}`;
};

const addDays = (value, days) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setDate(date.getDate() + Number(days || 0));
  return date;
};

const withTime = (value, hours = 9, minutes = 0) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const minDate = (a, b) => (a <= b ? a : b);

const round2 = (value) => Number(Number(value || 0).toFixed(2));
const round3 = (value) => Number(Number(value || 0).toFixed(3));

const sumBy = (arr, mapper) =>
  arr.reduce((acc, item) => acc + Number(mapper(item) || 0), 0);

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
  let base = String(100000000 + Number(index || 0)).slice(-9);
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
  let root = String(10000000 + Number(index || 0)).slice(-8);
  if (isAllEqualDigits(root)) {
    root = String(23456789 + Number(index || 0)).slice(-8);
  }
  const base = `${root}0001`;
  const d1 = cnpjDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = cnpjDigit(`${base}${d1}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return formatCnpj(`${base}${d1}${d2}`);
};

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

const formatSeq = (prefix, seq, size = 5) => `${prefix}${fmt(seq, size)}`;

const makeUuid = (group, index) =>
  `${group}-0000-4000-8000-${fmt(Number(index || 0).toString(16), 12)}`;

let rngSeed = 44032026;
const rng = () => {
  rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0;
  return rngSeed / 4294967296;
};
const randInt = (min, max) =>
  Math.floor(rng() * (Number(max) - Number(min) + 1)) + Number(min);
const chance = (probability) => rng() < Number(probability || 0);
const pick = (items) => items[randInt(0, items.length - 1)];

const normalizeContaReceberStatus = (parcelas) => {
  if (!parcelas.length) return "ABERTO";
  const totalProgramado = sumBy(parcelas, (item) => item.valor_programado);
  const totalRecebido = sumBy(parcelas, (item) => item.valor_recebido);
  const recebidas = parcelas.filter((item) => item.status === "RECEBIDA").length;
  if (recebidas === parcelas.length && totalRecebido >= totalProgramado - 0.01) {
    return "RECEBIDO";
  }
  if (recebidas > 0) return "PARCIAL";
  return "ABERTO";
};

const normalizeContaPagarStatus = (parcelas) => {
  if (!parcelas.length) return "ABERTO";
  const pagas = parcelas.filter((item) => item.status === "PAGA").length;
  return pagas === parcelas.length ? "PAGO" : "ABERTO";
};

const toUpper = (value, fallback = "KG") =>
  String(value ?? fallback)
    .trim()
    .toUpperCase();

exports.up = async (pgm) => {
  await pgm.db.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");

  const markerVendaId = "s2-vnd-00001";
  const marker = await pgm.db.query(
    "SELECT 1 FROM vendas WHERE id = $1 LIMIT 1",
    [markerVendaId],
  );
  if (marker.rows[0]) return;

  const hasClientesEmail = await hasColumn(pgm, "clientes", "email");
  const hasFornecedoresEmail = await hasColumn(pgm, "fornecedores", "email");

  const unidadesResult = await pgm.db.query(
    "SELECT id, codigo FROM aux_unidade WHERE codigo IN ('KG', 'SACO')",
  );
  const unidadeByCodigo = Object.fromEntries(
    unidadesResult.rows.map((row) => [
      toUpper(row.codigo),
      Number(row.id),
    ]),
  );

  const kgId = unidadeByCodigo.KG;
  const sacoId = unidadeByCodigo.SACO;

  if (!kgId || !sacoId) {
    throw new Error("Unidades KG e SACO sao obrigatorias em aux_unidade.");
  }

  const insumosResult = await pgm.db.query(`
    SELECT
      id,
      COALESCE(kg_por_saco, 1) AS kg_por_saco,
      unidade_id,
      COALESCE(pode_ser_insumo, true) AS pode_ser_insumo,
      COALESCE(pode_ser_produzivel, false) AS pode_ser_produzivel,
      COALESCE(pode_ser_vendido, false) AS pode_ser_vendido
    FROM insumos
    WHERE COALESCE(ativo, true) = true
    ORDER BY id
  `);

  if (!insumosResult.rows.length) {
    throw new Error("Não há insumos ativos para gerar o seed 2.");
  }

  const insumos = insumosResult.rows.map((row) => ({
    id: String(row.id),
    kg_por_saco: Math.max(0.001, Number(row.kg_por_saco) || 1),
    unidade_id: Number(row.unidade_id) || kgId,
    pode_ser_insumo: Boolean(row.pode_ser_insumo),
    pode_ser_produzivel: Boolean(row.pode_ser_produzivel),
    pode_ser_vendido: Boolean(row.pode_ser_vendido),
  }));

  const insumosEntrada = insumos.filter((item) => item.pode_ser_insumo);
  const insumosVenda = insumos.filter((item) => item.pode_ser_vendido);
  const insumosProducao = insumos.filter((item) => item.pode_ser_produzivel);

  const entradaPool = insumosEntrada.length ? insumosEntrada : insumos;
  const vendaPool = insumosVenda.length ? insumosVenda : insumos;
  const producaoPool = insumosProducao.length ? insumosProducao : vendaPool;

  const clientesNomes = [
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
    "Casa de Cafe Imperial",
  ];

  const fornecedoresNomes = [
    "Fazenda Alta Colheita",
    "Cooperativa Grao Real",
    "Agro Minas Logistica",
    "Beneficiadora Serra Verde",
    "Embalagens Cafe Brasil",
    "Transporte Vale Azul",
  ];

  const cidades = [
    "Uberlandia - MG",
    "Uberaba - MG",
    "Patos de Minas - MG",
    "Araxa - MG",
    "Franca - SP",
    "Ribeirao Preto - SP",
    "Varginha - MG",
  ];

  const now = new Date();
  const oneYearAgo = addDays(now, -365);

  const clientesRows = clientesNomes.map((nome, index) => {
    const idx = index + 1;
    const email = `cliente.seed2.${fmt(idx)}@essenciasdobrasil.local`;
    const cpfCnpj =
      idx % 3 === 0 ? generateCpf(200 + idx) : generateCnpj(300 + idx);
    const row = {
      id: makeUuid("44c10000", idx),
      nome: encrypt(nome),
      cpf_cnpj: encrypt(cpfCnpj),
      telefone: encrypt(`(34) 9${fmt(2000 + idx, 4)}-${fmt(3000 + idx, 4)}`),
      endereco: encrypt(`Rua Comercial ${idx}, ${pick(cidades)}`),
      ativo: true,
      criado_em: toTimestamp(addDays(oneYearAgo, idx * 2)),
      protegido: false,
    };
    if (hasClientesEmail) {
      row.email = encrypt(email);
    }
    return row;
  });

  const fornecedoresRows = fornecedoresNomes.map((razaoSocial, index) => {
    const idx = index + 1;
    const email = `fornecedor.seed2.${fmt(idx)}@essenciasdobrasil.local`;
    const row = {
      id: makeUuid("44f10000", idx),
      razao_social: encrypt(razaoSocial),
      cpf_cnpj: encrypt(generateCnpj(700 + idx)),
      telefone: encrypt(`(34) 3${fmt(100 + idx, 3)}-${fmt(5000 + idx, 4)}`),
      endereco: encrypt(`Avenida Industrial ${idx}, ${pick(cidades)}`),
      ativo: true,
      criado_em: toTimestamp(addDays(oneYearAgo, idx * 3)),
    };
    if (hasFornecedoresEmail) {
      row.email = encrypt(email);
    }
    return row;
  });

  const clientesColumns = [
    "id",
    "nome",
    "cpf_cnpj",
    "telefone",
    "endereco",
    "ativo",
    "criado_em",
    "protegido",
  ];
  if (hasClientesEmail) {
    clientesColumns.splice(2, 0, "email");
  }

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

  await buildInsert(pgm, "clientes", clientesColumns, clientesRows);
  await buildInsert(pgm, "fornecedores", fornecedoresColumns, fornecedoresRows);

  const producaoRows = [];
  const detalhesProducaoRows = [];
  const custosAdicionaisRows = [];
  const movimentoRows = [];
  const transferenciasRows = [];
  const vendasRows = [];
  const vendaItensRows = [];
  const contasPagarRows = [];
  const contasPagarParcelasRows = [];
  const contasReceberRows = [];
  const contasReceberParcelasRows = [];
  const vendaDetalhesRows = [];

  let producaoSeq = 1;
  let detalheSeq = 1;
  let custoSeq = 1;
  let movimentoSeq = 1;
  let transferenciaSeq = 1;
  let vendaSeq = 1;
  let vendaItemSeq = 1;
  let contaPagarSeq = 1;
  let contaPagarParcelaSeq = 1;
  let contaReceberSeq = 1;
  let contaReceberParcelaSeq = 1;
  let vendaDetalheSeq = 1;

  const formasPagamento = [
    "PIX",
    "TRANSFERENCIA",
    "DINHEIRO",
    "CHEQUE",
    "CREDITO",
    "DEBITO",
  ];

  for (const fornecedor of fornecedoresRows) {
    for (let i = 0; i < 8; i += 1) {
      const entradaRef = `s2-ent-${fmt(contaPagarSeq, 5)}`;
      const entradaDate = withTime(
        addDays(oneYearAgo, randInt(2, 345)),
        randInt(7, 17),
        randInt(0, 59),
      );
      const insumoEntrada = pick(entradaPool);
      const quantidadeKg = round3(randInt(8, 65) * insumoEntrada.kg_por_saco);
      const custoUnitario = round2(16 + rng() * 22);
      const valorTotal = round2(quantidadeKg * custoUnitario);
      const parcelaQtd = randInt(2, 3);
      const parcelas = [];
      const valoresParcelas = splitAmount(valorTotal, parcelaQtd);

      for (let p = 0; p < parcelaQtd; p += 1) {
        const vencimento = withTime(addDays(entradaDate, 30 * (p + 1)), 0, 0);
        const paga = vencimento <= now && chance(0.56);
        parcelas.push({
          id: formatSeq("s2-cpp-", contaPagarParcelaSeq, 6),
          conta_pagar_id: formatSeq("s2-cp-", contaPagarSeq, 5),
          parcela_num: p + 1,
          vencimento: toTimestamp(vencimento),
          valor: valoresParcelas[p],
          status: paga ? "PAGA" : "ABERTA",
          data_pagamento: paga
            ? toTimestamp(
                minDate(withTime(addDays(vencimento, randInt(-5, 12)), 14, 0), now),
              )
            : null,
          forma_pagamento: paga ? pick(formasPagamento) : null,
          producao_id: null,
        });
        contaPagarParcelaSeq += 1;
      }

      const contaPagarStatus = normalizeContaPagarStatus(parcelas);

      contasPagarRows.push({
        id: formatSeq("s2-cp-", contaPagarSeq, 5),
        fornecedor_id: fornecedor.id,
        origem_tipo: "entrada_insumos",
        origem_id: entradaRef,
        valor_total: valorTotal,
        data_emissao: toTimestamp(entradaDate),
        status: contaPagarStatus,
        producao_id: null,
        venda_id: null,
      });

      contasPagarParcelasRows.push(...parcelas);

      movimentoRows.push({
        id: formatSeq("s2-mov-", movimentoSeq, 7),
        insumo_id: insumoEntrada.id,
        tipo_movimento: "ENTRADA_INSUMO",
        custo_unitario: custoUnitario,
        quantidade_entrada: quantidadeKg,
        quantidade_saida: 0,
        data_movimentacao: toTimestamp(entradaDate),
        referencia_tipo: "entrada_insumos",
        referencia_id: entradaRef,
        obs: `Entrada de estoque do seed2 #${i + 1}`,
        producao_id: null,
      });

      contaPagarSeq += 1;
      movimentoSeq += 1;
    }
  }

  const producaoTotal = 30;
  for (let i = 0; i < producaoTotal; i += 1) {
    const inTransit = i >= producaoTotal - 8;
    const producaoDate = inTransit
      ? withTime(addDays(now, -randInt(2, 75)), randInt(8, 16), randInt(0, 59))
      : withTime(addDays(oneYearAgo, randInt(7, 320)), randInt(7, 15), randInt(0, 59));

    const insumoEntrada = pick(entradaPool);
    const insumoFinal = pick(producaoPool);
    const quantidadeFinalKg = round3(randInt(12, 90) * insumoFinal.kg_por_saco);
    const fatorPerda = 1 + rng() * 0.09;
    const quantidadeEntradaKg = round3(quantidadeFinalKg * fatorPerda);
    const custoPrevistoUnit = round2(14 + rng() * 17);
    const custoPrevistoTotal = round2(quantidadeEntradaKg * custoPrevistoUnit);

    const status = inTransit ? "PENDENTE" : "CONCLUIDA";
    const retornoDate = withTime(
      minDate(addDays(producaoDate, randInt(1, 4)), now),
      randInt(8, 18),
      randInt(0, 59),
    );

    const custoAdicional = !inTransit && chance(0.45) ? round2(randInt(90, 680)) : 0;
    const custoTotalReal = !inTransit ? round2(custoPrevistoTotal + custoAdicional) : null;
    const custoUnitarioReal =
      !inTransit && quantidadeFinalKg > 0
        ? round2(custoTotalReal / quantidadeFinalKg)
        : null;

    const producaoId = formatSeq("s2-prd-", producaoSeq, 5);
    producaoRows.push({
      id: producaoId,
      data_producao: toTimestamp(producaoDate),
      insumo_final_id: insumoFinal.id,
      status,
      modo_geracao: "PRODUTO_FINAL",
      peso_real: inTransit ? null : quantidadeFinalKg,
      anexo_base64: null,
      custo_total_previsto: custoPrevistoTotal,
      custo_total_real: custoTotalReal,
      custo_unitario_real: custoUnitarioReal,
      obs: inTransit
        ? "Ordem enviada e aguardando retorno da producao."
        : "Producao concluida com conferencia de custo.",
      criado_em: toTimestamp(producaoDate),
    });

    detalhesProducaoRows.push({
      id: formatSeq("s2-dp-", detalheSeq, 6),
      producao_id: producaoId,
      insumo_id: insumoEntrada.id,
      quantidade_kg: quantidadeEntradaKg,
      custo_unitario_previsto: custoPrevistoUnit,
      custo_total_previsto: custoPrevistoTotal,
    });
    detalheSeq += 1;

    movimentoRows.push({
      id: formatSeq("s2-mov-", movimentoSeq, 7),
      insumo_id: insumoEntrada.id,
      tipo_movimento: "RESERVA_PRODUCAO",
      custo_unitario: custoPrevistoUnit,
      quantidade_entrada: 0,
      quantidade_saida: quantidadeEntradaKg,
      data_movimentacao: toTimestamp(producaoDate),
      referencia_tipo: "producao",
      referencia_id: producaoId,
      obs: "Reserva para ordem de producao do seed2.",
      producao_id: producaoId,
    });
    movimentoSeq += 1;

    if (!inTransit) {
      movimentoRows.push({
        id: formatSeq("s2-mov-", movimentoSeq, 7),
        insumo_id: insumoFinal.id,
        tipo_movimento: "ENTRADA_PRODUCAO",
        custo_unitario: custoUnitarioReal,
        quantidade_entrada: quantidadeFinalKg,
        quantidade_saida: 0,
        data_movimentacao: toTimestamp(retornoDate),
        referencia_tipo: "producao",
        referencia_id: producaoId,
        obs: "Retorno da producao concluida do seed2.",
        producao_id: producaoId,
      });
      movimentoSeq += 1;

      if (custoAdicional > 0) {
        const fornecedor = pick(fornecedoresRows);
        const custoId = formatSeq("s2-cap-", custoSeq, 6);
        const statusPagamento = chance(0.5) ? "A_VISTA" : "PENDENTE";

        custosAdicionaisRows.push({
          id: custoId,
          producao_id: producaoId,
          fornecedor_id: fornecedor.id,
          descricao: "Frete e beneficiamento adicional",
          valor: custoAdicional,
          status_pagamento: statusPagamento,
        });

        const parcelaId = formatSeq("s2-cpp-", contaPagarParcelaSeq, 6);
        const contaId = formatSeq("s2-cp-", contaPagarSeq, 5);
        const paga =
          statusPagamento === "A_VISTA" || (retornoDate <= now && chance(0.35));

        contasPagarRows.push({
          id: contaId,
          fornecedor_id: fornecedor.id,
          origem_tipo: "custo_adicional_producao",
          origem_id: custoId,
          valor_total: custoAdicional,
          data_emissao: toTimestamp(retornoDate),
          status: paga ? "PAGO" : "ABERTO",
          producao_id: producaoId,
          venda_id: null,
        });

        contasPagarParcelasRows.push({
          id: parcelaId,
          conta_pagar_id: contaId,
          parcela_num: 1,
          vencimento: toTimestamp(withTime(addDays(retornoDate, 20), 0, 0)),
          valor: custoAdicional,
          status: paga ? "PAGA" : "ABERTA",
          data_pagamento: paga
            ? toTimestamp(minDate(withTime(addDays(retornoDate, randInt(0, 6)), 16, 0), now))
            : null,
          forma_pagamento: paga ? pick(formasPagamento) : null,
          producao_id: producaoId,
        });

        contaPagarSeq += 1;
        contaPagarParcelaSeq += 1;
        custoSeq += 1;
      }
    }

    producaoSeq += 1;
  }

  const transferenciasTotal = 18;
  for (let i = 0; i < transferenciasTotal; i += 1) {
    const origem = pick(vendaPool);
    const destinoCandidates = vendaPool.filter((item) => item.id !== origem.id);
    if (!destinoCandidates.length) break;
    const destino = pick(destinoCandidates);

    const isSaco = origem.unidade_id === sacoId;
    const quantidadeInformada = isSaco
      ? randInt(1, 7)
      : round3(randInt(15, 140));
    const quantidadeKg = isSaco
      ? round3(quantidadeInformada * origem.kg_por_saco)
      : round3(quantidadeInformada);

    const dataTransferencia = withTime(
      addDays(oneYearAgo, randInt(15, 355)),
      randInt(8, 18),
      randInt(0, 59),
    );
    const custoUnitario = round2(18 + rng() * 20);
    const transferenciaId = makeUuid("44a10000", transferenciaSeq);

    transferenciasRows.push({
      id: transferenciaId,
      origem_id: origem.id,
      destino_id: destino.id,
      quantidade_kg: quantidadeKg,
      custo_unitario: custoUnitario,
      data_transferencia: toTimestamp(dataTransferencia),
      obs: "Transferencia interna gerada no seed2.",
      unidade_operacao_id: isSaco ? sacoId : kgId,
      quantidade_informada: quantidadeInformada,
      kg_por_saco_informado: isSaco ? origem.kg_por_saco : null,
    });

    movimentoRows.push({
      id: formatSeq("s2-mov-", movimentoSeq, 7),
      insumo_id: origem.id,
      tipo_movimento: "TRANSFERENCIA_SAIDA",
      custo_unitario: custoUnitario,
      quantidade_entrada: 0,
      quantidade_saida: quantidadeKg,
      data_movimentacao: toTimestamp(dataTransferencia),
      referencia_tipo: "transferencia",
      referencia_id: transferenciaId,
      obs: "Saida para transferencia interna do seed2.",
      producao_id: null,
    });
    movimentoSeq += 1;

    movimentoRows.push({
      id: formatSeq("s2-mov-", movimentoSeq, 7),
      insumo_id: destino.id,
      tipo_movimento: "TRANSFERENCIA_ENTRADA",
      custo_unitario: custoUnitario,
      quantidade_entrada: quantidadeKg,
      quantidade_saida: 0,
      data_movimentacao: toTimestamp(dataTransferencia),
      referencia_tipo: "transferencia",
      referencia_id: transferenciaId,
      obs: "Entrada por transferencia interna do seed2.",
      producao_id: null,
    });
    movimentoSeq += 1;
    transferenciaSeq += 1;
  }

  for (let c = 0; c < clientesRows.length; c += 1) {
    const cliente = clientesRows[c];
    const comprasCliente = c % 2 === 0 ? 7 : 8;

    for (let v = 0; v < comprasCliente; v += 1) {
      const vendaDate = withTime(
        addDays(oneYearAgo, randInt(10, 350)),
        randInt(8, 19),
        randInt(0, 59),
      );
      const itensQtd = randInt(1, 3);
      const itens = [];
      let subtotal = 0;

      for (let i = 0; i < itensQtd; i += 1) {
        const insumo = pick(vendaPool);
        const unidadeId = insumo.unidade_id === sacoId ? sacoId : kgId;
        const isSaco = unidadeId === sacoId;
        const quantidadeInformada = isSaco
          ? randInt(1, 6)
          : round3(randInt(8, 75));
        const quantidadeKg = isSaco
          ? round3(quantidadeInformada * insumo.kg_por_saco)
          : round3(quantidadeInformada);
        const precoUnitario = isSaco
          ? round2(220 + rng() * 260)
          : round2(22 + rng() * 34);
        const valorTotal = round2(precoUnitario * quantidadeInformada);

        itens.push({
          id: formatSeq("s2-vit-", vendaItemSeq, 6),
          venda_id: formatSeq("s2-vnd-", vendaSeq, 5),
          insumo_id: insumo.id,
          quantidade_kg: quantidadeKg,
          quantidade_informada: quantidadeInformada,
          unidade_id: unidadeId,
          kg_por_saco: isSaco ? insumo.kg_por_saco : null,
          preco_unitario: precoUnitario,
          valor_total: valorTotal,
          criado_em: toTimestamp(vendaDate),
        });
        subtotal += valorTotal;
        vendaItemSeq += 1;
      }

      subtotal = round2(subtotal);
      const descontoValor = chance(0.35)
        ? round2(subtotal * (randInt(2, 8) / 100))
        : 0;
      const acrescimoValor = chance(0.2)
        ? round2(subtotal * (randInt(1, 4) / 100))
        : 0;
      const valorNegociado = round2(subtotal - descontoValor + acrescimoValor);

      const tipoPagamento = chance(0.45) ? "A_VISTA" : "A_PRAZO";
      const parcelasQtd = tipoPagamento === "A_VISTA" ? 1 : randInt(2, 4);
      const formaPagamento = tipoPagamento === "A_VISTA" ? pick(formasPagamento) : null;

      const programadaDate = addDays(vendaDate, randInt(0, 9));
      const entregaAtrasada = programadaDate <= addDays(now, -5) && chance(0.18);
      const entregaDate =
        !entregaAtrasada && programadaDate <= now
          ? minDate(addDays(programadaDate, randInt(0, 3)), now)
          : null;
      const statusEntrega = entregaDate ? "ENTREGUE" : "PENDENTE";

      const vendaId = formatSeq("s2-vnd-", vendaSeq, 5);
      vendasRows.push({
        id: vendaId,
        cliente_id: cliente.id,
        data_venda: toTimestamp(vendaDate),
        valor_total: subtotal,
        parcelas_qtd: parcelasQtd,
        valor_negociado: valorNegociado,
        status: "FECHADA",
        data_programada_entrega: toDateOnly(programadaDate),
        data_entrega: entregaDate ? toDateOnly(entregaDate) : null,
        status_entrega: statusEntrega,
        obs: "Venda gerada automaticamente no seed2.",
        tipo_pagamento: tipoPagamento,
        forma_pagamento: formaPagamento,
        desconto_tipo: descontoValor > 0 ? "VALOR" : null,
        desconto_valor: descontoValor,
        desconto_descricao: descontoValor > 0 ? "Ajuste comercial seed2" : null,
        acrescimo_tipo: acrescimoValor > 0 ? "VALOR" : null,
        acrescimo_valor: acrescimoValor,
        acrescimo_descricao: acrescimoValor > 0 ? "Frete especial" : null,
      });

      vendaItensRows.push(...itens);

      const contaReceberId = formatSeq("s2-cr-", contaReceberSeq, 5);
      const parcelas = [];
      const valoresParcelas = splitAmount(valorNegociado, parcelasQtd);

      for (let p = 0; p < parcelasQtd; p += 1) {
        const vencimento = withTime(
          tipoPagamento === "A_VISTA"
            ? vendaDate
            : addDays(vendaDate, 30 * (p + 1)),
          0,
          0,
        );

        const recebeu = vencimento <= now && chance(tipoPagamento === "A_VISTA" ? 0.95 : 0.66);
        const parcial = recebeu && tipoPagamento === "A_PRAZO" && chance(0.12);
        const valorProgramado = valoresParcelas[p];
        const valorRecebido = recebeu
          ? parcial
            ? round2(valorProgramado * (0.62 + rng() * 0.28))
            : valorProgramado
          : null;
        const recebimentoDiretoFornecedor = recebeu && chance(0.08);
        const fornecedorDestino = recebimentoDiretoFornecedor
          ? pick(fornecedoresRows).id
          : null;

        const parcelaId = formatSeq("s2-crp-", contaReceberParcelaSeq, 6);
        parcelas.push({
          id: parcelaId,
          conta_receber_id: contaReceberId,
          parcela_num: p + 1,
          vencimento: toTimestamp(vencimento),
          valor: valorProgramado,
          status: recebeu ? "RECEBIDA" : "ABERTA",
          data_recebimento: recebeu
            ? toTimestamp(
                minDate(withTime(addDays(vencimento, randInt(-4, 9)), 15, 30), now),
              )
            : null,
          forma_recebimento: recebeu ? pick(formasPagamento) : null,
          producao_id: null,
          valor_programado: valorProgramado,
          valor_recebido: valorRecebido,
          forma_recebimento_real: recebeu ? pick(formasPagamento) : null,
          motivo_diferenca: parcial ? "Recebimento parcial negociado" : null,
          acao_diferenca: parcial ? "ACEITAR_ENCERRAR" : null,
          origem_recebimento: recebimentoDiretoFornecedor
            ? "DIRETO_FORNECEDOR"
            : "NORMAL",
          fornecedor_destino_id: fornecedorDestino,
          comprovante_url: recebimentoDiretoFornecedor
            ? `https://blob.example.com/comprovantes/${parcelaId}.pdf`
            : null,
          observacao_recebimento: recebimentoDiretoFornecedor
            ? "Cliente quitou diretamente com fornecedor."
            : parcial
              ? "Parcela recebida parcialmente por acordo."
              : null,
        });

        vendaDetalhesRows.push({
          id: formatSeq("s2-vd-", vendaDetalheSeq, 6),
          venda_id: vendaId,
          parcela_id: parcelaId,
          tipo_evento: "PARCELA",
          descricao: recebeu
            ? `Parcela ${p + 1} recebida`
            : `Parcela ${p + 1} em aberto`,
          valor: valorProgramado,
          data_evento: toTimestamp(recebeu ? minDate(vencimento, now) : vencimento),
        });

        if (recebimentoDiretoFornecedor && valorRecebido) {
          const contaPagarId = formatSeq("s2-cp-", contaPagarSeq, 5);
          const parcelaPagarId = formatSeq("s2-cpp-", contaPagarParcelaSeq, 6);
          const vencimentoPagar = withTime(addDays(vencimento, 10), 0, 0);
          const paga = chance(0.3) && vencimentoPagar <= now;

          contasPagarRows.push({
            id: contaPagarId,
            fornecedor_id: fornecedorDestino,
            origem_tipo: "cliente_pagou_direto_fornecedor",
            origem_id: parcelaId,
            valor_total: valorRecebido,
            data_emissao: toTimestamp(minDate(vencimento, now)),
            status: paga ? "PAGO" : "ABERTO",
            producao_id: null,
            venda_id: vendaId,
          });

          contasPagarParcelasRows.push({
            id: parcelaPagarId,
            conta_pagar_id: contaPagarId,
            parcela_num: 1,
            vencimento: toTimestamp(vencimentoPagar),
            valor: valorRecebido,
            status: paga ? "PAGA" : "ABERTA",
            data_pagamento: paga
              ? toTimestamp(minDate(addDays(vencimentoPagar, randInt(0, 7)), now))
              : null,
            forma_pagamento: paga ? pick(formasPagamento) : null,
            producao_id: null,
          });

          contaPagarSeq += 1;
          contaPagarParcelaSeq += 1;
        }

        contaReceberParcelaSeq += 1;
        vendaDetalheSeq += 1;
      }

      const contaReceberStatus = normalizeContaReceberStatus(parcelas);
      contasReceberRows.push({
        id: contaReceberId,
        cliente_id: cliente.id,
        origem_tipo: "venda",
        origem_id: vendaId,
        valor_total: valorNegociado,
        data_emissao: toTimestamp(vendaDate),
        status: contaReceberStatus,
        producao_id: null,
      });

      contasReceberParcelasRows.push(...parcelas);

      vendaSeq += 1;
      contaReceberSeq += 1;
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
    producaoRows,
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
    "custos_adicionais_producao",
    ["id", "producao_id", "fornecedor_id", "descricao", "valor", "status_pagamento"],
    custosAdicionaisRows,
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
      "obs",
      "producao_id",
    ],
    movimentoRows,
  );

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
    "venda_detalhes",
    ["id", "venda_id", "parcela_id", "tipo_evento", "descricao", "valor", "data_evento"],
    vendaDetalhesRows,
  );
};

exports.down = () => {};
