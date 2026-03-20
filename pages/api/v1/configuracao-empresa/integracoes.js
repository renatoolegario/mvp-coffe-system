import { requireAdmin } from "../../../../infra/auth";
import {
  getIntegration,
  listIntegrations,
  normalizeIntegrationEmailList,
  saveIntegration,
} from "../../../../services/integrations";
import {
  ensureAsaasWebhookRegistration,
  removeAsaasWebhookRegistration,
} from "../../../../services/asaas";
import { resolveRequestOrigin } from "../../../../utils/request";

const INTEGRACOES = ["asaas", "resend"];

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default async function handler(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    try {
      const integracoes = await listIntegrations();
      return res.status(200).json({ integracoes });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao carregar integrações." });
    }
  }

  if (req.method === "PUT") {
    const payload =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};
    const provedor = String(payload?.provedor || "")
      .trim()
      .toLowerCase();
    const chave = String(payload?.chave || "").trim();

    if (!INTEGRACOES.includes(provedor)) {
      return res.status(400).json({ error: "Provedor inválido." });
    }

    try {
      const current = await getIntegration(provedor);
      const baseConfig = payload?.config || {};
      const requestOrigin =
        provedor === "asaas" ? resolveRequestOrigin(req) : "";
      const desiredWebhookUrl =
        provedor === "asaas" && requestOrigin
          ? `${requestOrigin}/api/v1/integracoes/asaas/webhook`
          : "";
      const config =
        provedor === "asaas"
          ? {
              environment: "production",
              auto_charge_on_credit_sale: Boolean(
                baseConfig.auto_charge_on_credit_sale ??
                  current.config.auto_charge_on_credit_sale,
              ),
              webhook_url:
                desiredWebhookUrl ||
                String(baseConfig.webhook_url || current.config.webhook_url || "").trim(),
              webhook_id: "",
              webhook_registered_at: "",
              webhook_error: "",
              webhook_cleanup_error: "",
            }
          : baseConfig;

      if (!chave && !current.key) {
        return res.status(400).json({ error: "Informe a chave da integração." });
      }

      if (provedor === "resend") {
        const fromEmail = String(config.from_email || "").trim().toLowerCase();
        const recipients = normalizeIntegrationEmailList(
          config.notification_recipients,
        );

        if (!fromEmail || !isValidEmail(fromEmail)) {
          return res.status(400).json({
            error: "Informe um remetente válido para a integração Resend.",
          });
        }

        if (!recipients.length) {
          return res.status(400).json({
            error:
              "Informe ao menos um destinatário para os lembretes do Resend.",
          });
        }
      }

      let webhookCleanupError = "";

      if (provedor === "asaas") {
        const keyChanged = Boolean(chave) && chave !== current.key;
        const webhookUrlChanged =
          Boolean(config.webhook_url) &&
          config.webhook_url !== current.config.webhook_url;

        if (current.configured && current.key && (keyChanged || webhookUrlChanged)) {
          try {
            await removeAsaasWebhookRegistration({
              apiKey: current.key,
              environment: current.config.environment || "production",
              webhookId: current.config.webhook_id,
              webhookUrl:
                current.config.webhook_url ||
                config.webhook_url,
            });
          } catch (error) {
            webhookCleanupError =
              error.message ||
              "Não foi possível remover o webhook anterior do ASAAS.";
          }
        }
      }

      const saved = await saveIntegration({
        provider: provedor,
        key: chave,
        config:
          provedor === "asaas"
            ? {
                ...config,
                webhook_cleanup_error: webhookCleanupError,
              }
            : config,
      });

      let finalConfig = saved.config;
      let webhook = null;

      if (provedor === "asaas") {
        const webhookUrl =
          String(saved.config.webhook_url || "").trim() || desiredWebhookUrl;

        if (webhookUrl) {
          try {
            webhook = await ensureAsaasWebhookRegistration({
              webhookUrl,
              fallbackEmail: auth.usuario?.email || "",
            });

            finalConfig = (
              await saveIntegration({
                provider: "asaas",
                key: "",
                config: {
                  ...saved.config,
                  ...webhook,
                  webhook_cleanup_error: webhookCleanupError,
                },
              })
            ).config;
          } catch (error) {
            finalConfig = (
              await saveIntegration({
                provider: "asaas",
                key: "",
                config: {
                  ...saved.config,
                  webhook_url: webhookUrl,
                  webhook_error:
                    error.message ||
                    "Não foi possível registrar o webhook do ASAAS.",
                  webhook_cleanup_error: webhookCleanupError,
                },
              })
            ).config;
            webhook = {
              error:
                error.message ||
                "Não foi possível registrar o webhook do ASAAS.",
            };
          }
        }
      }

      return res.status(200).json({
        provedor,
        configurado: true,
        config: finalConfig,
        webhook,
      });
    } catch (error) {
      return res.status(error?.statusCode || 500).json({
        error: error.message || "Erro ao salvar integração.",
      });
    }
  }

  res.setHeader("Allow", ["GET", "PUT"]);
  return res.status(405).json({ error: "Method not allowed" });
}
