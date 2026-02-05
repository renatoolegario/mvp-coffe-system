export const sumBy = (items, selector) =>
  items.reduce((total, item) => total + selector(item), 0);

export const getSaldoInsumo = (movimentos, insumoId) => {
  const entradas = movimentos.filter(
    (mov) => mov.insumo_id === insumoId && mov.tipo.startsWith("ENTRADA")
  );
  const saidas = movimentos.filter(
    (mov) => mov.insumo_id === insumoId && mov.tipo.startsWith("SAIDA")
  );
  return sumBy(entradas, (mov) => mov.quantidade) - sumBy(saidas, (mov) => mov.quantidade);
};

export const getSaldoTipoCafe = (movimentos, tipoCafeId) => {
  const entradas = movimentos.filter(
    (mov) => mov.tipo_cafe_id === tipoCafeId && mov.tipo.startsWith("ENTRADA")
  );
  const saidas = movimentos.filter(
    (mov) => mov.tipo_cafe_id === tipoCafeId && mov.tipo.startsWith("SAIDA")
  );
  return sumBy(entradas, (mov) => mov.quantidade) - sumBy(saidas, (mov) => mov.quantidade);
};

export const getCustoMedio = (movimentos, matcher) => {
  const entradas = movimentos.filter(
    (mov) => matcher(mov) && mov.tipo.startsWith("ENTRADA")
  );
  const totalQuantidade = sumBy(entradas, (mov) => mov.quantidade);
  if (!totalQuantidade) return 0;
  const totalCusto = sumBy(entradas, (mov) => mov.custo_total);
  return totalCusto / totalQuantidade;
};

export const getParcelas = (valorTotal, quantidade) => {
  if (!quantidade || quantidade <= 1) {
    return [{ parcela_num: 1, valor: valorTotal }];
  }
  const valorParcela = Number((valorTotal / quantidade).toFixed(2));
  const parcelas = Array.from({ length: quantidade }, (_, index) => ({
    parcela_num: index + 1,
    valor: valorParcela,
  }));
  const ajuste = valorTotal - valorParcela * quantidade;
  parcelas[parcelas.length - 1].valor = Number(
    (parcelas[parcelas.length - 1].valor + ajuste).toFixed(2)
  );
  return parcelas;
};
