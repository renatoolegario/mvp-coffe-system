import { query, withTransaction } from "../../../../infra/database";

const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeFaixa = (item) => ({
  chave: String(item.chave || "")
    .trim()
    .toUpperCase(),
  label: String(item.label || "").trim(),
  percentual_min: parseNumber(item.percentual_min),
  percentual_max:
    item.percentual_max === null || item.percentual_max === ""
      ? null
      : parseNumber(item.percentual_max),
  ordem: Number(item.ordem) || 0,
});

const validateFaixas = (faixas) => {
  if (!Array.isArray(faixas) || !faixas.length) {
    return "Informe ao menos uma faixa.";
  }

  const ordered = [...faixas].sort(
    (a, b) => a.percentual_min - b.percentual_min,
  );

  for (let index = 0; index < ordered.length; index += 1) {
    const faixa = ordered[index];
    if (!faixa.chave || !faixa.label) {
      return "Cada faixa precisa de chave e label.";
    }
    if (faixa.percentual_min === null || faixa.percentual_min < 0) {
      return `A faixa ${faixa.label} possui percentual mínimo inválido.`;
    }
    if (
      faixa.percentual_max !== null &&
      faixa.percentual_max <= faixa.percentual_min
    ) {
      return `A faixa ${faixa.label} possui percentual máximo inválido.`;
    }

    const proxima = ordered[index + 1];
    if (
      proxima &&
      faixa.percentual_max !== null &&
      proxima.percentual_min < faixa.percentual_max
    ) {
      return "As faixas não podem se sobrepor.";
    }
  }

  return null;
};

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const result = await query(
        "SELECT chave, label, percentual_min, percentual_max, ordem FROM empresa_configuracao_estoque ORDER BY ordem ASC, percentual_min ASC",
      );
      return res.status(200).json({ faixas: result.rows });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao carregar configuração de estoque." });
    }
  }

  if (req.method === "POST") {
    const faixa = normalizeFaixa(req.body || {});
    if (!faixa.chave || !faixa.label || faixa.percentual_min === null) {
      return res
        .status(400)
        .json({ error: "Dados inválidos para cadastro da faixa." });
    }

    try {
      await query(
        "INSERT INTO empresa_configuracao_estoque (chave, label, percentual_min, percentual_max, ordem, atualizado_em) VALUES ($1, $2, $3, $4, $5, now())",
        [
          faixa.chave,
          faixa.label,
          faixa.percentual_min,
          faixa.percentual_max,
          faixa.ordem,
        ],
      );
      return res.status(201).json({ faixa });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao cadastrar faixa." });
    }
  }

  if (req.method === "PUT") {
    const faixas = (req.body?.faixas || []).map(normalizeFaixa);
    const validationError = validateFaixas(faixas);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    try {
      await withTransaction(async (client) => {
        for (const faixa of faixas) {
          await client.query(
            "UPDATE empresa_configuracao_estoque SET label = $2, percentual_min = $3, percentual_max = $4, ordem = $5, atualizado_em = now() WHERE chave = $1",
            [
              faixa.chave,
              faixa.label,
              faixa.percentual_min,
              faixa.percentual_max,
              faixa.ordem,
            ],
          );
        }
      });
      return res.status(200).json({ faixas });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao atualizar as faixas." });
    }
  }

  if (req.method === "DELETE") {
    const chave = String(req.body?.chave || "")
      .trim()
      .toUpperCase();
    if (!chave) {
      return res.status(400).json({ error: "Informe a chave da faixa." });
    }

    try {
      await query("DELETE FROM empresa_configuracao_estoque WHERE chave = $1", [
        chave,
      ]);
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao remover faixa." });
    }
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  return res.status(405).json({ error: "Method not allowed" });
}
