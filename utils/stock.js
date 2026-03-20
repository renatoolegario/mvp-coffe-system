export const sumBy = (items, selector) =>
  items.reduce((total, item) => total + selector(item), 0);

export const normalizeStockNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getSaldoInsumo = (movimentos, insumoId) => {
  const entradas = movimentos.filter(
    (mov) => mov.insumo_id === insumoId && mov.tipo.startsWith("ENTRADA"),
  );
  const saidas = movimentos.filter(
    (mov) => mov.insumo_id === insumoId && mov.tipo.startsWith("SAIDA"),
  );
  return (
    sumBy(entradas, (mov) => mov.quantidade) -
    sumBy(saidas, (mov) => mov.quantidade)
  );
};

export const getSaldoTipoCafe = (movimentos, tipoCafeId) => {
  const entradas = movimentos.filter(
    (mov) => mov.tipo_cafe_id === tipoCafeId && mov.tipo.startsWith("ENTRADA"),
  );
  const saidas = movimentos.filter(
    (mov) => mov.tipo_cafe_id === tipoCafeId && mov.tipo.startsWith("SAIDA"),
  );
  return (
    sumBy(entradas, (mov) => mov.quantidade) -
    sumBy(saidas, (mov) => mov.quantidade)
  );
};

export const getCustoMedio = (movimentos, matcher) => {
  const entradas = movimentos.filter(
    (mov) => matcher(mov) && mov.tipo.startsWith("ENTRADA"),
  );
  const totalQuantidade = sumBy(entradas, (mov) => mov.quantidade);
  if (!totalQuantidade) return 0;
  const totalCusto = sumBy(entradas, (mov) => mov.custo_total);
  return totalCusto / totalQuantidade;
};

export const getCustoConsumoFifo = (
  movimentos,
  insumoId,
  quantidadeConsumo,
) => {
  const quantidadeNecessaria = Number(quantidadeConsumo) || 0;
  if (!insumoId || quantidadeNecessaria <= 0) {
    return {
      custoTotal: 0,
      custoUnitario: 0,
      quantidadeAtendida: 0,
      quantidadePendente: 0,
    };
  }

  const movimentosInsumo = movimentos
    .filter((mov) => mov.insumo_id === insumoId)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.data || 0).getTime() - new Date(b.data || 0).getTime(),
    );

  const lotes = [];

  for (const movimento of movimentosInsumo) {
    const quantidade = Number(movimento.quantidade) || 0;
    if (quantidade <= 0) continue;

    if (movimento.tipo?.startsWith("ENTRADA")) {
      const custoUnitario = Number(movimento.custo_unit) || 0;
      lotes.push({ quantidadeRestante: quantidade, custoUnitario });
      continue;
    }

    if (movimento.tipo?.startsWith("SAIDA")) {
      let saldoSaida = quantidade;

      while (saldoSaida > 0 && lotes.length) {
        const loteAtual = lotes[0];
        const consumo = Math.min(loteAtual.quantidadeRestante, saldoSaida);
        loteAtual.quantidadeRestante -= consumo;
        saldoSaida -= consumo;

        if (loteAtual.quantidadeRestante <= 0) {
          lotes.shift();
        }
      }
    }
  }

  let quantidadePendente = quantidadeNecessaria;
  let custoTotal = 0;

  for (const lote of lotes) {
    if (quantidadePendente <= 0) break;
    if (lote.quantidadeRestante <= 0) continue;

    const quantidadeConsumida = Math.min(
      lote.quantidadeRestante,
      quantidadePendente,
    );
    custoTotal += quantidadeConsumida * lote.custoUnitario;
    quantidadePendente -= quantidadeConsumida;
  }

  const quantidadeAtendida = quantidadeNecessaria - quantidadePendente;
  const custoUnitario =
    quantidadeAtendida > 0 ? custoTotal / quantidadeAtendida : 0;

  return {
    custoTotal,
    custoUnitario,
    quantidadeAtendida,
    quantidadePendente,
  };
};

export const getSaldoMovimentosKg = (movimentos = [], insumoId) =>
  (movimentos || [])
    .filter((movimento) => String(movimento.insumo_id) === String(insumoId))
    .reduce(
      (total, movimento) => total + normalizeStockNumber(movimento.quantidade),
      0,
    );

export const getEstoqueMinimoKg = (insumo = {}) => {
  const estoqueMinimo = normalizeStockNumber(insumo.estoque_minimo);
  const kgPorSaco = normalizeStockNumber(insumo.kg_por_saco) || 1;
  const unidadeEstoque = String(
    insumo.estoque_minimo_unidade_codigo || insumo.unidade_codigo || "KG",
  )
    .trim()
    .toUpperCase();

  return unidadeEstoque === "SACO" ? estoqueMinimo * kgPorSaco : estoqueMinimo;
};

export const getFaixaStatusEstoque = (percentual, faixas = []) => {
  const valor = normalizeStockNumber(percentual);
  const ordered = [...faixas].sort((a, b) => {
    const byOrder =
      normalizeStockNumber(a?.ordem) - normalizeStockNumber(b?.ordem);
    if (byOrder !== 0) return byOrder;
    return (
      normalizeStockNumber(a?.percentual_min) -
      normalizeStockNumber(b?.percentual_min)
    );
  });

  return (
    ordered.find((faixa) => {
      const minimo = normalizeStockNumber(faixa?.percentual_min);
      const maximo =
        faixa?.percentual_max === null || faixa?.percentual_max === ""
          ? null
          : normalizeStockNumber(faixa?.percentual_max);

      if (valor < minimo) return false;
      if (maximo === null) return true;
      return valor < maximo;
    }) || null
  );
};

export const buildInsumoEstoqueStatus = ({
  insumo = {},
  saldoKg = 0,
  faixas = [],
} = {}) => {
  const saldoNormalizado = normalizeStockNumber(saldoKg);
  const estoqueMinimoKg = getEstoqueMinimoKg(insumo);
  const percentualEstoque = estoqueMinimoKg
    ? (saldoNormalizado / estoqueMinimoKg) * 100
    : 0;
  const faixaStatus = getFaixaStatusEstoque(percentualEstoque, faixas);

  return {
    saldo_kg: saldoNormalizado,
    estoque_minimo_kg: estoqueMinimoKg,
    percentual_estoque: percentualEstoque,
    status_estoque: faixaStatus?.chave || null,
    status_label: faixaStatus?.label || "Sem faixa",
  };
};

export const getStockStatusColor = (status) => {
  switch (
    String(status || "")
      .trim()
      .toUpperCase()
  ) {
    case "CRITICO":
      return "error";
    case "NORMAL":
      return "success";
    case "ELEVADO":
      return "warning";
    case "EXCESSO":
      return "info";
    default:
      return "default";
  }
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
    (parcelas[parcelas.length - 1].valor + ajuste).toFixed(2),
  );
  return parcelas;
};
