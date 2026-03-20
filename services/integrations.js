import { query } from "../infra/database";
import { conversaoCripto, conversaoDescripto } from "../utils/crypto";

const PROVIDERS = ["asaas", "resend"];

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const normalizeText = (value) => String(value || "").trim();
const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;

  const normalized = normalizeText(value).toLowerCase();
  return ["1", "true", "sim", "yes", "on"].includes(normalized);
};

const toEmailList = (value) => {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/[\n,;]+/)
        .map((item) => item.trim());

  return Array.from(
    new Set(
      source
        .map((item) => String(item || "").trim().toLowerCase())
        .filter((item) => item && isValidEmail(item)),
    ),
  );
};

export const normalizeAsaasEnvironment = () => "production";

export const normalizeAsaasConfig = (config = {}) => ({
  environment: normalizeAsaasEnvironment(
    config.environment || config.ambiente,
  ),
  webhook_url: normalizeText(config.webhook_url || config.webhookUrl),
  webhook_id: normalizeText(config.webhook_id || config.webhookId),
  webhook_registered_at: normalizeText(
    config.webhook_registered_at || config.webhookRegisteredAt,
  ),
  webhook_error: normalizeText(config.webhook_error || config.webhookError),
  webhook_cleanup_error: normalizeText(
    config.webhook_cleanup_error || config.webhookCleanupError,
  ),
  auto_charge_on_credit_sale: normalizeBoolean(
    config.auto_charge_on_credit_sale ??
      config.autoChargeOnCreditSale ??
      config.cobranca_automatica_venda_prazo,
  ),
});

export const normalizeResendConfig = (config = {}) => ({
  from_email: normalizeText(config.from_email || config.fromEmail).toLowerCase(),
  notification_recipients: toEmailList(
    config.notification_recipients || config.notificationRecipients,
  ),
});

export const normalizeProviderConfig = (provider, config = {}) => {
  const normalizedProvider = normalizeText(provider).toLowerCase();

  if (normalizedProvider === "asaas") {
    return normalizeAsaasConfig(config);
  }

  if (normalizedProvider === "resend") {
    return normalizeResendConfig(config);
  }

  return {};
};

const parseStoredConfig = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
};

const assertProvider = (provider) => {
  const normalized = normalizeText(provider).toLowerCase();
  if (!PROVIDERS.includes(normalized)) {
    throw new Error("Provedor de integração inválido.");
  }
  return normalized;
};

export const getIntegration = async (provider) => {
  const normalizedProvider = assertProvider(provider);
  const result = await query(
    `
      SELECT provedor, chave_criptografada, configuracao
      FROM empresa_configuracao_integracoes
      WHERE provedor = $1
      LIMIT 1
    `,
    [normalizedProvider],
  );

  const row = result.rows[0];
  const config = normalizeProviderConfig(
    normalizedProvider,
    parseStoredConfig(row?.configuracao),
  );
  const key = row?.chave_criptografada
    ? await conversaoDescripto(row.chave_criptografada)
    : "";

  return {
    provider: normalizedProvider,
    configured: Boolean(row?.chave_criptografada),
    key: normalizeText(key),
    config,
  };
};

export const listIntegrations = async () => {
  const integrations = await Promise.all(PROVIDERS.map(getIntegration));

  return integrations.map((integration) => ({
    provedor: integration.provider,
    configurado: integration.configured,
    config: integration.config,
  }));
};

export const saveIntegration = async ({ provider, key, config = {} }) => {
  const normalizedProvider = assertProvider(provider);
  const current = await getIntegration(normalizedProvider);

  const nextKey = normalizeText(key) || current.key;
  if (!nextKey) {
    const error = new Error("Informe a chave da integração.");
    error.statusCode = 400;
    throw error;
  }

  const nextConfig = normalizeProviderConfig(normalizedProvider, {
    ...current.config,
    ...config,
  });

  const encryptedKey = await conversaoCripto(nextKey);

  await query(
    `
      INSERT INTO empresa_configuracao_integracoes (
        provedor,
        chave_criptografada,
        configuracao,
        atualizado_em
      )
      VALUES ($1, $2, $3::jsonb, now())
      ON CONFLICT (provedor)
      DO UPDATE SET
        chave_criptografada = EXCLUDED.chave_criptografada,
        configuracao = EXCLUDED.configuracao,
        atualizado_em = now()
    `,
    [normalizedProvider, encryptedKey, JSON.stringify(nextConfig)],
  );

  return {
    provider: normalizedProvider,
    configured: true,
    config: nextConfig,
  };
};

export const isValidIntegrationEmail = isValidEmail;
export const normalizeIntegrationEmailList = toEmailList;
