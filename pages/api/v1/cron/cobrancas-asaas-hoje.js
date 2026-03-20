import { requireAdmin } from "../../../../infra/auth";
import { runAsaasChargesReminderJob } from "../../../../services/reminders";

const isVercelCronRequest = (req) =>
  String(req.headers["user-agent"] || "").includes("vercel-cron/1.0");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isVercelCronRequest(req)) {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
  }

  try {
    const result = await runAsaasChargesReminderJob();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error?.statusCode || 500).json({
      error: error.message || "Erro ao executar cron de cobranças ASAAS.",
    });
  }
}
