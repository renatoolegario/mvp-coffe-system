import { randomUUID } from "crypto";
import { query } from "../../../../../infra/database";
import { requireAdmin } from "../../../../../infra/auth";

const VALID_STATUS = {
  PROGRAMADO: "PROGRAMADO",
  FINALIZADO: "FINALIZADO",
};

const normalizeStatus = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  return VALID_STATUS[normalized] || null;
};

const normalizeStatusFilter = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === "todos") return null;
  if (normalized === "programado") return "PROGRAMADO";
  if (normalized === "finalizado") return "FINALIZADO";
  return undefined;
};

const normalizeDateInput = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return raw;
};

const getTodayDateInput = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const mapFeedback = (row) => ({
  id: row.id,
  data: row.data,
  nome_pagina: row.nome_pagina || "",
  descricao: row.descricao,
  anexo_base64: row.anexo_base64 || "",
  status: normalizeStatus(row.status) || VALID_STATUS.PROGRAMADO,
  criado_em: row.criado_em,
  atualizado_em: row.atualizado_em,
  finalizado_em: row.finalizado_em,
});

export default async function handler(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    const statusFilter = normalizeStatusFilter(req.query?.status);
    if (statusFilter === undefined) {
      return res.status(400).json({
        error: "Filtro de status inválido. Use programado, finalizado ou todos.",
      });
    }

    try {
      const where = statusFilter ? "WHERE status = $1" : "";
      const params = statusFilter ? [statusFilter] : [];
      const result = await query(
        `
          SELECT
            id,
            data,
            nome_pagina,
            descricao,
            anexo_base64,
            status,
            criado_em,
            atualizado_em,
            finalizado_em
          FROM feedback
          ${where}
          ORDER BY data DESC, criado_em DESC
        `,
        params,
      );

      return res.status(200).json({
        admin: String(req.query?.admin || "") === "1",
        feedbacks: result.rows.map(mapFeedback),
      });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao carregar feedbacks." });
    }
  }

  if (req.method === "POST") {
    const descricao = String(req.body?.descricao || "").trim();
    const nomePagina = String(req.body?.nome_pagina || "").trim();
    const anexoBase64 = String(req.body?.anexo_base64 || "").trim();

    if (!descricao) {
      return res.status(400).json({ error: "Descrição é obrigatória." });
    }

    const dataInputRaw = req.body?.data;
    const dataInput = normalizeDateInput(dataInputRaw);
    if (String(dataInputRaw || "").trim() && !dataInput) {
      return res.status(400).json({ error: "Data inválida. Use YYYY-MM-DD." });
    }

    const id = randomUUID();

    try {
      const result = await query(
        `
          INSERT INTO feedback (
            id,
            data,
            nome_pagina,
            descricao,
            anexo_base64,
            status,
            criado_em,
            atualizado_em
          )
          VALUES ($1, $2, $3, $4, $5, 'PROGRAMADO', now(), now())
          RETURNING
            id,
            data,
            nome_pagina,
            descricao,
            anexo_base64,
            status,
            criado_em,
            atualizado_em,
            finalizado_em
        `,
        [
          id,
          dataInput || getTodayDateInput(),
          nomePagina || null,
          descricao,
          anexoBase64 || null,
        ],
      );

      return res.status(201).json({ feedback: mapFeedback(result.rows[0]) });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao salvar feedback." });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}
