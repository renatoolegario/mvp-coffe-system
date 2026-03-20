import { query } from "../../../../../infra/database";
import { requireAdmin } from "../../../../../infra/auth";

const TABLE_NAME = "feedback_tasks";
const STATUS_VALIDOS = new Set([1, 2, 3]);
const STATUS_LABEL = {
  1: "pendente",
  2: "processando",
  3: "concluido",
};
const MAX_ATTACHMENT_ITEMS = 5;
const MAX_ATTACHMENT_LENGTH = 5_000_000;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizePayload(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      throw createHttpError("Body JSON inválido.", 400);
    }
  }

  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  return {};
}

function normalizeText(
  value,
  { fieldName, required = false, maxLength = 10000 } = {},
) {
  const parsed = typeof value === "string" ? value.trim() : "";

  if (!parsed) {
    if (required) {
      throw createHttpError(`Campo ${fieldName} obrigatório.`, 400);
    }
    return null;
  }

  if (parsed.length > maxLength) {
    throw createHttpError(
      `Campo ${fieldName} excede ${maxLength} caracteres.`,
      400,
    );
  }

  return parsed;
}

function normalizeStatus(value) {
  const status = Number(value);

  if (!Number.isInteger(status) || !STATUS_VALIDOS.has(status)) {
    return null;
  }

  return status;
}

function normalizeTextArray(
  value,
  {
    fieldName,
    maxItems = MAX_ATTACHMENT_ITEMS,
    maxLength = MAX_ATTACHMENT_LENGTH,
  } = {},
) {
  const source = Array.isArray(value)
    ? value
    : value === null || value === undefined
      ? []
      : [value];

  if (source.length > maxItems) {
    throw createHttpError(`Campo ${fieldName} excede ${maxItems} itens.`, 400);
  }

  const unique = new Set();
  const normalized = [];

  source.forEach((item) => {
    const parsed = normalizeText(item, {
      fieldName,
      required: false,
      maxLength,
    });

    if (!parsed || unique.has(parsed)) {
      return;
    }

    unique.add(parsed);
    normalized.push(parsed);
  });

  return normalized.length ? normalized : null;
}

function normalizeAttachmentUrls(payload) {
  const legacyUrl = normalizeText(payload.url_anexo, {
    fieldName: "url_anexo",
    required: false,
    maxLength: MAX_ATTACHMENT_LENGTH,
  });
  const attachmentUrls = normalizeTextArray(payload.url_anexos, {
    fieldName: "url_anexos",
    maxItems: MAX_ATTACHMENT_ITEMS,
    maxLength: MAX_ATTACHMENT_LENGTH,
  });
  const merged = [];
  const unique = new Set();

  [legacyUrl, ...(attachmentUrls || [])].forEach((url) => {
    if (!url || unique.has(url)) {
      return;
    }

    unique.add(url);
    merged.push(url);
  });

  return {
    urlAnexo: merged[0] || null,
    urlAnexos: merged.length ? merged : null,
  };
}

function parseTaskId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError("Campo id inválido.", 400);
  }

  return id;
}

function hasAdminModeEnabled(req) {
  const adminParam = req.query?.admin;

  return Array.isArray(adminParam)
    ? adminParam.includes("1")
    : adminParam === "1";
}

function getAttachmentUrlsFromRow(row) {
  const merged = [];
  const unique = new Set();
  const rawArray = Array.isArray(row?.url_anexos) ? row.url_anexos : [];
  const legacyUrl =
    typeof row?.url_anexo === "string" && row.url_anexo.trim()
      ? row.url_anexo.trim()
      : null;

  [legacyUrl, ...rawArray].forEach((url) => {
    const normalized = typeof url === "string" ? url.trim() : "";

    if (!normalized || unique.has(normalized)) {
      return;
    }

    unique.add(normalized);
    merged.push(normalized);
  });

  return merged;
}

function serializeTask(row) {
  const status = Number(row.status);
  const urlAnexos = getAttachmentUrlsFromRow(row);

  return {
    id: Number(row.id),
    descricao: row.descricao,
    onde: row.onde,
    quem: row.quem,
    url_anexo: urlAnexos[0] || null,
    url_anexos: urlAnexos,
    status,
    status_label: STATUS_LABEL[status] || "desconhecido",
    git_commit: row.git_commit,
    parecer: row.parecer,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
  };
}

async function listarTasks() {
  const result = await query(
    `
      SELECT
        id,
        descricao,
        onde,
        quem,
        url_anexo,
        url_anexos,
        status,
        git_commit,
        parecer,
        criado_em,
        atualizado_em
      FROM ${TABLE_NAME}
      ORDER BY
        CASE status
          WHEN 1 THEN 0
          WHEN 2 THEN 1
          WHEN 3 THEN 2
          ELSE 3
        END,
        id DESC
    `,
  );

  return result.rows.map(serializeTask);
}

