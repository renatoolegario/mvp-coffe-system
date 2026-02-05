import { query } from "../../../../infra/database";

const normalizeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getResumoInsumo = (insumoId, movimentos = []) => {
  const orderedMovimentos = [...movimentos].sort(
    (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
  );

  let saldo = 0;
  let custoMedio = 0;

  orderedMovimentos.forEach((movimento) => {
    const quantidade = normalizeNumber(movimento.quantidade);
    const custoTotal = normalizeNumber(movimento.custo_total);

    if (quantidade > 0) {
      const custoUnitMovimento = quantidade ? custoTotal / quantidade : 0;
      const novoSaldo = saldo + quantidade;
      custoMedio = novoSaldo
        ? (saldo * custoMedio + quantidade * custoUnitMovimento) / novoSaldo
        : 0;
      saldo = novoSaldo;
      return;
    }

    if (quantidade < 0) {
      saldo += quantidade;
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
        "SELECT id, nome, unidade, kg_por_saco FROM insumos ORDER BY nome ASC",
      ),
      query(
        "SELECT insumo_id, quantidade, custo_total, data FROM mov_insumos ORDER BY data ASC",
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
        saldo_sacos:
          insumo.unidade === "saco" ? resumo.saldo_kg / kgPorSaco : null,
      };
    });

    return res.status(200).json({ insumos: dashboard });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Erro ao consultar dados do dashboard de insumos." });
  }
}
