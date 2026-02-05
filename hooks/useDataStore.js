import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { indexedDbStorage } from "../utils/indexedDb";
import { getCustoMedio, getParcelas } from "../utils/stock";

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

export const useDataStore = create(
  persist(
    (set, get) => ({
      ...baseState,
      hydrateFromSeed: (payload) =>
        set(() => ({
          ...baseState,
          ...payload,
        })),
      addUsuario: (payload) =>
        set((state) => ({
          usuarios: [
            ...state.usuarios,
            {
              id: uuidv4(),
              ativo: true,
              criado_em: nowIso(),
              ...payload,
            },
          ],
        })),
      toggleUsuario: (id) =>
        set((state) => ({
          usuarios: state.usuarios.map((usuario) =>
            usuario.id === id
              ? { ...usuario, ativo: !usuario.ativo }
              : usuario
          ),
        })),
      addCliente: (payload) =>
        set((state) => ({
          clientes: [
            ...state.clientes,
            {
              id: uuidv4(),
              ativo: true,
              criado_em: nowIso(),
              ...payload,
            },
          ],
        })),
      addFornecedor: (payload) =>
        set((state) => ({
          fornecedores: [
            ...state.fornecedores,
            {
              id: uuidv4(),
              ativo: true,
              criado_em: nowIso(),
              ...payload,
            },
          ],
        })),
      addInsumo: (payload) =>
        set((state) => ({
          insumos: [
            ...state.insumos,
            {
              id: uuidv4(),
              ativo: true,
              criado_em: nowIso(),
              ...payload,
            },
          ],
        })),
      addTipoCafe: (payload) =>
        set((state) => ({
          tiposCafe: [
            ...state.tiposCafe,
            {
              id: uuidv4(),
              ativo: true,
              criado_em: nowIso(),
              ...payload,
            },
          ],
        })),
      addEntradaInsumos: ({ fornecedor_id, itens, parcelas_qtd, obs }) => {
        const entradaId = uuidv4();
        const dataEntrada = nowIso();
        const valor_total = itens.reduce(
          (total, item) => total + item.quantidade * item.custo_unit,
          0
        );
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
        const movimentos = itens.map((item) => ({
          id: uuidv4(),
          insumo_id: item.insumo_id,
          tipo: "ENTRADA_COMPRA",
          quantidade: item.quantidade,
          custo_unit: item.custo_unit,
          custo_total: item.quantidade * item.custo_unit,
          data: dataEntrada,
          referencia_tipo: "entrada_insumos",
          referencia_id: entradaId,
          obs: item.obs || "",
        }));
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
        const parcelas = getParcelas(valor_total, parcelas_qtd).map((parcela) => ({
          id: uuidv4(),
          conta_pagar_id: contaPagarId,
          parcela_num: parcela.parcela_num,
          vencimento: dataEntrada,
          valor: parcela.valor,
          status: "ABERTA",
          data_pagamento: null,
          forma_pagamento: null,
        }));
        set((state) => ({
          entradasInsumos: [...state.entradasInsumos, entrada],
          movInsumos: [...state.movInsumos, ...movimentos],
          contasPagar: [...state.contasPagar, contaPagar],
          contasPagarParcelas: [...state.contasPagarParcelas, ...parcelas],
        }));
      },
      addOrdemProducao: ({ tipo_cafe_id, quantidade_gerada, obs }) => {
        const ordemId = uuidv4();
        const dataFabricacao = nowIso();
        const tipo = get().tiposCafe.find((item) => item.id === tipo_cafe_id);
        const rendimento = Number(tipo?.rendimento_percent ?? 100);
        const quantidadeInsumo =
          rendimento > 0 ? quantidade_gerada / (rendimento / 100) : 0;
        const insumoId = tipo?.insumo_id;
        const custoUnitInsumo = insumoId
          ? getCustoMedio(get().movInsumos, (mov) => mov.insumo_id === insumoId)
          : 0;
        const custoBase = quantidadeInsumo * custoUnitInsumo;
        const margemLucro = tipo
          ? custoBase * (Number(tipo.margem_lucro_percent) / 100)
          : 0;
        const custo_total = custoBase + margemLucro;
        const custo_unit_tipo = quantidade_gerada ? custo_total / quantidade_gerada : 0;
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
                custo_total: quantidadeInsumo * custoUnitInsumo,
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
        set((state) => ({
          ordensProducao: [...state.ordensProducao, ordem],
          movInsumos: [...state.movInsumos, ...movInsumos],
          movLotes: [...state.movLotes, movLotes],
        }));
      },
      addVenda: ({ cliente_id, itens, parcelas_qtd, obs }) => {
        const vendaId = uuidv4();
        const dataVenda = nowIso();
        const valor_total = itens.reduce(
          (total, item) => total + item.quantidade * item.preco_unit,
          0
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
        set((state) => ({
          vendas: [...state.vendas, venda],
          movLotes: [...state.movLotes, ...movLotes],
          contasReceber: [...state.contasReceber, contaReceber],
          contasReceberParcelas: [...state.contasReceberParcelas, ...parcelas],
        }));
      },
      marcarParcelaPaga: (id) =>
        set((state) => ({
          contasPagarParcelas: state.contasPagarParcelas.map((parcela) =>
            parcela.id === id
              ? {
                  ...parcela,
                  status: "PAGA",
                  data_pagamento: nowIso(),
                  forma_pagamento: "Transferência",
                }
              : parcela
          ),
        })),
      marcarParcelaRecebida: (id) =>
        set((state) => ({
          contasReceberParcelas: state.contasReceberParcelas.map((parcela) =>
            parcela.id === id
              ? {
                  ...parcela,
                  status: "RECEBIDA",
                  data_recebimento: nowIso(),
                  forma_recebimento: "Pix",
                }
              : parcela
          ),
        })),
    }),
    {
      name: "coffee-mvp-store",
      storage: createJSONStorage(() => indexedDbStorage),
    }
  )
);
