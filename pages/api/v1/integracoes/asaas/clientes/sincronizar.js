import { requireAuth } from "../../../../../../infra/auth";
import { ensureClienteAsaasCustomer } from "../../../../../../services/asaas";

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

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const body = parseBody(req.body);
  const clienteId = String(body.cliente_id || "").trim();

  if (!clienteId) {
    return res.status(400).json({ error: "Informe o cliente para sincronizar." });
  }

  try {
    const result = await ensureClienteAsaasCustomer(clienteId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error?.statusCode || 500).json({
      error: error.message || "Erro ao sincronizar cliente com o ASAAS.",
    });
  }
}
