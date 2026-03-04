import { toLocalDateTime } from "./datetime";

const safeArray = (value) => (Array.isArray(value) ? value : []);

const mapUsuariosFromSeed = (usuarios) =>
  safeArray(usuarios).map((usuario) => {
    const { senha_hash, ...rest } = usuario;
    return {
      ...rest,
      senha: usuario.senha ?? senha_hash ?? "",
    };
  });

export const normalizeSeedData = (seed) => ({
  usuarios: mapUsuariosFromSeed(seed?.usuarios),
  clientes: safeArray(seed?.clientes),
  fornecedores: safeArray(seed?.fornecedores),
  insumos: safeArray(seed?.insumos),
  vendas: safeArray(seed?.vendas),
  vendaItens: safeArray(seed?.venda_itens),
  contasPagar: safeArray(seed?.contas_pagar),
  contasPagarParcelas: safeArray(seed?.contas_pagar_parcelas),
  contasReceber: safeArray(seed?.contas_receber),
  contasReceberParcelas: safeArray(seed?.contas_receber_parcelas),
});

const mapUsuariosToSeed = (usuarios) =>
  safeArray(usuarios).map((usuario) => {
    const { senha, ...rest } = usuario;
    return {
      ...rest,
      senha_hash: senha ?? "",
    };
  });

export const serializeSeedData = (state) => ({
  meta: {
    seed_version: "2.0.0",
    generated_at: toLocalDateTime(),
    currency: "BRL",
    timezone: "America/Sao_Paulo",
  },
  usuarios: mapUsuariosToSeed(state?.usuarios),
  clientes: safeArray(state?.clientes),
  fornecedores: safeArray(state?.fornecedores),
  insumos: safeArray(state?.insumos),
  vendas: safeArray(state?.vendas),
  venda_itens: safeArray(state?.vendaItens),
  contas_pagar: safeArray(state?.contasPagar),
  contas_pagar_parcelas: safeArray(state?.contasPagarParcelas),
  contas_receber: safeArray(state?.contasReceber),
  contas_receber_parcelas: safeArray(state?.contasReceberParcelas),
  producao: safeArray(state?.producoes),
  detalhes_producao: safeArray(state?.detalhesProducao),
  custos_adicionais_producao: safeArray(state?.custosAdicionaisProducao),
  movimento_producao: safeArray(state?.movimentoProducao),
  venda_detalhes: safeArray(state?.vendaDetalhes),
});
