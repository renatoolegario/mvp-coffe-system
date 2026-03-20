import {
  getAsaasWebhookRuntime,
  processAsaasWebhookEvent,
} from "../../../../../services/asaas";
import { safeRegisterAuditLog } from "../../../../../services/audit-logs";

const parseBody = (body) => {
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch (error) {
      return {};
    }
  }
  return body && typeof body === "object" ? body : {};
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = parseBody(req.body);

  try {
    const runtime = await getAsaasWebhookRuntime();
    const receivedToken = String(
      req.headers["asaas-access-token"] || "",
    ).trim();

    if (!receivedToken || receivedToken !== runtime.authToken) {
      await safeRegisterAuditLog({
        type: "webhook",
        key: "asaas",
        description: "Webhook ASAAS recebido",
        endpoint: "/api/v1/integracoes/asaas/webhook",
        method: "POST",
        origin: "asaas",
        status: "NAO_AUTORIZADO",
        httpStatus: 401,
        event: payload?.event || "",
        reference: payload?.payment?.id || "",
        requestHeaders: req.headers,
        requestPayload: payload,
        responsePayload: {},
        metadata: {
          remote_address: req.socket?.remoteAddress || null,
          user_agent: String(req.headers["user-agent"] || "").trim() || null,
        },
        error: "Webhook ASAAS não autorizado.",
      });
      return res.status(401).json({ error: "Webhook ASAAS não autorizado." });
    }

    const event = await processAsaasWebhookEvent(payload);
    const responsePayload = {
      received: true,
      updated: Boolean(event),
      charge_id: event?.id || null,
      charge_status: event?.status || null,
      conta_receber_parcela_id: event?.conta_receber_parcela_id || null,
      last_event: event?.last_event || payload?.event || null,
    };

    await safeRegisterAuditLog({
      type: "webhook",
      key: "asaas",
      description: "Webhook ASAAS recebido",
      endpoint: "/api/v1/integracoes/asaas/webhook",
      method: "POST",
      origin: "asaas",
      status: "SUCESSO",
      httpStatus: 200,
      event: payload?.event || "",
      reference: payload?.payment?.id || event?.id || "",
      requestHeaders: req.headers,
      requestPayload: payload,
      responsePayload,
      metadata: {
        remote_address: req.socket?.remoteAddress || null,
        user_agent: String(req.headers["user-agent"] || "").trim() || null,
      },
    });

    return res.status(200).json(responsePayload);
  } catch (error) {
    await safeRegisterAuditLog({
      type: "webhook",
      key: "asaas",
      description: "Webhook ASAAS recebido",
      endpoint: "/api/v1/integracoes/asaas/webhook",
      method: "POST",
      origin: "asaas",
      status: "ERRO",
      httpStatus: error?.statusCode || 500,
      event: payload?.event || "",
      reference: payload?.payment?.id || "",
      requestHeaders: req.headers,
      requestPayload: payload,
      responsePayload: {},
      metadata: {
        remote_address: req.socket?.remoteAddress || null,
        user_agent: String(req.headers["user-agent"] || "").trim() || null,
      },
      error: error.message || "Erro ao processar webhook do ASAAS.",
    });
    return res.status(error?.statusCode || 500).json({
      error: error.message || "Erro ao processar webhook do ASAAS.",
    });
  }
}
