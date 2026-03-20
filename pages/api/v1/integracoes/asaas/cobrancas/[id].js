import { requireAuth } from "../../../../../../infra/auth";
import {
  deleteAsaasCharge,
  getAsaasChargeByIdentifier,
} from "../../../../../../services/asaas";

export default async function handler(req, res) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const identifier = String(req.query?.id || "").trim();
  if (!identifier) {
    return res.status(400).json({ error: "Informe a cobrança ASAAS." });
  }

  try {
    if (req.method === "GET") {
      const charge = await getAsaasChargeByIdentifier(identifier);
      return res.status(200).json({ charge });
    }

    if (req.method === "DELETE") {
      const charge = await deleteAsaasCharge(identifier);
      return res.status(200).json({ charge });
    }

    res.setHeader("Allow", ["GET", "DELETE"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({
      error: error.message || "Erro ao consultar cobrança do ASAAS.",
    });
  }
}
