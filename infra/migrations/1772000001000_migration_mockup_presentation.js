const CryptoJS = require("crypto-js");

const getCryptoConfig = () => {
  const secretKey = process.env.SECRET_KEY;
  const ivValue = process.env.IV;

  if (!secretKey || !ivValue) {
    throw new Error("As variáveis SECRET_KEY e IV são obrigatórias.");
  }

  return {
    iv: CryptoJS.enc.Utf8.parse(ivValue),
    key: CryptoJS.enc.Utf8.parse(secretKey),
  };
};

const encrypt = (content) => {
  const { iv, key } = getCryptoConfig();
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
    unidadesResult.rows.map((row) => [row.codigo, row.id]),
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

  const ids = {
    usuarios: {
      admin: "00000000-0000-4000-8000-000000000001",
      comum: "00000000-0000-4000-8000-000000000002",
    },
    clientes: {
      balcao: "00000000-0000-4000-8000-000000000101",
      cooperativa: "00000000-0000-4000-8000-000000000102",
      cafeteria: "00000000-0000-4000-8000-000000000103",
    },
    fornecedores: {
      graos: "00000000-0000-4000-8000-000000000201",
      logistica: "00000000-0000-4000-8000-000000000202",
    },
    insumos: {
      cafeVerde: "insumo-cafe-verde",
      embalagem: "insumo-embalagem",
      cafeTorrado: "insumo-cafe-torrado",
      cafeMoido: "insumo-cafe-moido",
    },
    producao: {
      pendente: "producao-0001",
      concluida: "producao-0002",
    },
    vendas: {
      vista: "venda-0001",
      prazo: "venda-0002",
    },
    contas: {
      pagarEntradaGraos: "cp-0001",
      pagarEntradaEmbalagem: "cp-0002",
      pagarCustoEntrega: "cp-0003",
      pagarDiretoFornecedor: "cp-0004",
      receberVista: "cr-0001",
      receberPrazo: "cr-0002",
    },
    transferencias: {
      principal: "11111111-1111-4111-8111-111111111111",
    },
  };

  await pgm.db.query(
    `
    INSERT INTO usuarios (id, nome, email, senha, perfil, ativo, criado_em)
    VALUES
      ($1, $2, $3, $4, 1, true, '2026-03-04 08:00:00'::timestamp),
      ($5, $6, $7, $8, 2, true, '2026-03-04 08:10:00'::timestamp)
    `,
    [
      ids.usuarios.admin,
      encrypt("Administrador"),
      encrypt("admin@cafemvp.com"),
      encrypt("mvp_admin_123"),
      ids.usuarios.comum,
      encrypt("Operador Comum"),
      encrypt("operador@cafemvp.com"),
      encrypt("12345"),
    ],
  );

  await pgm.db.query(
    `
    INSERT INTO clientes (id, nome, cpf_cnpj, telefone, endereco, ativo, criado_em, protegido)
    VALUES
      ($1, $2, $3, $4, $5, true, '2026-03-04 08:20:00'::timestamp, true),
      ($6, $7, $8, $9, $10, true, '2026-03-04 08:25:00'::timestamp, false),
      ($11, $12, $13, $14, $15, true, '2026-03-04 08:30:00'::timestamp, false)
    `,
    [
      ids.clientes.balcao,
      encrypt("Cliente Balcão"),
      encrypt("487.123.220-40"),
      encrypt(""),
      encrypt(""),
      ids.clientes.cooperativa,
      encrypt("Cooperativa Mantiqueira"),
      encrypt("12.345.678/0001-90"),
      encrypt("(35) 3333-1111"),
      encrypt("Rua das Palmeiras, 120"),
      ids.clientes.cafeteria,
      encrypt("Cafeteria Central"),
      encrypt("98.765.432/0001-55"),
      encrypt("(35) 99999-2222"),
      encrypt("Av. Brasil, 90"),
    ],
  );

  await pgm.db.query(
    `
    INSERT INTO fornecedores (id, razao_social, cpf_cnpj, telefone, endereco, ativo, criado_em)
    VALUES
      ($1, $2, $3, $4, $5, true, '2026-03-04 08:35:00'::timestamp),
      ($6, $7, $8, $9, $10, true, '2026-03-04 08:40:00'::timestamp)
    `,
    [
      ids.fornecedores.graos,
      encrypt("Fazenda Boa Safra"),
      encrypt("11.111.111/0001-11"),
      encrypt("(35) 3333-5555"),
      encrypt("Zona Rural, km 8"),
      ids.fornecedores.logistica,
      encrypt("Transportes Serra Azul"),
      encrypt("22.222.222/0001-22"),
      encrypt("(35) 3333-8888"),
      encrypt("Distrito Industrial, 45"),
    ],
  );

  await pgm.db.query(
    `
    INSERT INTO insumos (
      id,
      nome,
      estoque_minimo,
      ativo,
      criado_em,
      kg_por_saco,
      pode_ser_insumo,
      pode_ser_produzivel,
      pode_ser_vendido,
      unidade_id,
      estoque_minimo_unidade_id
    )
    VALUES
      ($1, 'Café Verde', 20, true, '2026-03-04 08:45:00'::timestamp, 23, true, false, false, $5, $6),
      ($2, 'Embalagem Válvula', 5, true, '2026-03-04 08:46:00'::timestamp, 1, true, false, false, $4, $4),
      ($3, 'Café Torrado', 10, true, '2026-03-04 08:47:00'::timestamp, 23, false, true, true, $5, $5),
      ($7, 'Café Moído', 8, true, '2026-03-04 08:48:00'::timestamp, 23, false, true, true, $4, $4)
    `,
    [
      ids.insumos.cafeVerde,
      ids.insumos.embalagem,
      ids.insumos.cafeTorrado,
      kgId,
      sacoId,
      sacoId,
      ids.insumos.cafeMoido,
    ],
  );

  await pgm.db.query(
    `
    INSERT INTO producao (
      id,
      data_producao,
      insumo_final_id,
      status,
      modo_geracao,
      peso_real,
      anexo_base64,
      custo_total_previsto,
      custo_total_real,
      custo_unitario_real,
      obs,
      criado_em
    )
    VALUES
      ($1, '2026-03-04 10:00:00'::timestamp, $3, 'PENDENTE', 'PRODUTO_FINAL', null, null, 2415.00, null, null, 'Produção em trânsito aguardando retorno', '2026-03-04 10:00:00'::timestamp),
      ($2, '2026-03-04 11:00:00'::timestamp, $3, 'CONCLUIDA', 'PRODUTO_FINAL', 40, null, 1011.00, 1208.00, 30.20, 'Produção concluída com custo adicional', '2026-03-04 11:00:00'::timestamp)
    `,
    [ids.producao.pendente, ids.producao.concluida, ids.insumos.cafeTorrado],
  );

  await pgm.db.query(
    `
    INSERT INTO detalhes_producao (
      id,
      producao_id,
      insumo_id,
      quantidade_kg,
      custo_unitario_previsto,
      custo_total_previsto
    )
    VALUES
      ('dp-0001', $1, $3, 115, 21.00, 2415.00),
      ('dp-0002', $2, $3, 46, 21.00, 966.00),
      ('dp-0003', $2, $4, 10, 4.50, 45.00)
    `,
    [
      ids.producao.pendente,
      ids.producao.concluida,
      ids.insumos.cafeVerde,
      ids.insumos.embalagem,
    ],
  );

  await pgm.db.query(
    `
    INSERT INTO movimento_producao (
      id,
      insumo_id,
      tipo_movimento,
      custo_unitario,
      quantidade_entrada,
      quantidade_saida,
      data_movimentacao,
      referencia_tipo,
      referencia_id,
      producao_id,
      obs
    )
    VALUES
      ('mov-0001', $1, 'ENTRADA_INSUMO', 21.00, 230, 0, '2026-03-04 09:00:00'::timestamp, 'entrada_insumos', 'entrada-0001', null, '1 saco = 23kg, entrada de 10 sacos'),
      ('mov-0002', $2, 'ENTRADA_INSUMO', 4.50, 80, 0, '2026-03-04 09:05:00'::timestamp, 'entrada_insumos', 'entrada-0002', null, 'Embalagens em kg'),
      ('mov-0003', $1, 'RESERVA_PRODUCAO', 21.00, 0, 115, '2026-03-04 10:00:00'::timestamp, 'producao', $3, $3, 'Envio para produção em trânsito'),
      ('mov-0004', $1, 'RESERVA_PRODUCAO', 21.00, 0, 46, '2026-03-04 11:00:00'::timestamp, 'producao', $4, $4, 'Produção concluída - reserva'),
      ('mov-0005', $2, 'RESERVA_PRODUCAO', 4.50, 0, 10, '2026-03-04 11:00:00'::timestamp, 'producao', $4, $4, 'Produção concluída - embalagem'),
      ('mov-0006', $5, 'ENTRADA_PRODUCAO', 30.20, 40, 0, '2026-03-04 12:00:00'::timestamp, 'producao', $4, $4, 'Retorno de produção concluída'),
      ('mov-0007', $5, 'TRANSFERENCIA_SAIDA', 30.20, 0, 23, '2026-03-04 13:00:00'::timestamp, 'transferencia', $6, null, 'Transferência interna'),
      ('mov-0008', $7, 'TRANSFERENCIA_ENTRADA', 30.20, 23, 0, '2026-03-04 13:00:00'::timestamp, 'transferencia', $6, null, 'Transferência interna')
    `,
    [
      ids.insumos.cafeVerde,
      ids.insumos.embalagem,
      ids.producao.pendente,
      ids.producao.concluida,
      ids.insumos.cafeTorrado,
      ids.transferencias.principal,
      ids.insumos.cafeMoido,
    ],
  );

  await pgm.db.query(
    `
    INSERT INTO transferencias (
      id,
      origem_id,
      destino_id,
      quantidade_kg,
      custo_unitario,
      data_transferencia,
      obs,
      unidade_operacao_id,
      quantidade_informada,
      kg_por_saco_informado
    )
    VALUES
      ($1, $2, $3, 23, 30.20, '2026-03-04 13:00:00'::timestamp, '1 saco convertido para café moído', $4, 1, 23)
    `,
    [
      ids.transferencias.principal,
      ids.insumos.cafeTorrado,
      ids.insumos.cafeMoido,
      sacoId,
    ],
  );

  await pgm.db.query(
    `
    INSERT INTO contas_pagar (
      id,
      fornecedor_id,
      origem_tipo,
      origem_id,
      producao_id,
      valor_total,
      data_emissao,
      status,
      venda_id
    )
    VALUES
      ($1, $5, 'entrada_insumos', 'entrada-0001', null, 4830.00, '2026-03-04 09:00:00'::timestamp, 'ABERTO', null),
      ($2, $6, 'entrada_insumos', 'entrada-0002', null, 360.00, '2026-03-04 09:05:00'::timestamp, 'ABERTO', null),
      ($3, $6, 'venda_despesa_extra', 'venda-0002', null, 120.00, '2026-03-04 16:00:00'::timestamp, 'ABERTO', null),
      ($4, $5, 'cliente_pagou_direto_fornecedor', 'crp-0004', null, 200.00, '2026-03-04 17:00:00'::timestamp, 'ABERTO', null)
    `,
    [
      ids.contas.pagarEntradaGraos,
      ids.contas.pagarEntradaEmbalagem,
      ids.contas.pagarCustoEntrega,
      ids.contas.pagarDiretoFornecedor,
      ids.fornecedores.graos,
      ids.fornecedores.logistica,
    ],
  );

  await pgm.db.query(
    `
    INSERT INTO contas_pagar_parcelas (
      id,
      conta_pagar_id,
      parcela_num,
      vencimento,
      valor,
      status,
      data_pagamento,
      forma_pagamento,
      producao_id
    )
    VALUES
      ('cpp-0001', $1, 1, '2026-03-10 00:00:00'::timestamp, 2415.00, 'ABERTA', null, null, null),
      ('cpp-0002', $1, 2, '2026-04-10 00:00:00'::timestamp, 2415.00, 'ABERTA', null, null, null),
      ('cpp-0003', $2, 1, '2026-03-12 00:00:00'::timestamp, 360.00, 'PAGA', '2026-03-04 09:05:00'::timestamp, 'PIX', null),
      ('cpp-0004', $3, 1, '2026-03-18 00:00:00'::timestamp, 120.00, 'ABERTA', null, null, null),
      ('cpp-0005', $4, 1, '2026-03-20 00:00:00'::timestamp, 200.00, 'ABERTA', null, null, null)
    `,
    [
      ids.contas.pagarEntradaGraos,
      ids.contas.pagarEntradaEmbalagem,
      ids.contas.pagarCustoEntrega,
      ids.contas.pagarDiretoFornecedor,
    ],
  );

  await pgm.db.query(
    `
    INSERT INTO vendas (
      id,
      cliente_id,
      data_venda,
      valor_total,
      parcelas_qtd,
      valor_negociado,
      status,
      data_programada_entrega,
      data_entrega,
      status_entrega,
      obs,
      tipo_pagamento,
      forma_pagamento,
      desconto_tipo,
      desconto_valor,
      desconto_descricao,
      acrescimo_tipo,
      acrescimo_valor,
      acrescimo_descricao
    )
    VALUES
      ($1, $3, '2026-03-04 14:00:00'::timestamp, 756.00, 1, 756.00, 'FECHADA', '2026-03-04', '2026-03-04', 'ENTREGUE', 'Venda balcão à vista', 'A_VISTA', 'PIX', null, 0, null, null, 0, null),
      ($2, $4, '2026-03-04 15:00:00'::timestamp, 1800.00, 3, 1770.00, 'FECHADA', '2026-03-08', null, 'PENDENTE', 'Venda programada parcelada', 'A_PRAZO', null, 'VALOR', 30.00, 'Desconto comercial', 'VALOR', 0, null)
    `,
    [
      ids.vendas.vista,
      ids.vendas.prazo,
      ids.clientes.balcao,
      ids.clientes.cafeteria,
    ],
  );

  await pgm.db.query(
    `
    INSERT INTO venda_itens (
      id,
      venda_id,
      insumo_id,
      quantidade_kg,
      quantidade_informada,
      unidade_id,
      kg_por_saco,
      preco_unitario,
      valor_total,
      criado_em
    )
    VALUES
      ('vi-0001', $1, $3, 23, 1, $5, 23, 756.00, 756.00, '2026-03-04 14:00:00'::timestamp),
      ('vi-0002', $2, $4, 40, 40, $6, null, 45.00, 1800.00, '2026-03-04 15:00:00'::timestamp)
    `,
    [
      ids.vendas.vista,
      ids.vendas.prazo,
      ids.insumos.cafeTorrado,
      ids.insumos.cafeMoido,
      sacoId,
      kgId,
    ],
  );

  await pgm.db.query(
    `
    INSERT INTO contas_receber (
      id,
      cliente_id,
      origem_tipo,
      origem_id,
      valor_total,
      data_emissao,
      status,
      producao_id
    )
    VALUES
      ($1, $3, 'venda', $5, 756.00, '2026-03-04 14:00:00'::timestamp, 'ABERTO', null),
      ($2, $4, 'venda', $6, 1770.00, '2026-03-04 15:00:00'::timestamp, 'ABERTO', null)
    `,
    [
      ids.contas.receberVista,
      ids.contas.receberPrazo,
      ids.clientes.balcao,
      ids.clientes.cafeteria,
      ids.vendas.vista,
      ids.vendas.prazo,
    ],
  );

  await pgm.db.query(
    `
    INSERT INTO contas_receber_parcelas (
      id,
      conta_receber_id,
      parcela_num,
      vencimento,
      valor,
      status,
      data_recebimento,
      forma_recebimento,
      producao_id,
      valor_programado,
      valor_recebido,
      forma_recebimento_real,
      motivo_diferenca,
      acao_diferenca,
      origem_recebimento,
      fornecedor_destino_id,
      comprovante_url,
      observacao_recebimento
    )
    VALUES
      ('crp-0001', $1, 1, '2026-03-04 00:00:00'::timestamp, 756.00, 'RECEBIDA', '2026-03-04 14:30:00'::timestamp, 'PIX', null, 756.00, 756.00, 'PIX', null, null, 'NORMAL', null, null, 'Recebimento integral no balcão'),
      ('crp-0002', $2, 1, '2026-03-20 00:00:00'::timestamp, 590.00, 'ABERTA', null, 'TRANSFERENCIA', null, 590.00, null, null, null, null, 'NORMAL', null, null, null),
      ('crp-0003', $2, 2, '2026-04-20 00:00:00'::timestamp, 590.00, 'ABERTA', null, 'CHEQUE', null, 590.00, null, null, null, null, 'NORMAL', null, null, null),
      ('crp-0004', $2, 3, '2026-05-20 00:00:00'::timestamp, 590.00, 'RECEBIDA', '2026-03-04 17:00:00'::timestamp, 'TRANSFERENCIA', null, 590.00, 390.00, 'TRANSFERENCIA', 'Cliente quitou parte direto ao fornecedor', 'JOGAR_PROXIMA', 'DIRETO_FORNECEDOR', $3, 'https://blob.example.com/comprovantes/crp-0004.pdf', 'Valor restante de 200 lançado como conta a pagar para fornecedor')
    `,
    [
      ids.contas.receberVista,
      ids.contas.receberPrazo,
      ids.fornecedores.graos,
    ],
  );

  await pgm.db.query(
    `
    INSERT INTO venda_detalhes (
      id,
      venda_id,
      parcela_id,
      tipo_evento,
      descricao,
      valor,
      data_evento
    )
    VALUES
      ('vd-0001', $1, 'crp-0001', 'PARCELA', 'Parcela única recebida', 756.00, '2026-03-04 14:30:00'::timestamp),
      ('vd-0002', $2, 'crp-0002', 'PARCELA', 'Parcela 1 programada', 590.00, '2026-03-04 15:00:00'::timestamp),
      ('vd-0003', $2, 'crp-0003', 'PARCELA', 'Parcela 2 programada', 590.00, '2026-03-04 15:00:00'::timestamp),
      ('vd-0004', $2, 'crp-0004', 'PARCELA', 'Parcela 3 com recebimento especial', 590.00, '2026-03-04 17:00:00'::timestamp)
    `,
    [ids.vendas.vista, ids.vendas.prazo],
  );
};

exports.down = () => {};
