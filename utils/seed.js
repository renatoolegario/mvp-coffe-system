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
  tiposCafe: safeArray(seed?.tipos_cafe),
  lotes: safeArray(seed?.lotes),
  movInsumos: safeArray(seed?.mov_insumos),
  movLotes: safeArray(seed?.mov_lotes),
  entradasInsumos: safeArray(seed?.entrada_insumos),
  ordensProducao: safeArray(seed?.ordem_producao),
  vendas: safeArray(seed?.vendas),
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
    seed_version: "1.2.0",
    generated_at: new Date().toISOString(),
    currency: "BRL",
    timezone: "America/Sao_Paulo",
  },
  usuarios: mapUsuariosToSeed(state?.usuarios),
  sessao: [],
  tipos_cafe: safeArray(state?.tiposCafe),
  lotes: safeArray(state?.lotes),
  clientes: safeArray(state?.clientes),
  fornecedores: safeArray(state?.fornecedores),
  insumos: safeArray(state?.insumos),
  entrada_insumos: safeArray(state?.entradasInsumos),
  entrada_insumos_itens: [],
  ordem_producao: safeArray(state?.ordensProducao),
  ordem_producao_itens: [],
  vendas: safeArray(state?.vendas),
  vendas_itens: [],
  contas_pagar: safeArray(state?.contasPagar),
  contas_pagar_parcelas: safeArray(state?.contasPagarParcelas),
  contas_receber: safeArray(state?.contasReceber),
  contas_receber_parcelas: safeArray(state?.contasReceberParcelas),
  mov_insumos: safeArray(state?.movInsumos),
  mov_lotes: safeArray(state?.movLotes),
});
