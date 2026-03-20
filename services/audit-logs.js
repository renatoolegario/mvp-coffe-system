import { query } from "../infra/database";

const LOG_TYPES = new Set(["cron", "webhook"]);
const LOG_STATUSES = new Set([
  "SUCESSO",
  "ERRO",
  "PARCIAL",
  "IGNORADO",
  "NAO_AUTORIZADO",
]);
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MAX_DEPTH = 6;
const MAX_OBJECT_KEYS = 50;
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 4000;
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "asaas-access-token",
  "cookie",
  "set-cookie",
  "x-api-key",
]);

const normalizeText = (value) => String(value ?? "").trim();

const truncateText = (value, maxLength = MAX_STRING_LENGTH) => {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
};

const sanitizeJsonValue = (value, depth = 0) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    return truncateText(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (depth >= MAX_DEPTH) {
    return "[max-depth]";
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeJsonValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);
    return entries.reduce((accumulator, [key, entryValue]) => {
      accumulator[truncateText(key, 120) || "field"] = sanitizeJsonValue(
        entryValue,
        depth + 1,
      );
      return accumulator;
    }, {});
  }

  return truncateText(String(value));
};

const sanitizeHeaders = (headers = {}) => {
  const safeHeaders = {};

  Object.entries(headers || {}).forEach(([key, value]) => {
    const normalizedKey = normalizeText(key).toLowerCase();
    if (!normalizedKey) return;

    if (SENSITIVE_HEADERS.has(normalizedKey)) {
      safeHeaders[normalizedKey] = "[redacted]";
      return;
    }

    safeHeaders[normalizedKey] = sanitizeJsonValue(value);
  });

  return safeHeaders;
};

const normalizeType = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return LOG_TYPES.has(normalized) ? normalized : "outro";
};

const normalizeStatus = (value) => {
  const normalized = normalizeText(value).toUpperCase();
  if (LOG_STATUSES.has(normalized)) {
    return normalized;
  }
  return normalized || "SUCESSO";
};

const parseLimit = (value) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
};

const toJsonString = (value) => JSON.stringify(sanitizeJsonValue(value) || {});

const serializeAuditLog = (row) => ({
  id: row.id,
  tipo: row.tipo,
  chave: row.chave,
  descricao: row.descricao,
  endpoint: row.endpoint,
  metodo: row.metodo,
  origem: row.origem,
  status: row.status,
  http_status:
    row.http_status === null || row.http_status === undefined
      ? null
      : Number(row.http_status),
  evento: row.evento || "",
  referencia: row.referencia || "",
  request_headers: row.request_headers || {},
  request_payload: row.request_payload || {},
  response_payload: row.response_payload || {},
  metadados: row.metadados || {},
  erro: row.erro || "",
  executado_em: row.executado_em,
  criado_em: row.criado_em,
});

export const registerAuditLog = async ({
  type,
  key,
  description,
  endpoint,
  method,
  origin,
  status,
  httpStatus,
  event,
  reference,
  requestHeaders,
  requestPayload,
  responsePayload,
  metadata,
  error,
  executedAt,
}) => {
  await query(
    `
      INSERT INTO auditoria_logs (
        tipo,
        chave,
        descricao,
        endpoint,
        metodo,
        origem,
        status,
        http_status,
        evento,
        referencia,
        request_headers,
        request_payload,
        response_payload,
        metadados,
        erro,
        executado_em,
        criado_em
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11::jsonb,
        $12::jsonb,
        $13::jsonb,
        $14::jsonb,
        $15,
        COALESCE($16::timestamptz, now()),
        now()
      )
    `,
    [
      normalizeType(type),
      truncateText(key, 120),
      truncateText(description, 255),
      truncateText(endpoint, 255),
      truncateText(method, 12).toUpperCase(),
      truncateText(origin, 120),
      normalizeStatus(status),
      Number.isInteger(Number(httpStatus)) ? Number(httpStatus) : null,
      truncateText(event, 120) || null,
      truncateText(reference, 255) || null,
      toJsonString(sanitizeHeaders(requestHeaders)),
      toJsonString(requestPayload),
      toJsonString(responsePayload),
      toJsonString(metadata),
      truncateText(error) || null,
      executedAt || null,
    ],
  );
};

export const safeRegisterAuditLog = async (payload) => {
  try {
    await registerAuditLog(payload);
  } catch (error) {
    console.error("Falha ao registrar log de auditoria.", error);
  }
};

export const listAuditLogs = async ({ type, status, limit } = {}) => {
  const conditions = [];
  const params = [];
  const normalizedType = normalizeText(type).toLowerCase();
  const normalizedStatus = normalizeText(status).toUpperCase();

  if (LOG_TYPES.has(normalizedType)) {
    params.push(normalizedType);
    conditions.push(`tipo = $${params.length}`);
  }

  if (LOG_STATUSES.has(normalizedStatus)) {
    params.push(normalizedStatus);
    conditions.push(`status = $${params.length}`);
  }

  params.push(parseLimit(limit));

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const result = await query(
    `
      SELECT
        id,
        tipo,
        chave,
        descricao,
        endpoint,
        metodo,
        origem,
        status,
        http_status,
        evento,
        referencia,
        request_headers,
        request_payload,
        response_payload,
        metadados,
        erro,
        executado_em,
        criado_em
      FROM auditoria_logs
      ${whereClause}
      ORDER BY executado_em DESC, criado_em DESC
      LIMIT $${params.length}
    `,
    params,
  );

  return result.rows.map(serializeAuditLog);
};
