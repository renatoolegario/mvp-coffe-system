import {
  getAsaasWebhookRuntime,
  processAsaasWebhookEvent,
} from "../../../../../services/asaas";

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

  try {
    const runtime = await getAsaasWebhookRuntime();
    const receivedToken = String(req.headers["asaas-access-token"] || "").trim();

    if (!receivedToken || receivedToken !== runtime.authToken) {
      return res.status(401).json({ error: "Webhook ASAAS não autorizado." });
    }

    const payload = parseBody(req.body);
    const event = await processAsaasWebhookEvent(payload);

    return res.status(200).json({
      received: true,
      updated: Boolean(event),
    });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({
      error: error.message || "Erro ao processar webhook do ASAAS.",
    });
  }
}