async function criarTask(payload) {
  const descricao = normalizeText(payload.descricao, {
    fieldName: "descricao",
    required: true,
    maxLength: 10000,
  });
  const onde = normalizeText(payload.onde, {
    fieldName: "onde",
    required: true,
    maxLength: 255,
  });
  const quem = normalizeText(payload.quem, {
    fieldName: "quem",
    required: false,
    maxLength: 255,
  });
  const { urlAnexo, urlAnexos } = normalizeAttachmentUrls(payload);

  const insertResult = await query(
    `
      INSERT INTO ${TABLE_NAME} (
        descricao,
        onde,
        quem,
        url_anexo,
        url_anexos,
        status,
        git_commit,
        parecer,
        criado_em,
        atualizado_em
      )
      VALUES ($1, $2, $3, $4, $5, 1, NULL, NULL, now(), now())
      RETURNING
        id,
        descricao,
        onde,
        quem,
        url_anexo,
        url_anexos,
        status,
        git_commit,
        parecer,
        criado_em,
        atualizado_em
    `,
    [descricao, onde, quem, urlAnexo, urlAnexos],
  );

  return serializeTask(insertResult.rows[0]);
}

async function atualizarTask(payload) {
  const id = parseTaskId(payload.id);

  const status = normalizeStatus(payload.status);
  if (!status) {
    throw createHttpError(
      "Campo status inválido. Valores permitidos: 1, 2 ou 3.",
      400,
    );
  }

  const parecer = normalizeText(payload.parecer, {
    fieldName: "parecer",
    required: true,
    maxLength: 20000,
  });

  const gitCommit = normalizeText(payload.git_commit, {
    fieldName: "git_commit",
    required: false,
    maxLength: 120,
  });

  const updateResult = await query(
    `
      UPDATE ${TABLE_NAME}
      SET
        status = $1,
        parecer = $2,
        git_commit = $3,
        atualizado_em = now()
      WHERE id = $4
      RETURNING
        id,
        descricao,
        onde,
        quem,
        url_anexo,
        url_anexos,
        status,
        git_commit,
        parecer,
        criado_em,
        atualizado_em
    `,
    [status, parecer, gitCommit, id],
  );

  if (updateResult.rowCount === 0) {
    throw createHttpError("Feedback task não encontrada.", 404);
  }

  return serializeTask(updateResult.rows[0]);
}

async function atualizarDadosTask(payload) {
  const id = parseTaskId(payload.id);
  const descricao = normalizeText(payload.descricao, {
    fieldName: "descricao",
    required: true,
    maxLength: 10000,
  });
  const onde = normalizeText(payload.onde, {
    fieldName: "onde",
    required: true,
    maxLength: 255,
  });
  const quem = normalizeText(payload.quem, {
    fieldName: "quem",
    required: false,
    maxLength: 255,
  });

  const updateResult = await query(
    `
      UPDATE ${TABLE_NAME}
      SET
        descricao = $1,
        onde = $2,
        quem = $3,
        atualizado_em = now()
      WHERE id = $4
      RETURNING
        id,
        descricao,
        onde,
        quem,
        url_anexo,
        url_anexos,
        status,
        git_commit,
        parecer,
        criado_em,
        atualizado_em
    `,
    [descricao, onde, quem, id],
  );

  if (updateResult.rowCount === 0) {
    throw createHttpError("Feedback task não encontrada.", 404);
  }

  return serializeTask(updateResult.rows[0]);
}

async function ensureAdminRequest(req, res) {
  if (hasAdminModeEnabled(req)) {
    return { bypass: true };
  }

  const auth = await requireAdmin(req, res);
  if (!auth) {
    return null;
  }

  return auth;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const tasks = await listarTasks();
      return res.status(200).json({ success: true, tasks });
    }

    if (req.method === "POST") {
      const payload = normalizePayload(req);
      const task = await criarTask(payload);
      return res.status(201).json({ success: true, task });
    }

    if (req.method === "PUT") {
      const adminRequestOk = await ensureAdminRequest(req, res);
      if (!adminRequestOk) {
        return;
      }

      const payload = normalizePayload(req);
      const task = await atualizarTask(payload);
      return res.status(200).json({ success: true, task });
    }

    if (req.method === "PATCH") {
      const adminRequestOk = await ensureAdminRequest(req, res);
      if (!adminRequestOk) {
        return;
      }

      const payload = normalizePayload(req);
      const task = await atualizarDadosTask(payload);
      return res.status(200).json({ success: true, task });
    }

    return res.status(405).json({
      success: false,
      error: "Método não permitido. Use GET, POST, PUT ou PATCH.",
    });
  } catch (error) {
    const statusCode =
      Number(error?.statusCode) || (error?.code === "42P01" ? 500 : 500);

    return res.status(statusCode).json({
      success: false,
      error:
        error?.code === "42P01"
          ? "Tabela feedback_tasks não encontrada. Rode: npm run migration:up"
          : error?.message || "Erro interno ao processar feedback tasks.",
    });
  }
}
