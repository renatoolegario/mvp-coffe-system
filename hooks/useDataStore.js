import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  buildInsumoEstoqueStatus,
  getParcelas,
  getSaldoMovimentosKg,
} from "../utils/stock";
import { getAuthHeaders } from "./useSession";
import { addDaysLocalDateTime, toLocalDateTime } from "../utils/datetime";
import { normalizeClienteEmail } from "../utils/cliente";
import { toPerfilCode } from "../utils/profile";
import { normalizeImageBase64 } from "../utils/image";

const nowIso = () => toLocalDateTime();

const baseState = {
  usuarios: [],
  clientes: [],
  fornecedores: [],
  auxUnidades: [],
  auxFormasPagamento: [],
  empresaConfiguracaoEstoque: [],
  insumos: [],
  movInsumos: [],
  vendas: [],
  vendaItens: [],
  contasPagar: [],
  contasPagarParcelas: [],
  contasReceber: [],
  contasReceberParcelas: [],
  asaasCobrancas: [],
  vendaDetalhes: [],
  producoes: [],
  producaoResultados: [],
  detalhesProducao: [],
  custosAdicionaisProducao: [],
  movimentoProducao: [],
  transferencias: [],
};

const apiFetch = async (path, options) => {
  const customHeaders = options?.headers || {};
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...customHeaders,
    },
  });

  if (!response.ok) {
    let errorMessage = "Erro ao comunicar com a API.";
    try {
      const errorBody = await response.json();
      if (errorBody?.error) {
        errorMessage = errorBody.error;
      }
    } catch (error) {
      errorMessage = "Erro ao comunicar com a API.";
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

const sendCommand = (action, payload) =>
  apiFetch("/api/v1/command", {
    method: "POST",
    body: JSON.stringify({ action, payload }),
  });

const normalizeMovimentoInsumo = (movimento) => {
  const quantidadeEntrada = Number(movimento.quantidade_entrada) || 0;
  const quantidadeSaida = Number(movimento.quantidade_saida) || 0;
  const quantidadeCalculada = quantidadeEntrada - quantidadeSaida;
  const quantidadeNormalizada =
    movimento.quantidade !== undefined
      ? Number(movimento.quantidade) || 0
      : quantidadeCalculada;
  const custoUnitarioNormalizado =
    movimento.custo_unit !== undefined
      ? Number(movimento.custo_unit) || 0
      : Number(movimento.custo_unitario) || 0;
  const custoTotalNormalizado =
    movimento.custo_total !== undefined
      ? Number(movimento.custo_total) || 0
      : custoUnitarioNormalizado * quantidadeNormalizada;

  return {
    ...movimento,
    tipo: movimento.tipo || movimento.tipo_movimento,
    quantidade: quantidadeNormalizada,
    custo_unit: custoUnitarioNormalizado,
    custo_total: custoTotalNormalizado,
    data: movimento.data || movimento.data_movimentacao,
  };
};

const resolveUnidadeByCode = (unidades = [], code = "KG") => {
  const normalized = String(code || "KG")
    .trim()
    .toUpperCase();
  return (
    unidades.find((unidade) => unidade.codigo === normalized) ||
    unidades.find((unidade) => unidade.is_default) ||
    unidades[0] ||
    null
  );
};

const buildParcelaPagamento = ({
  parcelaNum,
  valor,
  vencimento,
  contaPagarId,
  statusInput,
  dataLancamento,
}) => {
  const statusRaw = String(statusInput || "A_PRAZO")
    .trim()
    .toUpperCase();
  const isPago = statusRaw === "PAGO" || statusRaw === "PAGA";
  return {
    id: uuidv4(),
    conta_pagar_id: contaPagarId,
    parcela_num: parcelaNum,
    vencimento: vencimento || dataLancamento,
    valor,
    status: isPago ? "PAGA" : "ABERTA",
    data_pagamento: isPago ? dataLancamento : null,
    forma_pagamento: isPago ? "Entrada manual" : null,
  };
};

export const useDataStore = create((set, get) => ({
  ...baseState,
  hydrated: false,
  loading: false,
  setEmpresaConfiguracaoEstoque: (faixas = []) =>
    set({
      empresaConfiguracaoEstoque: Array.isArray(faixas) ? faixas : [],
    }),
  getInsumoEstoqueStatus: (insumoId, saldoKgOverride = undefined) => {
    const state = get();
    const insumo = state.insumos.find((item) => item.id === insumoId);

    if (!insumo) {
      return buildInsumoEstoqueStatus();
    }

    const saldoKg =
      saldoKgOverride === undefined
        ? getSaldoMovimentosKg(state.movInsumos, insumoId)
        : Number(saldoKgOverride) || 0;

    return buildInsumoEstoqueStatus({
      insumo,
      saldoKg,
      faixas: state.empresaConfiguracaoEstoque,
    });
  },
  loadData: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const data = await apiFetch("/api/v1/data");
      set(() => ({
        ...baseState,
        ...data,
        hydrated: true,
        loading: false,
      }));
    } catch (error) {
      set({ loading: false });
    }
  },
  addUsuario: async (payload) => {
    const usuario = {
      id: uuidv4(),
      ativo: true,
      criado_em: nowIso(),
      ...payload,
      perfil: toPerfilCode(payload.perfil),
    };
    try {
      await sendCommand("addUsuario", usuario);
      set((state) => ({ usuarios: [...state.usuarios, usuario] }));
      return { ok: true, data: usuario };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },
  toggleUsuario: async (id) => {
    const current = get().usuarios.find((usuario) => usuario.id === id);
    if (!current) return;
    const updated = { ...current, ativo: !current.ativo };
    try {
      await sendCommand("toggleUsuario", updated);
      set((state) => ({
        usuarios: state.usuarios.map((usuario) =>
          usuario.id === id ? updated : usuario,
        ),
      }));
    } catch (error) {
      return;
    }
  },
  addCliente: async (payload) => {
    const email = String(payload.email || "")
      .trim()
      .toLowerCase();
    const cliente = {
      id: uuidv4(),
      ativo: true,
      criado_em: nowIso(),
      ...payload,
      email,
      data_aniversario: String(payload.data_aniversario || "").trim() || null,
    };
    try {
      await sendCommand("addCliente", cliente);
      set((state) => ({ clientes: [...state.clientes, cliente] }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },
  updateCliente: async ({ id, ...payload }) => {
    const current = get().clientes.find((cliente) => cliente.id === id);
    if (!current) {
      return { ok: false, error: "Cliente não encontrado." };
    }
    const updated = {
      ...current,
      ...payload,
      nome: payload.nome?.trim() || current.nome,
      email: normalizeClienteEmail(payload.email || current.email),
      cpf_cnpj: payload.cpf_cnpj || "",
      telefone: payload.telefone || "",
      endereco: payload.endereco || "",
      data_aniversario: String(payload.data_aniversario || "").trim() || null,
    };
    try {
      await sendCommand("updateCliente", updated);
      set((state) => ({
        clientes: state.clientes.map((cliente) =>
          cliente.id === id ? updated : cliente,
        ),
      }));
      return { ok: true, data: updated };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },
  addFornecedor: async (payload) => {
    const email = String(payload.email || "")
      .trim()
      .toLowerCase();
    const fornecedor = {
      id: uuidv4(),
      ativo: true,
      criado_em: nowIso(),
      ...payload,
      email,
      data_aniversario: String(payload.data_aniversario || "").trim() || null,
    };
    try {
      await sendCommand("addFornecedor", fornecedor);
      set((state) => ({ fornecedores: [...state.fornecedores, fornecedor] }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },
  addInsumo: async (payload) => {
    const unidades = get().auxUnidades || [];
    const unidadeDefault = resolveUnidadeByCode(
      unidades,
      payload.unidade_codigo || "KG",
    );
    const unidadeEstoque = unidadeDefault;
    const kgPorSaco = Number(payload.kg_por_saco) || 1;
    const imagemPaginaInicialBase64 = normalizeImageBase64(
      payload.imagem_pagina_inicial_base64,
    );

    const insumo = {
      id: uuidv4(),
      ativo: true,
      criado_em: nowIso(),
      ...payload,
      unidade_id: payload.unidade_id || unidadeDefault?.id || null,
      unidade_codigo: unidadeDefault?.codigo || "KG",
      unidade_label: unidadeDefault?.label || "Quilograma",
      kg_por_saco: kgPorSaco,
      estoque_minimo: Number(payload.estoque_minimo) || 0,
      estoque_minimo_unidade_id:
        payload.estoque_minimo_unidade_id || unidadeEstoque?.id || null,
      estoque_minimo_unidade_codigo: unidadeEstoque?.codigo || "KG",
      estoque_minimo_unidade_label: unidadeEstoque?.label || "Quilograma",
      pode_ser_insumo: payload.pode_ser_insumo ?? true,
      pode_ser_produzivel: payload.pode_ser_produzivel ?? false,
      pode_ser_vendido: payload.pode_ser_vendido ?? false,
      aparecer_pagina_inicial: payload.aparecer_pagina_inicial ?? false,
      valor_venda: Number(payload.valor_venda) || 0,
      imagem_pagina_inicial_base64: imagemPaginaInicialBase64 || "",
      descricao: String(payload.descricao || "").trim(),
    };
    try {
      await sendCommand("addInsumo", insumo);
      set((state) => ({ insumos: [...state.insumos, insumo] }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },
  updateInsumo: async ({ id, ...payload }) => {
    const current = get().insumos.find((insumo) => insumo.id === id);
    if (!current) return;
    const unidades = get().auxUnidades || [];
    const unidadePadrao = resolveUnidadeByCode(
      unidades,
      payload.unidade_codigo || current.unidade_codigo || "KG",
    );
    const unidadeEstoque = unidadePadrao;
    const imagemPaginaInicialBase64 = normalizeImageBase64(
      payload.imagem_pagina_inicial_base64 ??
        current.imagem_pagina_inicial_base64,
    );

    const updated = {
      ...current,
      ...payload,
      nome: payload.nome?.trim() || current.nome,
      kg_por_saco: Number(payload.kg_por_saco) || 1,
      estoque_minimo: Number(payload.estoque_minimo) || 0,
      unidade_id: unidadePadrao?.id || current.unidade_id,
      unidade_codigo: unidadePadrao?.codigo || current.unidade_codigo || "KG",
      unidade_label: unidadePadrao?.label || current.unidade_label,
      estoque_minimo_unidade_id:
        unidadeEstoque?.id || current.estoque_minimo_unidade_id,
      estoque_minimo_unidade_codigo:
        unidadeEstoque?.codigo || current.estoque_minimo_unidade_codigo || "KG",
      estoque_minimo_unidade_label:
        unidadeEstoque?.label || current.estoque_minimo_unidade_label,
      pode_ser_insumo:
        payload.pode_ser_insumo ?? current.pode_ser_insumo ?? true,
      pode_ser_produzivel:
        payload.pode_ser_produzivel ?? current.pode_ser_produzivel ?? false,
      pode_ser_vendido:
        payload.pode_ser_vendido ?? current.pode_ser_vendido ?? false,
      aparecer_pagina_inicial:
        payload.aparecer_pagina_inicial ??
        current.aparecer_pagina_inicial ??
        false,
      valor_venda:
        payload.valor_venda === undefined
          ? Number(current.valor_venda) || 0
          : Number(payload.valor_venda) || 0,
      imagem_pagina_inicial_base64:
        imagemPaginaInicialBase64 ||
        (payload.imagem_pagina_inicial_base64 === ""
          ? ""
          : current.imagem_pagina_inicial_base64 || ""),
      descricao:
        payload.descricao !== undefined
          ? String(payload.descricao || "").trim()
          : String(current.descricao || "").trim(),
    };

    try {
      await sendCommand("updateInsumo", updated);
      set((state) => ({
        insumos: state.insumos.map((insumo) =>
          insumo.id === id ? updated : insumo,
        ),
      }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },
  addEntradaInsumos: async ({
    fornecedor_id,
    insumo_id,
    quantidade,
    unidade_entrada,
    kg_por_saco_entrada,
    valor_total,
    parcelas_qtd,
    parcelas_valores,
    parcelas_vencimentos,
    parcelas_status,
    custos_extras,
    obs,
  }) => {
    const entradaId = uuidv4();
    const dataEntrada = nowIso();
    const insumo = get().insumos.find((item) => item.id === insumo_id);
    const unidadeEntrada = unidade_entrada === "saco" ? "saco" : "kg";
    const kgPorSaco =
      Number(kg_por_saco_entrada) || Number(insumo?.kg_por_saco) || 1;
    const quantidadeEmKg =
      unidadeEntrada === "saco" ? quantidade * kgPorSaco : quantidade;
    const custoUnit = quantidadeEmKg ? valor_total / quantidadeEmKg : 0;
    const movimento = {
      id: uuidv4(),
      insumo_id,
      tipo_movimento: "ENTRADA_INSUMO",
      custo_unitario: custoUnit,
      quantidade_entrada: quantidadeEmKg,
      quantidade_saida: 0,
      data_movimentacao: dataEntrada,
      referencia_tipo: "entrada_insumos",
      referencia_id: entradaId,
      obs: obs || "",
    };
    const contaPagarId = uuidv4();
    const parcelasBase = Array.isArray(parcelas_valores)
      ? parcelas_valores.map((valor, index) => ({
          parcela_num: index + 1,
          valor,
          vencimento: parcelas_vencimentos?.[index] || dataEntrada,
        }))
      : getParcelas(valor_total, parcelas_qtd);
    const parcelas = parcelasBase.map((parcela) =>
      buildParcelaPagamento({
        parcelaNum: parcela.parcela_num,
        valor: parcela.valor,
        vencimento:
          parcela.vencimento || parcelas_vencimentos?.[parcela.parcela_num - 1],
        contaPagarId,
        statusInput: parcelas_status?.[parcela.parcela_num - 1] || "A_PRAZO",
        dataLancamento: dataEntrada,
      }),
    );
    const contaPagar = {
      id: contaPagarId,
      fornecedor_id,
      origem_tipo: "entrada_insumos",
      origem_id: entradaId,
      valor_total,
      data_emissao: dataEntrada,
      status: parcelas.every((parcela) => parcela.status === "PAGA")
        ? "PAGO"
        : "ABERTO",
    };
    const custosExtras = (custos_extras || []).map((item) => {
      const contaPagarExtraId = uuidv4();
      const valorTotalExtra = Number(item.valor_total) || 0;
      const parcelasQtdExtra = Math.max(1, Number(item.parcelas_qtd) || 1);
      const parcelasBaseExtra = Array.isArray(item.parcelas_valores)
        ? item.parcelas_valores.map((valor, index) => ({
            parcela_num: index + 1,
            valor,
            vencimento: item.parcelas_vencimentos?.[index] || dataEntrada,
          }))
        : getParcelas(valorTotalExtra, parcelasQtdExtra);

      const parcelasExtra = parcelasBaseExtra.map((parcela) =>
        buildParcelaPagamento({
          parcelaNum: parcela.parcela_num,
          valor: parcela.valor,
          vencimento:
            item.parcelas_vencimentos?.[parcela.parcela_num - 1] ||
            parcela.vencimento,
          contaPagarId: contaPagarExtraId,
          statusInput:
            item.parcelas_status?.[parcela.parcela_num - 1] || "A_PRAZO",
          dataLancamento: dataEntrada,
        }),
      );

      const contaPagarExtra = {
        id: contaPagarExtraId,
        fornecedor_id: item.fornecedor_id,
        origem_tipo: "entrada_insumos_custo_extra",
        origem_id: entradaId,
        valor_total: valorTotalExtra,
        data_emissao: dataEntrada,
        status: parcelasExtra.every((parcela) => parcela.status === "PAGA")
          ? "PAGO"
          : "ABERTO",
      };

      return {
        contaPagar: contaPagarExtra,
        parcelas: parcelasExtra,
      };
    });
    try {
      await sendCommand("addEntradaInsumos", {
        movimento,
        contasPagar: [
          contaPagar,
          ...custosExtras.map((item) => item.contaPagar),
        ],
        parcelas: [
          ...parcelas,
          ...custosExtras.flatMap((item) => item.parcelas),
        ],
      });
      set((state) => ({
        movInsumos: [...state.movInsumos, normalizeMovimentoInsumo(movimento)],
        contasPagar: [
          ...state.contasPagar,
          contaPagar,
          ...custosExtras.map((item) => item.contaPagar),
        ],
        contasPagarParcelas: [
          ...state.contasPagarParcelas,
          ...parcelas,
          ...custosExtras.flatMap((item) => item.parcelas),
        ],
      }));
    } catch (error) {
      return;
    }
  },
  createProducao: async ({
    produtos_programados,
    modo_geracao,
    detalhes,
    obs,
    anexo_base64,
  }) => {
    const dataProducao = nowIso();
    const producaoId = uuidv4();
    const produtosProgramadosMap = new Map();
    (produtos_programados || []).forEach((item) => {
      const insumoId = String(item?.insumo_id || "").trim();
      const quantidadePlanejadaKg = Number(item?.quantidade_planejada_kg) || 0;
      if (!insumoId || quantidadePlanejadaKg <= 0) return;
      produtosProgramadosMap.set(
        insumoId,
        (produtosProgramadosMap.get(insumoId) || 0) + quantidadePlanejadaKg,
      );
    });

    const produtosProgramados = Array.from(
      produtosProgramadosMap.entries(),
    ).map(([insumo_id, quantidade_planejada_kg]) => ({
      insumo_id,
      quantidade_planejada_kg: Number(quantidade_planejada_kg.toFixed(6)),
    }));

    const detalhesProducao = (detalhes || []).map((item) => {
      const insumo = get().insumos.find((i) => i.id === item.insumo_id);
      const custoUnitario = Number(insumo?.custo_medio_kg) || 0;
      const quantidadeKg = Number(item.quantidade_kg) || 0;
      return {
        id: uuidv4(),
        movimento_id: uuidv4(),
        producao_id: producaoId,
        insumo_id: item.insumo_id,
        quantidade_kg: quantidadeKg,
        custo_unitario_previsto: custoUnitario,
        custo_total_previsto: quantidadeKg * custoUnitario,
      };
    });

    if (!detalhesProducao.length) {
      return { ok: false, error: "Adicione ao menos um insumo na produção." };
    }

    const insumo_final_id =
      produtosProgramados[0]?.insumo_id ||
      detalhesProducao[0]?.insumo_id ||
      null;

    if (!insumo_final_id) {
      return { ok: false, error: "Não foi possível definir a produção." };
    }

    const custo_total_previsto = detalhesProducao.reduce(
      (acc, item) => acc + Number(item.custo_total_previsto || 0),
      0,
    );

    const producao = {
      id: producaoId,
      data_producao: dataProducao,
      insumo_final_id,
      status: "PENDENTE",
      modo_geracao: modo_geracao || "PRODUTO_FINAL",
      obs: obs || "",
      anexo_base64: anexo_base64 || null,
      custo_total_previsto,
    };
    const producaoResultados = produtosProgramados.map((item) => ({
      id: uuidv4(),
      producao_id: producaoId,
      insumo_id: item.insumo_id,
      tipo_resultado: "PROGRAMADO",
      quantidade_planejada_kg: item.quantidade_planejada_kg,
      quantidade_real_kg: null,
      criado_em: dataProducao,
    }));

    try {
      await sendCommand("createProducao", {
        producao,
        detalhes: detalhesProducao,
        resultados: producaoResultados,
      });
      set((state) => ({
        producoes: [...state.producoes, producao],
        producaoResultados: [
          ...state.producaoResultados,
          ...producaoResultados,
        ],
        detalhesProducao: [...state.detalhesProducao, ...detalhesProducao],
      }));
      return { ok: true, producaoId };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },
  confirmarRetornoProducao: async ({
    producao_id,
    resultados_retorno,
    custos_adicionais,
    obs,
    anexo_base64,
  }) => {
    const dataConfirmacao = nowIso();
    const resultadosNormalizados = (resultados_retorno || [])
      .map((item) => ({
        resultado_id: item?.resultado_id || null,
        insumo_id: String(item?.insumo_id || "").trim(),
        tipo_resultado: String(item?.tipo_resultado || "PROGRAMADO")
          .trim()
          .toUpperCase(),
        quantidade_planejada_kg: Number(item?.quantidade_planejada_kg) || 0,
        quantidade_real_kg: Number(item?.quantidade_real_kg) || 0,
      }))
      .filter((item) => item.insumo_id && item.quantidade_real_kg > 0);

    if (!resultadosNormalizados.length) return;

    const peso_real = resultadosNormalizados.reduce(
      (acc, item) => acc + item.quantidade_real_kg,
      0,
    );

    const payload = {
      producao_id,
      peso_real,
      resultados_retorno: resultadosNormalizados,
      custos_adicionais: (custos_adicionais || []).map((item) => ({
        id: uuidv4(),
        conta_pagar_id: uuidv4(),
        parcela_id: uuidv4(),
        fornecedor_id: item.fornecedor_id || null,
        descricao: item.descricao || "",
        valor: Number(item.valor) || 0,
        status_pagamento: item.status_pagamento || "PENDENTE",
        forma_pagamento: item.forma_pagamento || null,
      })),
      data_confirmacao: dataConfirmacao,
      obs: obs || "",
      anexo_base64: anexo_base64 || null,
    };

    try {
      await sendCommand("confirmarRetornoProducao", payload);
      await get().loadData();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },
  deleteProducao: async (producaoId) => {
    if (!producaoId) return;
    try {
      await sendCommand("deleteProducao", { producao_id: producaoId });
      await get().loadData();
    } catch (error) {
      return;
    }
  },
  cancelarProducao: async (producaoId) => {
    if (!producaoId) return;

    const movimentosReserva = get().movimentoProducao.filter(
      (m) =>
        String(m.producao_id) === String(producaoId) &&
        m.tipo_movimento === "RESERVA_PRODUCAO",
    );

    const dataCancelamento = nowIso();

    const estornos = movimentosReserva.map((mov) => ({
      id: uuidv4(),
      insumo_id: mov.insumo_id,
      tipo_movimento: "ESTORNO_PRODUCAO",
      custo_unitario: Number(mov.custo_unitario) || 0,
      quantidade_entrada: Number(mov.quantidade_saida) || 0,
      quantidade_saida: 0,
      data_movimentacao: dataCancelamento,
      referencia_tipo: "producao_cancelamento",
      referencia_id: producaoId,
      producao_id: producaoId,
      obs: "Cancelamento de Ordem de Produção",
    }));

    try {
      await sendCommand("cancelarProducao", {
        producao_id: producaoId,
        estornos,
      });
      await get().loadData();
    } catch (error) {
      return;
    }
  },
  createTransferencia: async (payload) => {
    const dataTransferencia = nowIso();
    const id = uuidv4();
    const movimento_origem_id = uuidv4();
    const movimento_destino_id = uuidv4();
    const origem = get().insumos.find((item) => item.id === payload.origem_id);
    const unidadeOperacao =
      resolveUnidadeByCode(
        get().auxUnidades,
        payload.unidade_operacao_codigo || "KG",
      ) || null;
    const quantidadeInformada = Number(payload.quantidade_informada) || 0;
    const kgPorSacoInformado =
      Number(payload.kg_por_saco_informado) || Number(origem?.kg_por_saco) || 1;
    const quantidadeKg =
      unidadeOperacao?.codigo === "SACO"
        ? quantidadeInformada * kgPorSacoInformado
        : quantidadeInformada;

    const transferencia = {
      id,
      data_transferencia: dataTransferencia,
      ...payload,
      quantidade_kg: quantidadeKg,
      quantidade_informada: quantidadeInformada,
      unidade_operacao_id: unidadeOperacao?.id || null,
      unidade_codigo: unidadeOperacao?.codigo || "KG",
      kg_por_saco_informado:
        unidadeOperacao?.codigo === "SACO" ? kgPorSacoInformado : null,
    };

    try {
      await sendCommand("createTransferencia", {
        transferencia,
        movimento_origem_id,
        movimento_destino_id,
      });
      await get().loadData();
    } catch (error) {
      return;
    }
  },
  addVenda: async ({
    cliente_id,
    itens,
    parcelas_qtd,
    obs,
    data_programada_entrega,
    tipo_pagamento = "A_VISTA",
    forma_pagamento = "PIX",
    desconto = null,
    acrescimo = null,
    parcelas_custom = [],
  }) => {
    const vendaId = uuidv4();
    const dataVenda = nowIso();
    const subtotal = (itens || []).reduce((total, item) => {
      const quantidade = Number(item.quantidade) || 0;
      const precoUnitario = Number(item.preco_unit) || 0;
      return total + quantidade * precoUnitario;
    }, 0);
    const descontoTipo = desconto?.tipo || null;
    const descontoRaw = Number(desconto?.valor) || 0;
    const descontoValor =
      descontoTipo === "PERCENTUAL"
        ? (subtotal * descontoRaw) / 100
        : descontoRaw;
    const acrescimoTipo = acrescimo?.tipo || null;
    const acrescimoRaw = Number(acrescimo?.valor) || 0;
    const acrescimoValor =
      acrescimoTipo === "PERCENTUAL"
        ? (subtotal * acrescimoRaw) / 100
        : acrescimoRaw;
    const valor_total = Number(
      Math.max(0, subtotal - descontoValor + acrescimoValor).toFixed(2),
    );
    const parcelasQuantidade =
      tipo_pagamento === "A_PRAZO" ? Math.max(1, Number(parcelas_qtd) || 1) : 1;
    const unidades = get().auxUnidades || [];
    const venda = {
      id: vendaId,
      cliente_id,
      data_venda: dataVenda,
      valor_total,
      parcelas_qtd: parcelasQuantidade,
      valor_negociado: valor_total,
      status: "FECHADA",
      data_programada_entrega: data_programada_entrega || null,
      data_entrega: null,
      status_entrega: "PENDENTE",
      obs,
      tipo_pagamento,
      forma_pagamento: tipo_pagamento === "A_VISTA" ? forma_pagamento : null,
      desconto_tipo: descontoTipo,
      desconto_valor: Number(descontoValor.toFixed(2)),
      desconto_descricao: desconto?.descricao || null,
      acrescimo_tipo: acrescimoTipo,
      acrescimo_valor: Number(acrescimoValor.toFixed(2)),
      acrescimo_descricao: acrescimo?.descricao || null,
    };
    const contaReceberId = uuidv4();
    const contaReceber = {
      id: contaReceberId,
      cliente_id,
      origem_tipo: "venda",
      origem_id: vendaId,
      valor_total,
      data_emissao: dataVenda,
      status: "ABERTO",
    };
    const parcelasOrigem =
      tipo_pagamento === "A_PRAZO" &&
      Array.isArray(parcelas_custom) &&
      parcelas_custom.length
        ? parcelas_custom
        : getParcelas(valor_total, parcelasQuantidade).map((parcela) => ({
            parcela_num: parcela.parcela_num,
            valor: parcela.valor,
            vencimento: dataVenda,
            forma_pagamento,
            status: "ABERTA",
          }));

    const parcelas = parcelasOrigem.map((parcela, index) => {
      const valorParcela = Number(parcela.valor) || 0;
      const statusParcela = String(parcela.status || "ABERTA").toUpperCase();
      const isRecebida = statusParcela === "RECEBIDA";
      const formaProgramada = parcela.forma_pagamento || forma_pagamento;
      return {
        id: uuidv4(),
        conta_receber_id: contaReceberId,
        parcela_num: Number(parcela.parcela_num) || index + 1,
        vencimento: parcela.vencimento || dataVenda,
        valor: valorParcela,
        status: isRecebida ? "RECEBIDA" : "ABERTA",
        data_recebimento: isRecebida ? nowIso() : null,
        forma_recebimento: formaProgramada || null,
        valor_programado: valorParcela,
        valor_recebido: isRecebida ? valorParcela : null,
        forma_recebimento_real: isRecebida ? formaProgramada || null : null,
        motivo_diferenca: null,
        acao_diferenca: null,
        origem_recebimento: "NORMAL",
        fornecedor_destino_id: null,
        comprovante_url: null,
        observacao_recebimento: null,
      };
    });

    const itensVenda = (itens || []).map((item) => {
      const unidade = resolveUnidadeByCode(
        unidades,
        item.unidade_codigo || "KG",
      );
      const quantidadeInformada = Number(item.quantidade) || 0;
      const kgPorSaco =
        Number(item.kg_por_saco) || Number(item.kg_por_saco_item) || 1;
      const quantidadeKg =
        unidade?.codigo === "SACO"
          ? quantidadeInformada * kgPorSaco
          : quantidadeInformada;
      const precoUnitario = Number(item.preco_unit) || 0;
      return {
        id: uuidv4(),
        venda_id: vendaId,
        insumo_id: item.insumo_id,
        quantidade_kg: quantidadeKg,
        quantidade_informada: quantidadeInformada,
        unidade_id: unidade?.id || null,
        unidade_codigo: unidade?.codigo || "KG",
        kg_por_saco: unidade?.codigo === "SACO" ? kgPorSaco : null,
        preco_unitario: precoUnitario,
        valor_total: Number((quantidadeInformada * precoUnitario).toFixed(2)),
        criado_em: dataVenda,
      };
    });

    const vendaDetalhes = parcelas.map((parcela) => ({
      id: uuidv4(),
      venda_id: vendaId,
      parcela_id: parcela.id,
      tipo_evento: "PARCELA",
      descricao: `Parcela ${parcela.parcela_num} criada`,
      valor: parcela.valor,
      data_evento: dataVenda,
    }));
    try {
      await sendCommand("addVenda", {
        venda,
        itens: itensVenda,
        contaReceber,
        parcelas,
        vendaDetalhes,
      });
      await get().loadData();
      return {
        ok: true,
        vendaId,
        contaReceberId,
        parcelas,
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message || "Não foi possível registrar a venda.",
      };
    }
  },
  confirmarEntregaVenda: async ({ venda_id, data_entrega, custos_extras }) => {
    const venda = get().vendas.find((item) => item.id === venda_id);
    if (!venda) return;

    const dataEntrega = data_entrega || nowIso().slice(0, 10);
    const despesas = (custos_extras || []).map((item) => {
      const contaPagarId = uuidv4();
      const valor = Number(item.valor) || 0;
      const dataDespesa = item.data || dataEntrega;
      const statusPagamento =
        item.status_pagamento === "A_VISTA" ? "PAGO" : "ABERTO";
      const formaPagamento = item.forma_pagamento || "TRANSFERENCIA";

      return {
        contaPagar: {
          id: contaPagarId,
          fornecedor_id: item.fornecedor_id || null,
          origem_tipo: "venda_despesa_extra",
          origem_id: venda_id,
          venda_id,
          valor_total: valor,
          data_emissao: dataDespesa,
          status: statusPagamento,
        },
        parcela: {
          id: uuidv4(),
          conta_pagar_id: contaPagarId,
          parcela_num: 1,
          vencimento: dataDespesa,
          valor,
          status: statusPagamento === "PAGO" ? "PAGA" : "ABERTA",
          data_pagamento: statusPagamento === "PAGO" ? dataDespesa : null,
          forma_pagamento: statusPagamento === "PAGO" ? formaPagamento : null,
        },
      };
    });

    try {
      await sendCommand("confirmarEntregaVenda", {
        venda_id,
        data_entrega: dataEntrega,
        contasPagar: despesas.map((item) => item.contaPagar),
        parcelas: despesas.map((item) => item.parcela),
      });

      set((state) => ({
        vendas: state.vendas.map((item) =>
          item.id === venda_id
            ? {
                ...item,
                status_entrega: "ENTREGUE",
                data_entrega: dataEntrega,
              }
            : item,
        ),
        contasPagar: [
          ...state.contasPagar,
          ...despesas.map((item) => item.contaPagar),
        ],
        contasPagarParcelas: [
          ...state.contasPagarParcelas,
          ...despesas.map((item) => item.parcela),
        ],
      }));
    } catch (error) {
      return;
    }
  },
  marcarParcelaPaga: async (input) => {
    const payload = typeof input === "string" ? { id: input } : input || {};
    const parcelaAtual = get().contasPagarParcelas.find(
      (parcela) => parcela.id === payload.id,
    );
    if (!parcelaAtual) return;

    const contaAtual = get().contasPagar.find(
      (conta) => conta.id === parcelaAtual.conta_pagar_id,
    );
    const dataPagamento = nowIso();
    const valorOriginal =
      Number(payload.valor_original ?? parcelaAtual.valor) || 0;
    const valorPago =
      payload.valor_pago === null || payload.valor_pago === undefined
        ? valorOriginal
        : Math.max(0, Number(payload.valor_pago) || 0);
    const diferenca = Number((valorOriginal - valorPago).toFixed(2));
    const gerarNovaCobranca =
      diferenca > 0 &&
      payload.acao_diferenca === "JOGAR_PROXIMA" &&
      Boolean(contaAtual?.fornecedor_id);

    const contaPagarDiferenca = gerarNovaCobranca
      ? {
          id: uuidv4(),
          fornecedor_id: contaAtual?.fornecedor_id || null,
          origem_tipo: "diferenca_pagamento_conta_pagar",
          origem_id: parcelaAtual.id,
          valor_total: diferenca,
          data_emissao: dataPagamento,
          status: "ABERTO",
          venda_id: contaAtual?.venda_id || null,
        }
      : null;

    const parcelaPagarDiferenca = contaPagarDiferenca
      ? {
          id: uuidv4(),
          conta_pagar_id: contaPagarDiferenca.id,
          parcela_num: 1,
          vencimento: addDaysLocalDateTime(7),
          valor: diferenca,
          status: "ABERTA",
          data_pagamento: null,
          forma_pagamento: null,
          producao_id: null,
        }
      : null;

    const updated = {
      ...parcelaAtual,
      status: "PAGA",
      data_pagamento: dataPagamento,
      forma_pagamento: payload.forma_pagamento || "Transferência",
    };

    try {
      await sendCommand("marcarParcelaPaga", {
        ...updated,
        contasPagar: contaPagarDiferenca ? [contaPagarDiferenca] : [],
        parcelasPagar: parcelaPagarDiferenca ? [parcelaPagarDiferenca] : [],
      });
      await get().loadData();
    } catch (error) {
      return;
    }
  },
  marcarParcelaRecebida: async ({
    id,
    ids = [],
    forma_recebimento = "PIX",
    forma_recebimento_real = "",
    valor_recebido = null,
    motivo_diferenca = "",
    acao_diferenca = null,
    origem_recebimento = "NORMAL",
    fornecedor_destino_id = null,
    comprovante_url = null,
    observacao_recebimento = "",
    venda_id,
  }) => {
    const parcelaIds = ids.length ? ids : [id];
    const dataRecebimento = nowIso();
    let lastResponse = null;

    try {
      for (const parcelaId of parcelaIds) {
        const parcelaAtual = get().contasReceberParcelas.find(
          (parcela) => parcela.id === parcelaId,
        );
        if (!parcelaAtual) continue;
        const contaReceber = get().contasReceber.find(
          (conta) => conta.id === parcelaAtual.conta_receber_id,
        );
        const vendaIdParcela =
          contaReceber?.origem_tipo === "venda"
            ? contaReceber?.origem_id
            : venda_id || null;

        const valorProgramado =
          Number(parcelaAtual.valor_programado) ||
          Number(parcelaAtual.valor) ||
          0;
        const valorRecebidoFinal =
          valor_recebido === null || valor_recebido === undefined
            ? valorProgramado
            : Number(valor_recebido) || 0;
        const diferenca = Number(
          (valorProgramado - valorRecebidoFinal).toFixed(2),
        );

        if (diferenca > 0 && !String(motivo_diferenca || "").trim()) {
          return;
        }

        const ajuste =
          diferenca === 0
            ? null
            : {
                id: uuidv4(),
                venda_id: vendaIdParcela,
                tipo_evento: diferenca > 0 ? "DESCONTO" : "JUROS",
                descricao:
                  diferenca > 0
                    ? "Diferença aceita no recebimento"
                    : "Recebimento acima do programado",
                valor:
                  diferenca > 0 ? -Math.abs(diferenca) : Math.abs(diferenca),
                data_evento: dataRecebimento,
              };

        const contasPagarDiretas =
          origem_recebimento === "DIRETO_FORNECEDOR" && fornecedor_destino_id
            ? [
                {
                  id: uuidv4(),
                  fornecedor_id: fornecedor_destino_id,
                  origem_tipo: "cliente_pagou_direto_fornecedor",
                  origem_id: parcelaId,
                  valor_total: valorRecebidoFinal,
                  data_emissao: dataRecebimento,
                  status: "ABERTO",
                  venda_id: null,
                },
              ]
            : [];

        const parcelasPagarDiretas = contasPagarDiretas.map((conta, index) => ({
          id: uuidv4(),
          conta_pagar_id: conta.id,
          parcela_num: index + 1,
          vencimento: dataRecebimento,
          valor: conta.valor_total,
          status: "ABERTA",
          data_pagamento: null,
          forma_pagamento: null,
          producao_id: null,
        }));

        const response = await sendCommand("marcarParcelaRecebida", {
          ...parcelaAtual,
          id: parcelaId,
          status: "RECEBIDA",
          data_recebimento: dataRecebimento,
          forma_recebimento,
          forma_recebimento_real:
            forma_recebimento_real || forma_recebimento || null,
          valor_programado: valorProgramado,
          valor_recebido: valorRecebidoFinal,
          motivo_diferenca: motivo_diferenca || null,
          acao_diferenca:
            diferenca > 0 ? acao_diferenca || "ACEITAR_ENCERRAR" : null,
          origem_recebimento,
          fornecedor_destino_id: fornecedor_destino_id || null,
          comprovante_url: comprovante_url || null,
          observacao_recebimento: observacao_recebimento || null,
          conta_receber_id: parcelaAtual.conta_receber_id,
          parcela_num: parcelaAtual.parcela_num,
          ajuste,
          contasPagar: contasPagarDiretas,
          parcelasPagar: parcelasPagarDiretas,
        });

        if (response?.ok === false) {
          return {
            ok: false,
            error: "Nao foi possivel confirmar o recebimento.",
          };
        }

        lastResponse = response;
      }
      await get().loadData();
      return {
        ok: true,
        data: lastResponse,
      };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },
}));
