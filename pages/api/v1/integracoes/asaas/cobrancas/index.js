import { requireAuth } from "../../../../../../infra/auth";
import { createAsaasCharge } from "../../../../../../services/asaas";

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
  const charges = Array.isArray(body.cobrancas) && body.cobrancas.length
    ? body.cobrancas
    : [body];

  const results = [];
  const errors = [];

  for (let index = 0; index < charges.length; index += 1) {
    try {
      const result = await createAsaasCharge(charges[index]);
      results.push(result);
    } catch (error) {
      errors.push({
        index,
        error: error.message || "Erro ao criar cobrança no ASAAS.",
      });
    }
  }

  if (!results.length && errors.length) {
    return res.status(400).json({
      error: errors[0].error,
      errors,
    });
  }

  return res.status(errors.length ? 207 : 201).json({
    ok: errors.length === 0,
    charges: results,
    errors,
  });
}
