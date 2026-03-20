import { requireAdmin } from "../../../../infra/auth";
import { listAuditLogs } from "../../../../services/audit-logs";

const isRelationMissing = (error) => error?.code === "42P01";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  try {
    const tipo = Array.isArray(req.query?.tipo)
      ? req.query.tipo[0]
      : req.query?.tipo;
    const status = Array.isArray(req.query?.status)
      ? req.query.status[0]
      : req.query?.status;
    const limit = Array.isArray(req.query?.limit)
      ? req.query.limit[0]
      : req.query?.limit;

    const logs = await listAuditLogs({ type: tipo, status, limit });

    return res.status(200).json({ logs });
  } catch (error) {
    if (isRelationMissing(error)) {
      return res.status(200).json({
        logs: [],
        warning:
          "Tabela auditoria_logs não encontrada. Rode: npm run migration:up",
      });
    }

    return res.status(error?.statusCode || 500).json({
      error: error.message || "Erro ao carregar logs de auditoria.",
    });
  }
}
