import { requireAuth } from "../../../../infra/auth";
import { openApiSpec } from "../../../../infra/openapi";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  return res.status(200).json(openApiSpec);
}
