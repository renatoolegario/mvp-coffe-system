import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { getCustoConsumoFifo, getParcelas } from "../utils/stock";

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
    const insumo = {
      id: uuidv4(),
      ativo: true,
      criado_em: nowIso(),
      ...payload,
    };
    try {
      await sendCommand("addInsumo", insumo);
      set((state) => ({ insumos: [...state.insumos, insumo] }));
    } catch (error) {
      return;
    }
  },
  addTipoCafe: async (payload) => {
    const tipoCafe = {
      id: uuidv4(),
      ativo: true,
      ...payload,
    };
    try {
      await sendCommand("addTipoCafe", tipoCafe);
      set((state) => ({ tiposCafe: [...state.tiposCafe, tipoCafe] }));
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
    obs,
  }) => {
    const entradaId = uuidv4();
    const dataEntrada = nowIso();
    const custoUnit = quantidade ? valor_total / quantidade : 0;
    const entrada = {
      id: entradaId,
      fornecedor_id,
      data_entrada: dataEntrada,
      valor_total,
      forma_pagamento: "Boleto",
      parcelas_qtd,
      obs,
      status: "ABERTO",
    };
    const movimentos = [
      {
        id: uuidv4(),
        insumo_id,
        tipo: "ENTRADA_COMPRA",
        quantidade,
        custo_unit: custoUnit,
        custo_total: valor_total,
        data: dataEntrada,
        referencia_tipo: "entrada_insumos",
        referencia_id: entradaId,
        obs: obs || "",
      },
    ];
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
        }))
      : getParcelas(valor_total, parcelas_qtd);
    const parcelas = parcelasBase.map((parcela) => ({
      id: uuidv4(),
      conta_pagar_id: contaPagarId,
      parcela_num: parcela.parcela_num,
      vencimento: dataEntrada,
      valor: parcela.valor,
      status: "ABERTA",
      data_pagamento: null,
      forma_pagamento: null,
    }));
    try {
      await sendCommand("addEntradaInsumos", {
        entrada,
        movimentos,
        contaPagar,
        parcelas,
      });
      set((state) => ({
        entradasInsumos: [...state.entradasInsumos, entrada],
        movInsumos: [...state.movInsumos, ...movimentos],
        contasPagar: [...state.contasPagar, contaPagar],
        contasPagarParcelas: [...state.contasPagarParcelas, ...parcelas],
      }));
    } catch (error) {
      return;
    }
  },
  addOrdemProducao: async ({ tipo_cafe_id, quantidade_gerada, obs }) => {
    const ordemId = uuidv4();
    const dataFabricacao = nowIso();
    const tipo = get().tiposCafe.find((item) => item.id === tipo_cafe_id);
    const rendimento = Number(tipo?.rendimento_percent ?? 100);
    const quantidadeInsumo =
      rendimento > 0 ? quantidade_gerada / (rendimento / 100) : 0;
    const insumoId = tipo?.insumo_id;
    const custoConsumo = insumoId
      ? getCustoConsumoFifo(get().movInsumos, insumoId, quantidadeInsumo)
      : { custoTotal: 0, custoUnitario: 0 };
    const custoUnitInsumo = custoConsumo.custoUnitario;
    const custoBase = custoConsumo.custoTotal;
    const margemLucro = tipo
      ? custoBase * (Number(tipo.margem_lucro_percent) / 100)
      : 0;
    const custo_total = custoBase + margemLucro;
    const custo_unit_tipo = quantidade_gerada
      ? custo_total / quantidade_gerada
      : 0;
    const ordem = {
      id: ordemId,
      data_fabricacao: dataFabricacao,
      tipo_cafe_id,
      quantidade_gerada,
      quantidade_insumo: quantidadeInsumo,
      insumo_id: insumoId,
      custo_total,
      status: "FINALIZADA",
      obs,
    };
    const movInsumos = insumoId
      ? [
          {
            id: uuidv4(),
            insumo_id: insumoId,
            tipo: "SAIDA_PRODUCAO",
            quantidade: quantidadeInsumo,
            custo_unit: custoUnitInsumo,
            custo_total: custoBase,
            data: dataFabricacao,
            referencia_tipo: "ordem_producao",
            referencia_id: ordemId,
            obs: obs || "",
          },
        ]
      : [];
    const movLotes = {
      id: uuidv4(),
      tipo_cafe_id,
      tipo: "ENTRADA_FABRICACAO",
      quantidade: quantidade_gerada,
      custo_unit: custo_unit_tipo,
      custo_total,
      data: dataFabricacao,
      referencia_tipo: "ordem_producao",
      referencia_id: ordemId,
      obs: obs || "",
    };
    try {
      await sendCommand("addOrdemProducao", { ordem, movInsumos, movLotes });
      set((state) => ({
        ordensProducao: [...state.ordensProducao, ordem],
        movInsumos: [...state.movInsumos, ...movInsumos],
        movLotes: [...state.movLotes, movLotes],
      }));
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
    const movLotes = itens.map((item) => ({
      id: uuidv4(),
      tipo_cafe_id: item.tipo_cafe_id,
      tipo: "SAIDA_VENDA",
      quantidade: item.quantidade,
      custo_unit: item.custo_unit,
      custo_total: item.quantidade * item.custo_unit,
      data: dataVenda,
      referencia_tipo: "venda",
      referencia_id: vendaId,
      obs: item.obs || "",
    }));
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
        movLotes,
        contaReceber,
        parcelas,
      });
      set((state) => ({
        vendas: [...state.vendas, venda],
        movLotes: [...state.movLotes, ...movLotes],
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
