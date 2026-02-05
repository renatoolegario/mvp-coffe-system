import { query } from "../../../../infra/database";

const normalizeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getResumoInsumo = (insumoId, movimentos = []) => {
  const orderedMovimentos = [...movimentos].sort(
    (a, b) =>
      new Date(a.data_movimentacao).getTime() -
      new Date(b.data_movimentacao).getTime(),
  );

  let saldo = 0;
  let custoMedio = 0;

  orderedMovimentos.forEach((movimento) => {
    const quantidadeEntrada = normalizeNumber(movimento.quantidade_entrada);
    const quantidadeSaida = normalizeNumber(movimento.quantidade_saida);
    const custoUnitario = normalizeNumber(movimento.custo_unitario);

    if (quantidadeEntrada > 0) {
      const novoSaldo = saldo + quantidadeEntrada;
      custoMedio = novoSaldo
        ? (saldo * custoMedio + quantidadeEntrada * custoUnitario) / novoSaldo
        : 0;
      saldo = novoSaldo;
    }

    if (quantidadeSaida > 0) {
      saldo -= quantidadeSaida;
    }
  });

  return {
    insumo_id: insumoId,
    saldo_kg: saldo,
    custo_medio: custoMedio,
    valor_estoque: saldo * custoMedio,
  };
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const [insumosResult, movimentosResult] = await Promise.all([
      query(
        "SELECT id, nome, unidade, kg_por_saco, preco_kg, tipo FROM insumos ORDER BY nome ASC",
      ),
      query(
        "SELECT insumo_id, quantidade_entrada, quantidade_saida, custo_unitario, data_movimentacao FROM movimento_producao ORDER BY data_movimentacao ASC",
      ),
    ]);

    const movimentosPorInsumo = movimentosResult.rows.reduce(
      (acc, movimento) => {
        const insumoId = movimento.insumo_id;
        if (!acc[insumoId]) {
          acc[insumoId] = [];
        }
        acc[insumoId].push(movimento);
        return acc;
      },
      {},
    );

    const dashboard = insumosResult.rows.map((insumo) => {
      const resumo = getResumoInsumo(insumo.id, movimentosPorInsumo[insumo.id]);
      const kgPorSaco = normalizeNumber(insumo.kg_por_saco) || 1;
      return {
        ...insumo,
        ...resumo,
        saldo_sacos: resumo.saldo_kg / kgPorSaco,
      };
    });

    return res.status(200).json({ insumos: dashboard });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Erro ao consultar dados do dashboard de insumos." });
  }
}
