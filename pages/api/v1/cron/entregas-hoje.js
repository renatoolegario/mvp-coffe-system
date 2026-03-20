import { requireAdmin } from "../../../../infra/auth";
import { safeRegisterAuditLog } from "../../../../services/audit-logs";
import { runDeliveriesReminderJob } from "../../../../services/reminders";

const isVercelCronRequest = (req) =>
  String(req.headers["user-agent"] || "").includes("vercel-cron/1.0");

const buildAuditMetadata = (req, auth) => ({
  executor_id: auth?.usuario?.id || null,
  executor_email: auth?.usuario?.email || null,
  query: req.query || {},
  remote_address: req.socket?.remoteAddress || null,
  user_agent: String(req.headers["user-agent"] || "").trim() || null,
});

const resolveAuditStatus = (result) => {
  if (result?.skipped) return "IGNORADO";
  if (result?.ok === false) return "PARCIAL";
  return "SUCESSO";
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const origin = isVercelCronRequest(req) ? "vercel-cron" : "painel-admin";
  let auth = null;

  if (!isVercelCronRequest(req)) {
    auth = await requireAdmin(req, res);
    if (!auth) {
      await safeRegisterAuditLog({
        type: "cron",
        key: "entregas-hoje",
        description: "Cron de entregas do dia",
        endpoint: "/api/v1/cron/entregas-hoje",
        method: "GET",
        origin,
        status: "NAO_AUTORIZADO",
        httpStatus: res.statusCode || 401,
        event: "entregas_hoje",
        reference: "entregas_hoje",
        requestHeaders: req.headers,
        requestPayload: { query: req.query || {} },
        responsePayload: {},
        metadata: buildAuditMetadata(req, req.auth),
        error: "Acesso negado para executar o cron manualmente.",
      });
      return;
    }
  }

  try {
    const result = await runDeliveriesReminderJob();
    await safeRegisterAuditLog({
      type: "cron",
      key: "entregas-hoje",
      description: "Cron de entregas do dia",
      endpoint: "/api/v1/cron/entregas-hoje",
      method: "GET",
      origin,
      status: resolveAuditStatus(result),
      httpStatus: 200,
      event: result?.categoria || "entregas_hoje",
      reference: result?.categoria || "entregas_hoje",
      requestHeaders: req.headers,
      requestPayload: { query: req.query || {} },
      responsePayload: result,
      metadata: buildAuditMetadata(req, auth),
      error:
        result?.ok === false && !result?.skipped
          ? "Execução com falhas parciais."
          : "",
    });
    return res.status(200).json(result);
  } catch (error) {
    await safeRegisterAuditLog({
      type: "cron",
      key: "entregas-hoje",
      description: "Cron de entregas do dia",
      endpoint: "/api/v1/cron/entregas-hoje",
      method: "GET",
      origin,
      status: "ERRO",
      httpStatus: error?.statusCode || 500,
      event: "entregas_hoje",
      reference: "entregas_hoje",
      requestHeaders: req.headers,
      requestPayload: { query: req.query || {} },
      responsePayload: {},
      metadata: buildAuditMetadata(req, auth),
      error: error.message || "Erro ao executar cron de entregas.",
    });
    return res.status(error?.statusCode || 500).json({
      error: error.message || "Erro ao executar cron de entregas.",
    });
  }
}
