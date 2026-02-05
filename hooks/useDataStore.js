import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { getParcelas } from "../utils/stock";

const nowIso = () => new Date().toISOString();

const baseState = {
  usuarios: [],
  clientes: [],
  fornecedores: [],
  insumos: [],
  tiposCafe: [],
  movInsumos: [],
  movLotes: [],
  entradasInsumos: [],
  ordensProducao: [],
  vendas: [],
  contasPagar: [],
  contasPagarParcelas: [],
  contasReceber: [],
  contasReceberParcelas: [],
  producoes: [],
  detalhesProducao: [],
  custosAdicionaisProducao: [],
  movimentoProducao: [],
};

const apiFetch = async (path, options) => {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error("Erro ao comunicar com a API.");
  }

  return response.json();
};

const sendCommand = (action, payload) =>
  apiFetch("/api/v1/command", {
    method: "POST",
    body: JSON.stringify({ action, payload }),
  });

export const useDataStore = create((set, get) => ({
  ...baseState,
  hydrated: false,
  loading: false,
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
    };
    try {
      await sendCommand("addUsuario", usuario);
      set((state) => ({ usuarios: [...state.usuarios, usuario] }));
    } catch (error) {
      return;
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
    const cliente = {
      id: uuidv4(),
      ativo: true,
      criado_em: nowIso(),
      ...payload,
    };
    try {
      await sendCommand("addCliente", cliente);
      set((state) => ({ clientes: [...state.clientes, cliente] }));
    } catch (error) {
      return;
    }
  },
  addFornecedor: async (payload) => {
    const fornecedor = {
      id: uuidv4(),
      ativo: true,
      criado_em: nowIso(),
      ...payload,
    };
    try {
      await sendCommand("addFornecedor", fornecedor);
      set((state) => ({ fornecedores: [...state.fornecedores, fornecedor] }));
    } catch (error) {
      return;
    }
  },
  addInsumo: async (payload) => {
    const unidade = "kg";
    const kgPorSaco = Number(payload.kg_por_saco) || 1;
    const estoqueMinimoUnidade =
      payload.estoque_minimo_unidade === "saco" ? "saco" : "kg";

    const insumo = {
      id: uuidv4(),
      ativo: true,
      criado_em: nowIso(),
      ...payload,
      unidade,
      kg_por_saco: kgPorSaco,
      estoque_minimo_unidade: estoqueMinimoUnidade,
      preco_kg: Number(payload.preco_kg) || 0,
      tipo: payload.tipo || "MATERIA_PRIMA",
    };
    try {
      await sendCommand("addInsumo", insumo);
      set((state) => ({ insumos: [...state.insumos, insumo] }));
    } catch (error) {
      return;
    }
  },
  addEntradaInsumos: async ({
    fornecedor_id,
    insumo_id,
    quantidade,
    valor_total,
    parcelas_qtd,
    parcelas_valores,
    parcelas_vencimentos,
    obs,
  }) => {
    const entradaId = uuidv4();
    const dataEntrada = nowIso();
    const insumo = get().insumos.find((item) => item.id === insumo_id);
    const unidadeEntrada = insumo?.unidade === "saco" ? "saco" : "kg";
    const kgPorSaco = Number(insumo?.kg_por_saco) || 1;
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
      referencia_tipo: "entrada_insumo",
      referencia_id: entradaId,
      obs: obs || "",
    };
    const contaPagarId = uuidv4();
    const contaPagar = {
      id: contaPagarId,
      fornecedor_id,
      origem_tipo: "entrada_insumos",
      origem_id: entradaId,
      valor_total,
      data_emissao: dataEntrada,
      status: "ABERTO",
    };
    const parcelasBase = Array.isArray(parcelas_valores)
      ? parcelas_valores.map((valor, index) => ({
          parcela_num: index + 1,
          valor,
          vencimento: parcelas_vencimentos?.[index] || dataEntrada,
        }))
      : getParcelas(valor_total, parcelas_qtd);
    const parcelas = parcelasBase.map((parcela) => ({
      id: uuidv4(),
      conta_pagar_id: contaPagarId,
      parcela_num: parcela.parcela_num,
      vencimento: parcela.vencimento || dataEntrada,
      valor: parcela.valor,
      status: "ABERTA",
      data_pagamento: null,
      forma_pagamento: null,
    }));
    try {
      await sendCommand("addEntradaInsumos", {
        movimento,
        contaPagar,
        parcelas,
      });
      set((state) => ({
        movimentoProducao: [...state.movimentoProducao, movimento],
        contasPagar: [...state.contasPagar, contaPagar],
        contasPagarParcelas: [...state.contasPagarParcelas, ...parcelas],
      }));
    } catch (error) {
      return;
    }
  },
  createProducao: async ({
    insumo_final_id,
    modo_geracao,
    taxa_conversao_planejada = 76,
    peso_previsto,
    detalhes,
    obs,
    anexo_base64,
  }) => {
    const dataProducao = nowIso();
    const producaoId = uuidv4();
    const detalhesProducao = (detalhes || []).map((item) => {
      const insumo = get().insumos.find((i) => i.id === item.insumo_id);
      const custoUnitario = Number(insumo?.preco_kg) || 0;
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

    const custo_total_previsto = detalhesProducao.reduce(
      (acc, item) => acc + Number(item.custo_total_previsto || 0),
      0,
    );

    const producao = {
      id: producaoId,
      data_producao: dataProducao,
      insumo_final_id,
      status: 1,
      modo_geracao: modo_geracao || "PRODUTO_FINAL",
      taxa_conversao_planejada,
      peso_previsto: Number(peso_previsto) || 0,
      obs: obs || "",
      anexo_base64: anexo_base64 || null,
      custo_total_previsto,
    };

    try {
      await sendCommand("createProducao", {
        producao,
        detalhes: detalhesProducao,
      });
      set((state) => ({
        producoes: [...state.producoes, producao],
        detalhesProducao: [...state.detalhesProducao, ...detalhesProducao],
      }));
    } catch (error) {
      return;
    }
  },
  confirmarRetornoProducao: async ({
    producao_id,
    peso_real,
    taxa_conversao_real,
    custos_adicionais,
    obs,
    anexo_base64,
  }) => {
    const dataConfirmacao = nowIso();
    const payload = {
      producao_id,
      peso_real,
      taxa_conversao_real,
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
      movimento_entrada_id: uuidv4(),
      obs: obs || "",
      anexo_base64: anexo_base64 || null,
    };

    try {
      await sendCommand("confirmarRetornoProducao", payload);
      await get().loadData();
    } catch (error) {
      return;
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
  addVenda: async ({ cliente_id, itens, parcelas_qtd, obs }) => {
    const vendaId = uuidv4();
    const dataVenda = nowIso();
    const valor_total = itens.reduce(
      (total, item) => total + item.quantidade * item.preco_unit,
      0,
    );
    const venda = {
      id: vendaId,
      cliente_id,
      data_venda: dataVenda,
      valor_total,
      parcelas_qtd,
      valor_negociado: valor_total,
      status: "FECHADA",
      obs,
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
    const parcelas = getParcelas(valor_total, parcelas_qtd).map((parcela) => ({
      id: uuidv4(),
      conta_receber_id: contaReceberId,
      parcela_num: parcela.parcela_num,
      vencimento: dataVenda,
      valor: parcela.valor,
      status: "ABERTA",
      data_recebimento: null,
      forma_recebimento: null,
    }));
    try {
      await sendCommand("addVenda", {
        venda,
        contaReceber,
        parcelas,
      });
      set((state) => ({
        vendas: [...state.vendas, venda],
        contasReceber: [...state.contasReceber, contaReceber],
        contasReceberParcelas: [...state.contasReceberParcelas, ...parcelas],
      }));
    } catch (error) {
      return;
    }
  },
  marcarParcelaPaga: async (id) => {
    const parcelaAtual = get().contasPagarParcelas.find(
      (parcela) => parcela.id === id,
    );
    if (!parcelaAtual) return;
    const updated = {
      ...parcelaAtual,
      status: "PAGA",
      data_pagamento: nowIso(),
      forma_pagamento: "Transferência",
    };
    try {
      await sendCommand("marcarParcelaPaga", updated);
      set((state) => ({
        contasPagarParcelas: state.contasPagarParcelas.map((parcela) =>
          parcela.id === id ? updated : parcela,
        ),
      }));
    } catch (error) {
      return;
    }
  },
  marcarParcelaRecebida: async (id) => {
    const parcelaAtual = get().contasReceberParcelas.find(
      (parcela) => parcela.id === id,
    );
    if (!parcelaAtual) return;
    const updated = {
      ...parcelaAtual,
      status: "RECEBIDA",
      data_recebimento: nowIso(),
      forma_recebimento: "Pix",
    };
    try {
      await sendCommand("marcarParcelaRecebida", updated);
      set((state) => ({
        contasReceberParcelas: state.contasReceberParcelas.map((parcela) =>
          parcela.id === id ? updated : parcela,
        ),
      }));
    } catch (error) {
      return;
    }
  },
}));
