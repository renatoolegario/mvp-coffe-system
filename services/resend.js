import { getIntegration } from "./integrations";

const buildServiceError = (message, statusCode = 400, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) {
    error.details = details;
  }
  return error;
};

const parseJsonResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: text };
  }
};

export const getResendRuntime = async () => {
  const integration = await getIntegration("resend");

  if (!integration.configured || !integration.key) {
    throw buildServiceError("Integração Resend não configurada.", 400);
  }

  if (!integration.config.from_email) {
    throw buildServiceError(
      "Configure o remetente do Resend antes de enviar emails.",
      400,
    );
  }

  if (!integration.config.notification_recipients.length) {
    throw buildServiceError(
      "Configure ao menos um destinatário para os lembretes do Resend.",
      400,
    );
  }

  return {
    apiKey: integration.key,
    config: integration.config,
  };
};

export const sendResendEmail = async ({
  to,
  subject,
  html,
  text,
  tags = [],
}) => {
  const { apiKey, config } = await getResendRuntime();
  const recipients = Array.isArray(to) ? to : [to];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from_email,
      to: recipients,
      subject,
      html,
      text,
      tags,
    }),
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw buildServiceError(
      payload?.message || payload?.error || "Erro ao enviar email pelo Resend.",
      response.status,
      payload,
    );
  }

  return payload;
};
