import { query } from "../../../../infra/database";
import { requireAuth } from "../../../../infra/auth";
import {
  buildInsumoEstoqueStatus,
  normalizeStockNumber,
} from "../../../../utils/stock";

const getResumoInsumo = (insumoId, movimentos = []) => {
  const orderedMovimentos = [...movimentos].sort(
    (a, b) =>
      new Date(a.data_movimentacao).getTime() -
      new Date(b.data_movimentacao).getTime(),
  );

  let saldoDisponivel = 0;
  let saldoTransito = 0;
  let custoMedio = 0;

  orderedMovimentos.forEach((movimento) => {
    const quantidadeEntrada = normalizeStockNumber(
      movimento.quantidade_entrada,
    );
    const quantidadeSaida = normalizeStockNumber(movimento.quantidade_saida);
    const custoUnitario = normalizeStockNumber(movimento.custo_unitario);
    const isTransitoAberto =
      movimento.tipo_movimento === "RESERVA_PRODUCAO" &&
      movimento.status_producao === "PENDENTE";

    if (quantidadeEntrada > 0) {
      const novoSaldo = saldoDisponivel + quantidadeEntrada;
      custoMedio = novoSaldo
        ? (saldoDisponivel * custoMedio + quantidadeEntrada * custoUnitario) /
          novoSaldo
        : 0;
      saldoDisponivel = novoSaldo;
    }

    if (quantidadeSaida > 0) {
      saldoDisponivel -= quantidadeSaida;
      if (isTransitoAberto) {
        saldoTransito += quantidadeSaida;
      }
    }
  });

  return {
    insumo_id: insumoId,
    saldo_kg: saldoDisponivel,
    saldo_transito_kg: saldoTransito,
    custo_medio: custoMedio,
    valor_estoque: (saldoDisponivel + saldoTransito) * custoMedio,
  };
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const [insumosResult, movimentosResult, faixasResult] = await Promise.all([
      query(
        `
        SELECT
          i.id,
          i.nome,
          i.kg_por_saco,
          i.estoque_minimo,
          i.unidade_id,
          i.estoque_minimo_unidade_id,
          u.codigo AS unidade_codigo,
          u.label AS unidade_label,
          eu.codigo AS estoque_minimo_unidade_codigo,
          eu.label AS estoque_minimo_unidade_label
        FROM insumos i
        LEFT JOIN aux_unidade u ON u.id = i.unidade_id
        LEFT JOIN aux_unidade eu ON eu.id = i.estoque_minimo_unidade_id
        ORDER BY i.nome ASC
        `,
      ),
      query(
        `SELECT m.insumo_id, m.quantidade_entrada, m.quantidade_saida, m.custo_unitario, m.data_movimentacao, m.tipo_movimento, p.status as status_producao
         FROM movimento_producao m
         LEFT JOIN producao p ON m.producao_id = p.id
         ORDER BY m.data_movimentacao ASC`,
      ),
      query(
        "SELECT chave, label, percentual_min, percentual_max, ordem FROM empresa_configuracao_estoque ORDER BY ordem ASC",
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
      const kgPorSaco = normalizeStockNumber(insumo.kg_por_saco) || 1;
      const custoMedioKg = normalizeStockNumber(resumo.custo_medio);
      const custoMedioSaco = custoMedioKg * kgPorSaco;
      const saldoSacos = resumo.saldo_kg / kgPorSaco;
      const saldoTransitoSacos = resumo.saldo_transito_kg / kgPorSaco;
      const estoqueStatus = buildInsumoEstoqueStatus({
        insumo,
        saldoKg: resumo.saldo_kg,
        faixas: faixasResult.rows,
      });

      return {
        ...insumo,
        ...resumo,
        saldo_sacos: saldoSacos,
        saldo_transito_sacos: saldoTransitoSacos,
        custo_medio_kg: custoMedioKg,
        custo_medio_saco: custoMedioSaco,
        ...estoqueStatus,
      };
    });

    return res.status(200).json({ insumos: dashboard });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Erro ao consultar dados do dashboard de insumos." });
  }
}
