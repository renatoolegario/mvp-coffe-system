const CryptoJS = require("crypto-js");
const { randomUUID } = require("crypto");

const BASE_NOW = new Date(2026, 2, 4, 18, 0, 0);
const START_WINDOW = new Date(2025, 2, 4, 8, 0, 0);

const fmt = (value) => String(value).padStart(2, "0");
const toTs = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${fmt(d.getMonth() + 1)}-${fmt(d.getDate())} ${fmt(d.getHours())}:${fmt(d.getMinutes())}:${fmt(d.getSeconds())}`;
};
const toDateOnly = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${fmt(d.getMonth() + 1)}-${fmt(d.getDate())}`;
};
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

let seed = 20260304;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const chance = (prob) => rand() < prob;
const round2 = (n) => Number(Number(n || 0).toFixed(2));

const buildInsert = async (pgm, table, columns, rows) => {
  if (!rows.length) return;
  const values = [];
  const placeholders = rows.map((row, rowIndex) => {
    const rowPlaceholders = columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`);
    values.push(...columns.map((column) => row[column]));
    return `(${rowPlaceholders.join(", ")})`;
  });

  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders.join(", ")}`;
  await pgm.db.query(sql, values);
};

const getCryptoConfig = () => {
  const secretKey = process.env.SECRET_KEY;
  const ivValue = process.env.IV;

  if (!secretKey || !ivValue) {
    throw new Error("As variáveis SECRET_KEY e IV são obrigatórias.");
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

exports.up = async (pgm) => {
  pgm.sql("CREATE EXTENSION IF NOT EXISTS pgcrypto");

  const unidadesResult = await pgm.db.query(
    "SELECT id, codigo FROM aux_unidade WHERE codigo IN ('KG', 'SACO')",
  );
  const unidadeByCodigo = Object.fromEntries(
    unidadesResult.rows.map((row) => [row.codigo, Number(row.id)]),
  );

  const kgId = unidadeByCodigo.KG;
  const sacoId = unidadeByCodigo.SACO;

  if (!kgId || !sacoId) {
    throw new Error("Unidades KG/SACO não encontradas em aux_unidade.");
  }

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

  const usuarios = [
    {
      id: randomUUID(),
      nome: encrypt("Administrador Geral"),
      email: encrypt("admin@mvpcoffee.local"),
      senha: encrypt("Admin@123"),
      perfil: 1,
      ativo: true,
      criado_em: toTs(new Date(2025, 2, 4, 8, 0, 0)),
    },
    {
      id: randomUUID(),
      nome: encrypt("Gestor Financeiro"),
      email: encrypt("financeiro@mvpcoffee.local"),
      senha: encrypt("Finance@123"),
      perfil: 1,
      ativo: true,
      criado_em: toTs(new Date(2025, 2, 4, 8, 10, 0)),
    },
    {
      id: randomUUID(),
      nome: encrypt("Operador Estoque"),
      email: encrypt("estoque@mvpcoffee.local"),
      senha: encrypt("Estoque@123"),
      perfil: 2,
      ativo: true,
      criado_em: toTs(new Date(2025, 2, 4, 8, 20, 0)),
    },
    {
      id: randomUUID(),
      nome: encrypt("Operador Comercial"),
      email: encrypt("comercial@mvpcoffee.local"),
      senha: encrypt("Comercial@123"),
      perfil: 2,
      ativo: true,
      criado_em: toTs(new Date(2025, 2, 4, 8, 30, 0)),
    },
  ];

  const clientes = [];
  clientes.push({
    id: randomUUID(),
    nome: encrypt("Cliente Balcão"),
    cpf_cnpj: encrypt("487.123.220-40"),
    telefone: encrypt(""),
    endereco: encrypt(""),
    ativo: true,
    criado_em: toTs(new Date(2025, 2, 4, 9, 0, 0)),
    protegido: true,
  });

  const nomesClientes = [
    "Armazém Mantiqueira",
    "Cafeteria Horizonte",
    "Padaria Sabor da Serra",
    "Mercado Colinas",
    "Bistrô Aurora",
    "Restaurante Dona Brasa",
    "Empório do Café",
    "Casa de Chá Imperial",
    "Hotel Vale Verde",
    "Mercearia Bom Grão",
  ];

  nomesClientes.forEach((nome, i) => {
    const base = i + 10;
    clientes.push({
      id: randomUUID(),
      nome: encrypt(nome),
      cpf_cnpj: encrypt(`11.${fmt(base)}${fmt(base + 1)}.${fmt(base + 2)}${fmt(base + 3)}/0001-${fmt(base + 4)}`),
      telefone: encrypt(`(35) 9${randInt(1000, 9999)}-${randInt(1000, 9999)}`),
      endereco: encrypt(`Rua ${nome.split(" ")[0]}, ${randInt(10, 900)}`),
      ativo: true,
      criado_em: toTs(addDays(START_WINDOW, randInt(0, 120))),
      protegido: false,
    });
  });

  const nomesFornecedores = [
    "Fazenda Alto da Serra",
    "Cooperativa Sul de Minas",
    "Beneficiadora Premium Beans",
    "Torrefação Vale Dourado",
    "Logística Rota Café",
    "Sacas e Embalagens Brasil",
    "Fazenda Santa Helena",
    "Comercial Grãos Reais",
    "Distribuidora Mineira",
    "Transportadora Horizonte",
    "Fazenda Pedra Branca",
    "Armazéns Nacionais",
    "Café Bom Destino",
    "Agroinsumos Central",
    "Parceiros do Campo Ltda",
  ];

  const fornecedores = nomesFornecedores.map((nome, i) => ({
    id: randomUUID(),
    razao_social: encrypt(nome),
    cpf_cnpj: encrypt(`22.${fmt(i + 10)}${fmt(i + 11)}.${fmt(i + 12)}${fmt(i + 13)}/0001-${fmt(i + 14)}`),
    telefone: encrypt(`(35) 3${randInt(100, 999)}-${randInt(1000, 9999)}`),
    endereco: encrypt(`Av. Industrial ${i + 1}, ${randInt(50, 700)}`),
    ativo: true,
    criado_em: toTs(addDays(START_WINDOW, randInt(0, 150))),
  }));

  const insumos = [
    {
      id: "insumo-cafe-tipo-a-agranel",
      nome: "Café Tipo A Agranel",
      estoque_minimo: 150,
      ativo: true,
      criado_em: toTs(new Date(2025, 2, 5, 8, 0, 0)),
      kg_por_saco: 23,
      pode_ser_insumo: true,
      pode_ser_produzivel: false,
      pode_ser_vendido: true,
      unidade_id: kgId,
      estoque_minimo_unidade_id: kgId,
      custo_base: 21.5,
      categoria: "A",
    },
    {
      id: "insumo-cafe-tipo-b-agranel",
      nome: "Café Tipo B Agranel",
      estoque_minimo: 130,
      ativo: true,
      criado_em: toTs(new Date(2025, 2, 5, 8, 5, 0)),
      kg_por_saco: 23,
      pode_ser_insumo: true,
      pode_ser_produzivel: false,
      pode_ser_vendido: true,
      unidade_id: kgId,
      estoque_minimo_unidade_id: kgId,
      custo_base: 19.8,
      categoria: "B",
    },
    {
      id: "insumo-cafe-tipo-c-agranel",
      nome: "Café Tipo C Agranel",
      estoque_minimo: 100,
      ativo: true,
      criado_em: toTs(new Date(2025, 2, 5, 8, 10, 0)),
      kg_por_saco: 23,
      pode_ser_insumo: true,
      pode_ser_produzivel: false,
      pode_ser_vendido: true,
      unidade_id: kgId,
      estoque_minimo_unidade_id: kgId,
      custo_base: 17.9,
      categoria: "C",
    },
    {
      id: "insumo-cafe-tipo-a-23kg",
      nome: "Café Tipo A 23kg",
      estoque_minimo: 30,
      ativo: true,
      criado_em: toTs(new Date(2025, 2, 5, 8, 15, 0)),
      kg_por_saco: 23,
      pode_ser_insumo: false,
      pode_ser_produzivel: true,
      pode_ser_vendido: true,
      unidade_id: sacoId,
      estoque_minimo_unidade_id: sacoId,
      custo_base: 28.5,
      categoria: "A",
    },
    {
      id: "insumo-cafe-tipo-b-23kg",
      nome: "Café Tipo B 23kg",
      estoque_minimo: 25,
      ativo: true,
      criado_em: toTs(new Date(2025, 2, 5, 8, 20, 0)),
      kg_por_saco: 23,
      pode_ser_insumo: false,
      pode_ser_produzivel: true,
      pode_ser_vendido: true,
      unidade_id: sacoId,
      estoque_minimo_unidade_id: sacoId,
      custo_base: 26.8,
      categoria: "B",
    },
    {
      id: "insumo-cafe-tipo-c-23kg",
      nome: "Café Tipo C 23kg",
      estoque_minimo: 22,
      ativo: true,
      criado_em: toTs(new Date(2025, 2, 5, 8, 25, 0)),
      kg_por_saco: 23,
      pode_ser_insumo: false,
      pode_ser_produzivel: true,
      pode_ser_vendido: true,
      unidade_id: sacoId,
      estoque_minimo_unidade_id: sacoId,
      custo_base: 24.7,
      categoria: "C",
    },
    {
      id: "insumo-cafe-tipo-a-5kg",
      nome: "Café Tipo A 5kg",
      estoque_minimo: 40,
      ativo: true,
      criado_em: toTs(new Date(2025, 2, 5, 8, 30, 0)),
      kg_por_saco: 5,
      pode_ser_insumo: false,
      pode_ser_produzivel: true,
      pode_ser_vendido: true,
      unidade_id: sacoId,
      estoque_minimo_unidade_id: sacoId,
      custo_base: 32.5,
      categoria: "A",
    },
    {
      id: "insumo-cafe-tipo-b-5kg",
      nome: "Café Tipo B 5kg",
      estoque_minimo: 35,
      ativo: true,
      criado_em: toTs(new Date(2025, 2, 5, 8, 35, 0)),
      kg_por_saco: 5,
      pode_ser_insumo: false,
      pode_ser_produzivel: true,
      pode_ser_vendido: true,
      unidade_id: sacoId,
      estoque_minimo_unidade_id: sacoId,
      custo_base: 30.4,
      categoria: "B",
    },
    {
      id: "insumo-cafe-tipo-c-5kg",
      nome: "Café Tipo C 5kg",
      estoque_minimo: 30,
      ativo: true,
      criado_em: toTs(new Date(2025, 2, 5, 8, 40, 0)),
      kg_por_saco: 5,
      pode_ser_insumo: false,
      pode_ser_produzivel: true,
      pode_ser_vendido: true,
      unidade_id: sacoId,
      estoque_minimo_unidade_id: sacoId,
      custo_base: 28.6,
      categoria: "C",
    },
  ];

  const agranelByCategoria = {
    A: insumos.find((i) => i.id === "insumo-cafe-tipo-a-agranel"),
    B: insumos.find((i) => i.id === "insumo-cafe-tipo-b-agranel"),
    C: insumos.find((i) => i.id === "insumo-cafe-tipo-c-agranel"),
  };
  const final23ByCategoria = {
    A: insumos.find((i) => i.id === "insumo-cafe-tipo-a-23kg"),
    B: insumos.find((i) => i.id === "insumo-cafe-tipo-b-23kg"),
    C: insumos.find((i) => i.id === "insumo-cafe-tipo-c-23kg"),
  };
  const final5ByCategoria = {
    A: insumos.find((i) => i.id === "insumo-cafe-tipo-a-5kg"),
    B: insumos.find((i) => i.id === "insumo-cafe-tipo-b-5kg"),
    C: insumos.find((i) => i.id === "insumo-cafe-tipo-c-5kg"),
  };

  const movimentos = [];
  const contasPagar = [];
  const contasPagarParcelas = [];
  const producoes = [];
  const detalhesProducao = [];
  const custosAdicionais = [];
  const transferencias = [];
  const vendas = [];
  const vendaItens = [];
  const contasReceber = [];
  const contasReceberParcelas = [];
  const vendaDetalhes = [];

  let entregaSeq = 1;
  let movSeq = 1;
  let cpSeq = 1;
  let cppSeq = 1;
  let prodSeq = 1;
  let detProdSeq = 1;
  let capSeq = 1;
  let transfSeq = 1;
  let vendaSeq = 1;
  let itemSeq = 1;
  let crSeq = 1;
  let crpSeq = 1;
  let vdSeq = 1;

  const fornecedoresCiclicos = [...fornecedores];

  for (const fornecedor of fornecedores) {
    const entregas = randInt(3, 5);
    for (let i = 0; i < entregas; i += 1) {
      const categoria = pick(["A", "B", "C"]);
      const insumo = agranelByCategoria[categoria];
      const dataEntrega = addDays(START_WINDOW, randInt(0, 360));
      dataEntrega.setHours(randInt(7, 18), randInt(0, 59), 0, 0);

      const quantidadeSacos = randInt(15, 90);
      const quantidadeKg = round2(quantidadeSacos * Number(insumo.kg_por_saco));
      const custoUnitario = round2(insumo.custo_base + rand() * 4.5);
      const valorTotal = round2(quantidadeKg * custoUnitario);

      const entradaId = `entrada-${fmt(entregaSeq)}-${fmt(randInt(10, 99))}`;
      const movimentoId = `mov-ent-${fmt(movSeq)}-${fmt(randInt(10, 99))}`;
      movSeq += 1;
      entregaSeq += 1;

      movimentos.push({
        id: movimentoId,
        insumo_id: insumo.id,
        tipo_movimento: "ENTRADA_INSUMO",
        custo_unitario: custoUnitario,
        quantidade_entrada: quantidadeKg,
        quantidade_saida: 0,
        data_movimentacao: toTs(dataEntrega),
        referencia_tipo: "entrada_insumos",
        referencia_id: entradaId,
        producao_id: null,
        obs: `${quantidadeSacos} sacos recebidos (${insumo.kg_por_saco}kg por saco).`,
      });

      const contaPagarId = `cp-ent-${String(cpSeq).padStart(4, "0")}`;
      cpSeq += 1;

      const parcelaQtd = randInt(1, 3);
      let parcelasPagas = 0;
      const parcelas = [];

      for (let p = 1; p <= parcelaQtd; p += 1) {
        const vencimento = addDays(dataEntrega, p * 25);
        const valorParcela =
          p === parcelaQtd
            ? round2(valorTotal - parcelas.reduce((acc, item) => acc + item.valor, 0))
            : round2(valorTotal / parcelaQtd);

        const paga = chance(0.55) && vencimento <= BASE_NOW;
        if (paga) parcelasPagas += 1;

        parcelas.push({
          id: `cpp-ent-${String(cppSeq).padStart(5, "0")}`,
          conta_pagar_id: contaPagarId,
          parcela_num: p,
          vencimento: toTs(vencimento),
          valor: valorParcela,
          status: paga ? "PAGA" : "ABERTA",
          data_pagamento: paga ? toTs(addDays(vencimento, randInt(-5, 12))) : null,
          forma_pagamento: paga ? pick(["PIX", "TRANSFERENCIA", "DINHEIRO"]) : null,
          producao_id: null,
        });
        cppSeq += 1;
      }

      contasPagar.push({
        id: contaPagarId,
        fornecedor_id: fornecedor.id,
        origem_tipo: "entrada_insumos",
        origem_id: entradaId,
        valor_total: valorTotal,
        data_emissao: toTs(dataEntrega),
        status: parcelasPagas === parcelaQtd ? "PAGO" : "ABERTO",
        producao_id: null,
        venda_id: null,
      });

      contasPagarParcelas.push(...parcelas);
    }
  }

  for (let m = 0; m < 36; m += 1) {
    const categoria = pick(["A", "B", "C"]);
    const finalInsumo = chance(0.55) ? final23ByCategoria[categoria] : final5ByCategoria[categoria];
    const baseAgranel = agranelByCategoria[categoria];

    const dataProducao = addDays(START_WINDOW, randInt(10, 355));
    dataProducao.setHours(randInt(6, 16), randInt(0, 59), 0, 0);

    const quantidadeBags = randInt(20, 120);
    const pesoReal = round2(quantidadeBags * Number(finalInsumo.kg_por_saco));
    const fatorPerda = 1 + rand() * 0.08;
    const consumoAgranelKg = round2(pesoReal * fatorPerda);
    const custoPrevistoUnit = round2(baseAgranel.custo_base + rand() * 2.5);

    const producaoId = `prd-${String(prodSeq).padStart(4, "0")}`;
    prodSeq += 1;

    const conclui = chance(0.88);
    const status = conclui ? "CONCLUIDA" : "PENDENTE";

    producoes.push({
      id: producaoId,
      data_producao: toTs(dataProducao),
      insumo_final_id: finalInsumo.id,
      status,
      modo_geracao: "PRODUTO_FINAL",
      peso_real: conclui ? pesoReal : null,
      anexo_base64: null,
      custo_total_previsto: round2(consumoAgranelKg * custoPrevistoUnit),
      custo_total_real: null,
      custo_unitario_real: null,
      obs: conclui ? "Produção concluída com conferência de lote." : "Produção em trânsito aguardando retorno.",
      criado_em: toTs(dataProducao),
    });

    const detalheId = `dp-${String(detProdSeq).padStart(5, "0")}`;
    detProdSeq += 1;

    detalhesProducao.push({
      id: detalheId,
      producao_id: producaoId,
      insumo_id: baseAgranel.id,
      quantidade_kg: consumoAgranelKg,
      custo_unitario_previsto: custoPrevistoUnit,
      custo_total_previsto: round2(consumoAgranelKg * custoPrevistoUnit),
    });

    const movimentoReservaId = `mov-rsv-${String(movSeq).padStart(5, "0")}`;
    movSeq += 1;
    movimentos.push({
      id: movimentoReservaId,
      insumo_id: baseAgranel.id,
      tipo_movimento: "RESERVA_PRODUCAO",
      custo_unitario: custoPrevistoUnit,
      quantidade_entrada: 0,
      quantidade_saida: consumoAgranelKg,
      data_movimentacao: toTs(dataProducao),
      referencia_tipo: "producao",
      referencia_id: producaoId,
      producao_id: producaoId,
      obs: "Reserva de matéria-prima para OP.",
    });

    if (conclui) {
      const dataConfirmacao = addDays(dataProducao, randInt(0, 2));
      dataConfirmacao.setHours(randInt(9, 20), randInt(0, 59), 0, 0);

      const custoAdicional = chance(0.5) ? round2(randInt(80, 650)) : 0;
      const custoTotalReal = round2(consumoAgranelKg * custoPrevistoUnit + custoAdicional);
      const custoUnitReal = pesoReal > 0 ? round2(custoTotalReal / pesoReal) : 0;

      const producaoAtual = producoes[producoes.length - 1];
      producaoAtual.custo_total_real = custoTotalReal;
      producaoAtual.custo_unitario_real = custoUnitReal;

      const movimentoEntradaId = `mov-op-${String(movSeq).padStart(5, "0")}`;
      movSeq += 1;

      movimentos.push({
        id: movimentoEntradaId,
        insumo_id: finalInsumo.id,
        tipo_movimento: "ENTRADA_PRODUCAO",
        custo_unitario: custoUnitReal,
        quantidade_entrada: pesoReal,
        quantidade_saida: 0,
        data_movimentacao: toTs(dataConfirmacao),
        referencia_tipo: "producao",
        referencia_id: producaoId,
        producao_id: producaoId,
        obs: `Retorno de OP em ${quantidadeBags} sacos de ${finalInsumo.kg_por_saco}kg.`,
      });

      if (custoAdicional > 0) {
        const fornecedor = pick(fornecedoresCiclicos);
        const capId = `cap-${String(capSeq).padStart(5, "0")}`;
        capSeq += 1;

        custosAdicionais.push({
          id: capId,
          producao_id: producaoId,
          fornecedor_id: fornecedor.id,
          descricao: "Frete e beneficiamento adicional",
          valor: custoAdicional,
          status_pagamento: chance(0.45) ? "A_VISTA" : "PENDENTE",
        });

        const contaPagarId = `cp-op-${String(cpSeq).padStart(4, "0")}`;
        cpSeq += 1;
        const paga = chance(0.45);

        contasPagar.push({
          id: contaPagarId,
          fornecedor_id: fornecedor.id,
          origem_tipo: "custo_adicional_producao",
          origem_id: producaoId,
          valor_total: custoAdicional,
          data_emissao: toTs(dataConfirmacao),
          status: paga ? "PAGO" : "ABERTO",
          producao_id: producaoId,
          venda_id: null,
        });

        contasPagarParcelas.push({
          id: `cpp-op-${String(cppSeq).padStart(5, "0")}`,
          conta_pagar_id: contaPagarId,
          parcela_num: 1,
          vencimento: toTs(addDays(dataConfirmacao, 20)),
          valor: custoAdicional,
          status: paga ? "PAGA" : "ABERTA",
          data_pagamento: paga ? toTs(addDays(dataConfirmacao, randInt(0, 12))) : null,
          forma_pagamento: paga ? pick(["PIX", "TRANSFERENCIA", "DINHEIRO"]) : null,
          producao_id: producaoId,
        });
        cppSeq += 1;
      }
    }
  }

  for (let t = 0; t < 28; t += 1) {
    const categoria = pick(["A", "B", "C"]);
    const origem = chance(0.5) ? final23ByCategoria[categoria] : final5ByCategoria[categoria];
    const destino = origem.id.includes("23kg") ? final5ByCategoria[categoria] : final23ByCategoria[categoria];

    const dataTransferencia = addDays(START_WINDOW, randInt(20, 360));
    dataTransferencia.setHours(randInt(8, 19), randInt(0, 59), 0, 0);

    const qtdInformada = randInt(1, 20);
    const kgPorSaco = Number(origem.kg_por_saco);
    const qtdKg = round2(qtdInformada * kgPorSaco);
    const custoUnit = round2((origem.custo_base + destino.custo_base) / 2 + rand() * 2.2);

    const transferenciaId = randomUUID();
    transferencias.push({
      id: transferenciaId,
      origem_id: origem.id,
      destino_id: destino.id,
      quantidade_kg: qtdKg,
      custo_unitario: custoUnit,
      data_transferencia: toTs(dataTransferencia),
      obs: `Transferência interna: ${qtdInformada} sacos (${kgPorSaco}kg/saco).`,
      unidade_operacao_id: sacoId,
      quantidade_informada: qtdInformada,
      kg_por_saco_informado: kgPorSaco,
    });

    movimentos.push({
      id: `mov-trs-${String(movSeq).padStart(5, "0")}`,
      insumo_id: origem.id,
      tipo_movimento: "TRANSFERENCIA_SAIDA",
      custo_unitario: custoUnit,
      quantidade_entrada: 0,
      quantidade_saida: qtdKg,
      data_movimentacao: toTs(dataTransferencia),
      referencia_tipo: "transferencia",
      referencia_id: transferenciaId,
      producao_id: null,
      obs: "Saída por transferência interna.",
    });
    movSeq += 1;

    movimentos.push({
      id: `mov-tre-${String(movSeq).padStart(5, "0")}`,
      insumo_id: destino.id,
      tipo_movimento: "TRANSFERENCIA_ENTRADA",
      custo_unitario: custoUnit,
      quantidade_entrada: qtdKg,
      quantidade_saida: 0,
      data_movimentacao: toTs(dataTransferencia),
      referencia_tipo: "transferencia",
      referencia_id: transferenciaId,
      producao_id: null,
      obs: "Entrada por transferência interna.",
    });
    movSeq += 1;
    transfSeq += 1;
  }

  const clientesComCompra = clientes.filter((c) => !c.protegido);

  for (const cliente of clientesComCompra) {
    const compras = randInt(3, 7);

    for (let c = 0; c < compras; c += 1) {
      const dataVenda = addDays(START_WINDOW, randInt(5, 360));
      dataVenda.setHours(randInt(8, 20), randInt(0, 59), 0, 0);

      const vendaId = `vnd-${String(vendaSeq).padStart(5, "0")}`;
      vendaSeq += 1;

      const categoria = pick(["A", "B", "C"]);
      const itemCount = randInt(1, 2);
      const itensVenda = [];

      for (let i = 0; i < itemCount; i += 1) {
        const opcao = pick([
          final23ByCategoria[categoria],
          final5ByCategoria[categoria],
          agranelByCategoria[categoria],
        ]);

        const usaSaco = opcao.unidade_id === sacoId;
        const qtdInformada = randInt(1, usaSaco ? 12 : 80);
        const qtdKg = usaSaco ? round2(qtdInformada * Number(opcao.kg_por_saco)) : round2(qtdInformada);
        const precoUnit = round2(opcao.custo_base + 7 + rand() * 10);
        const totalItem = round2(qtdKg * precoUnit);

        itensVenda.push({
          id: `vit-${String(itemSeq).padStart(5, "0")}`,
          venda_id: vendaId,
          insumo_id: opcao.id,
          quantidade_kg: qtdKg,
          quantidade_informada: qtdInformada,
          unidade_id: opcao.unidade_id,
          kg_por_saco: usaSaco ? Number(opcao.kg_por_saco) : null,
          preco_unitario: precoUnit,
          valor_total: totalItem,
          criado_em: toTs(dataVenda),
        });
        itemSeq += 1;
      }

      const valorTotal = round2(itensVenda.reduce((acc, item) => acc + item.valor_total, 0));
      const usaDesconto = chance(0.35);
      const usaAcrescimo = chance(0.2);
      const descontoTipo = usaDesconto ? pick(["VALOR", "PERCENTUAL"]) : null;
      const descontoRaw = usaDesconto ? (descontoTipo === "VALOR" ? round2(randInt(10, 120)) : randInt(2, 10)) : 0;
      const descontoValor =
        descontoTipo === "PERCENTUAL" ? round2((valorTotal * descontoRaw) / 100) : round2(descontoRaw);
      const acrescimoTipo = usaAcrescimo ? pick(["VALOR", "PERCENTUAL"]) : null;
      const acrescimoRaw = usaAcrescimo ? (acrescimoTipo === "VALOR" ? round2(randInt(8, 90)) : randInt(1, 6)) : 0;
      const acrescimoValor =
        acrescimoTipo === "PERCENTUAL" ? round2((valorTotal * acrescimoRaw) / 100) : round2(acrescimoRaw);

      const valorNegociado = round2(valorTotal - descontoValor + acrescimoValor);
      const tipoPagamento = chance(0.45) ? "A_PRAZO" : "A_VISTA";
      const parcelasQtd = tipoPagamento === "A_PRAZO" ? randInt(2, 6) : 1;

      const programada = chance(0.24);
      const dataProgramada = programada ? addDays(BASE_NOW, randInt(1, 25)) : addDays(dataVenda, randInt(0, 6));
      const entregue = !programada && chance(0.78);

      vendas.push({
        id: vendaId,
        cliente_id: cliente.id,
        data_venda: toTs(dataVenda),
        valor_total: valorTotal,
        parcelas_qtd: parcelasQtd,
        valor_negociado: valorNegociado,
        status: "FECHADA",
        data_programada_entrega: toDateOnly(dataProgramada),
        data_entrega: entregue ? toDateOnly(addDays(dataProgramada, randInt(0, 2))) : null,
        status_entrega: entregue ? "ENTREGUE" : "PENDENTE",
        obs: programada ? "Venda programada para entrega futura" : "Venda recorrente",
        tipo_pagamento: tipoPagamento,
        forma_pagamento: tipoPagamento === "A_VISTA" ? pick(["PIX", "DINHEIRO", "DEBITO"]) : null,
        desconto_tipo: descontoTipo,
        desconto_valor: descontoValor,
        desconto_descricao: descontoTipo ? "Desconto comercial aplicado" : null,
        acrescimo_tipo: acrescimoTipo,
        acrescimo_valor: acrescimoValor,
        acrescimo_descricao: acrescimoTipo ? "Acréscimo por logística" : null,
      });

      vendaItens.push(...itensVenda);

      const contaReceberId = `cr-${String(crSeq).padStart(5, "0")}`;
      crSeq += 1;

      contasReceber.push({
        id: contaReceberId,
        cliente_id: cliente.id,
        origem_tipo: "venda",
        origem_id: vendaId,
        valor_total: valorNegociado,
        data_emissao: toTs(dataVenda),
        status: "ABERTO",
        producao_id: null,
      });

      let totalRecebidoNaConta = 0;
      const parcelas = [];
      const baseParcela = round2(valorNegociado / parcelasQtd);

      for (let p = 1; p <= parcelasQtd; p += 1) {
        const valorParcela = p === parcelasQtd
          ? round2(valorNegociado - parcelas.reduce((acc, item) => acc + item.valor, 0))
          : baseParcela;

        const vencimento = addDays(dataVenda, p * 30);
        const vencida = vencimento <= BASE_NOW;
        const recebida = vencida && chance(0.7);
        const pagamentoDiretoFornecedor = recebida && chance(0.14);
        const parcial = recebida && chance(0.18);

        const valorRecebido = recebida
          ? (parcial ? round2(valorParcela - randInt(10, Math.max(10, Math.floor(valorParcela * 0.2)))) : valorParcela)
          : null;

        const diferenca = recebida ? round2(valorParcela - (valorRecebido || 0)) : 0;
        const acaoDiferenca = diferenca > 0 ? (chance(0.5) ? "JOGAR_PROXIMA" : "ACEITAR_ENCERRAR") : null;

        const parcelaId = `crp-${String(crpSeq).padStart(6, "0")}`;
        crpSeq += 1;

        const fornecedorDestino = pagamentoDiretoFornecedor ? pick(fornecedoresCiclicos) : null;

        parcelas.push({
          id: parcelaId,
          conta_receber_id: contaReceberId,
          parcela_num: p,
          vencimento: toTs(vencimento),
          valor: valorParcela,
          status: recebida ? "RECEBIDA" : "ABERTA",
          data_recebimento: recebida ? toTs(addDays(vencimento, randInt(-4, 8))) : null,
          forma_recebimento: recebida ? pick(["PIX", "TRANSFERENCIA", "DINHEIRO", "CHEQUE", "CREDITO", "DEBITO"]) : null,
          producao_id: null,
          valor_programado: valorParcela,
          valor_recebido: valorRecebido,
          forma_recebimento_real: recebida ? pick(["PIX", "TRANSFERENCIA", "DINHEIRO", "CHEQUE"]) : null,
          motivo_diferenca: diferenca > 0 ? "Acordo comercial de ajuste" : null,
          acao_diferenca: acaoDiferenca,
          origem_recebimento: pagamentoDiretoFornecedor ? "DIRETO_FORNECEDOR" : "NORMAL",
          fornecedor_destino_id: fornecedorDestino ? fornecedorDestino.id : null,
          comprovante_url: pagamentoDiretoFornecedor
            ? `https://blob.example.com/comprovantes/${parcelaId}.pdf`
            : null,
          observacao_recebimento: pagamentoDiretoFornecedor
            ? "Cliente pagou diretamente o fornecedor; saldo abatido no contas a pagar."
            : (diferenca > 0 ? "Recebimento parcial com decisão registrada." : null),
        });

        if (recebida) {
          totalRecebidoNaConta = round2(totalRecebidoNaConta + (valorRecebido || 0));
          vendaDetalhes.push({
            id: `vd-${String(vdSeq).padStart(6, "0")}`,
            venda_id: vendaId,
            parcela_id: parcelaId,
            tipo_evento: "PARCELA",
            descricao: pagamentoDiretoFornecedor
              ? "Recebimento via pagamento direto ao fornecedor"
              : "Recebimento de parcela",
            valor: valorRecebido || 0,
            data_evento: toTs(addDays(vencimento, randInt(-3, 9))),
          });
          vdSeq += 1;
        }

        if (pagamentoDiretoFornecedor && valorRecebido) {
          const contaPagarDiretaId = `cp-dir-${String(cpSeq).padStart(4, "0")}`;
          cpSeq += 1;

          contasPagar.push({
            id: contaPagarDiretaId,
            fornecedor_id: fornecedorDestino.id,
            origem_tipo: "cliente_pagou_direto_fornecedor",
            origem_id: parcelaId,
            valor_total: valorRecebido,
            data_emissao: toTs(addDays(vencimento, randInt(-2, 4))),
            status: "ABERTO",
            producao_id: null,
            venda_id: vendaId,
          });

          contasPagarParcelas.push({
            id: `cpp-dir-${String(cppSeq).padStart(5, "0")}`,
            conta_pagar_id: contaPagarDiretaId,
            parcela_num: 1,
            vencimento: toTs(addDays(vencimento, 10)),
            valor: valorRecebido,
            status: chance(0.3) ? "PAGA" : "ABERTA",
            data_pagamento: null,
            forma_pagamento: null,
            producao_id: null,
          });
          cppSeq += 1;
        }
      }

      contasReceberParcelas.push(...parcelas);

      const conta = contasReceber[contasReceber.length - 1];
      if (totalRecebidoNaConta >= conta.valor_total) {
        conta.status = "RECEBIDO";
      } else if (totalRecebidoNaConta > 0) {
        conta.status = "PARCIAL";
      } else {
        conta.status = "ABERTO";
      }
    }
  }

  // Vendas extras de balcão à vista
  const clienteBalcao = clientes[0];
  for (let b = 0; b < 24; b += 1) {
    const dataVenda = addDays(START_WINDOW, randInt(0, 360));
    dataVenda.setHours(randInt(7, 19), randInt(0, 59), 0, 0);

    const vendaId = `vnd-balcao-${String(vendaSeq).padStart(5, "0")}`;
    vendaSeq += 1;

    const itemInsumo = pick([
      final23ByCategoria.A,
      final23ByCategoria.B,
      final5ByCategoria.A,
      final5ByCategoria.B,
      final5ByCategoria.C,
    ]);

    const qtdInformada = randInt(1, 5);
    const qtdKg = round2(qtdInformada * Number(itemInsumo.kg_por_saco));
    const precoUnit = round2(itemInsumo.custo_base + 10 + rand() * 12);
    const total = round2(qtdKg * precoUnit);

    vendas.push({
      id: vendaId,
      cliente_id: clienteBalcao.id,
      data_venda: toTs(dataVenda),
      valor_total: total,
      parcelas_qtd: 1,
      valor_negociado: total,
      status: "FECHADA",
      data_programada_entrega: toDateOnly(dataVenda),
      data_entrega: toDateOnly(dataVenda),
      status_entrega: "ENTREGUE",
      obs: "Venda de balcão",
      tipo_pagamento: "A_VISTA",
      forma_pagamento: pick(["PIX", "DINHEIRO", "DEBITO"]),
      desconto_tipo: null,
      desconto_valor: 0,
      desconto_descricao: null,
      acrescimo_tipo: null,
      acrescimo_valor: 0,
      acrescimo_descricao: null,
    });

    const itemId = `vit-${String(itemSeq).padStart(5, "0")}`;
    itemSeq += 1;
    vendaItens.push({
      id: itemId,
      venda_id: vendaId,
      insumo_id: itemInsumo.id,
      quantidade_kg: qtdKg,
      quantidade_informada: qtdInformada,
      unidade_id: sacoId,
      kg_por_saco: itemInsumo.kg_por_saco,
      preco_unitario: precoUnit,
      valor_total: total,
      criado_em: toTs(dataVenda),
    });

    const contaReceberId = `cr-${String(crSeq).padStart(5, "0")}`;
    crSeq += 1;
    contasReceber.push({
      id: contaReceberId,
      cliente_id: clienteBalcao.id,
      origem_tipo: "venda",
      origem_id: vendaId,
      valor_total: total,
      data_emissao: toTs(dataVenda),
      status: "RECEBIDO",
      producao_id: null,
    });

    const parcelaId = `crp-${String(crpSeq).padStart(6, "0")}`;
    crpSeq += 1;
    contasReceberParcelas.push({
      id: parcelaId,
      conta_receber_id: contaReceberId,
      parcela_num: 1,
      vencimento: toTs(dataVenda),
      valor: total,
      status: "RECEBIDA",
      data_recebimento: toTs(dataVenda),
      forma_recebimento: pick(["PIX", "DINHEIRO", "DEBITO"]),
      producao_id: null,
      valor_programado: total,
      valor_recebido: total,
      forma_recebimento_real: pick(["PIX", "DINHEIRO", "DEBITO"]),
      motivo_diferenca: null,
      acao_diferenca: null,
      origem_recebimento: "NORMAL",
      fornecedor_destino_id: null,
      comprovante_url: null,
      observacao_recebimento: "Recebimento imediato no balcão.",
    });

    vendaDetalhes.push({
      id: `vd-${String(vdSeq).padStart(6, "0")}`,
      venda_id: vendaId,
      parcela_id: parcelaId,
      tipo_evento: "PARCELA",
      descricao: "Pagamento à vista no balcão",
      valor: total,
      data_evento: toTs(dataVenda),
    });
    vdSeq += 1;
  }

  await buildInsert(
    pgm,
    "usuarios",
    ["id", "nome", "email", "senha", "perfil", "ativo", "criado_em"],
    usuarios,
  );

  await buildInsert(
    pgm,
    "clientes",
    ["id", "nome", "cpf_cnpj", "telefone", "endereco", "ativo", "criado_em", "protegido"],
    clientes,
  );

  await buildInsert(
    pgm,
    "fornecedores",
    ["id", "razao_social", "cpf_cnpj", "telefone", "endereco", "ativo", "criado_em"],
    fornecedores,
  );

  await buildInsert(
    pgm,
    "insumos",
    [
      "id",
      "nome",
      "estoque_minimo",
      "ativo",
      "criado_em",
      "kg_por_saco",
      "pode_ser_insumo",
      "pode_ser_produzivel",
      "pode_ser_vendido",
      "unidade_id",
      "estoque_minimo_unidade_id",
    ],
    insumos,
  );

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
    producoes,
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
    detalhesProducao,
  );

  await buildInsert(
    pgm,
    "custos_adicionais_producao",
    ["id", "producao_id", "fornecedor_id", "descricao", "valor", "status_pagamento"],
    custosAdicionais,
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
    movimentos,
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
    transferencias,
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
    vendas,
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
    vendaItens,
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
    contasPagar,
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
    contasPagarParcelas,
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
    contasReceber,
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
    contasReceberParcelas,
  );

  await buildInsert(
    pgm,
    "venda_detalhes",
    ["id", "venda_id", "parcela_id", "tipo_evento", "descricao", "valor", "data_evento"],
    vendaDetalhes,
  );

};

exports.down = () => {};
