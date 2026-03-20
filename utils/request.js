const getHeaderValue = (value) => {
  if (Array.isArray(value)) return value[0] || "";
  return String(value || "").trim();
};

export const resolveRequestOrigin = (req) => {
  const envOrigin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (envOrigin) {
    const normalized = String(envOrigin).trim();
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
      return normalized.replace(/\/+$/, "");
    }
    return `https://${normalized.replace(/\/+$/, "")}`;
  }

  const protocol =
    getHeaderValue(req.headers["x-forwarded-proto"]) || "http";
  const host =
    getHeaderValue(req.headers["x-forwarded-host"]) ||
    getHeaderValue(req.headers.host);

  if (!host) return "";
  return `${protocol}://${host}`.replace(/\/+$/, "");
};
