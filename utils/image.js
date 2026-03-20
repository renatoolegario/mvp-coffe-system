const DATA_URL_IMAGE_REGEX = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i;
const BASE64_CONTENT_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;

const inferMimeTypeFromBase64 = (content = "") => {
  if (!content) return null;
  if (content.startsWith("/9j/")) return "image/jpeg";
  if (content.startsWith("iVBORw0KGgo")) return "image/png";
  if (content.startsWith("R0lGOD")) return "image/gif";
  if (content.startsWith("UklGR")) return "image/webp";
  if (content.startsWith("PHN2Zy") || content.startsWith("PD94bWwg")) {
    return "image/svg+xml";
  }
  return null;
};

export const normalizeImageBase64 = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";

  if (DATA_URL_IMAGE_REGEX.test(text)) {
    return text.replace(/\s+/g, "");
  }

  const compact = text.replace(/\s+/g, "");
  if (!BASE64_CONTENT_REGEX.test(compact)) {
    return null;
  }

  const mimeType = inferMimeTypeFromBase64(compact);
  if (!mimeType) {
    return null;
  }

  return `data:${mimeType};base64,${compact}`;
};

export const isImageFile = (file) =>
  Boolean(file) &&
  String(file.type || "")
    .toLowerCase()
    .startsWith("image/");

export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    if (typeof FileReader === "undefined") {
      reject(
        new Error("Leitura de arquivo não está disponível neste ambiente."),
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(
        new Error(
          `Falha ao ler a imagem ${String(file.name || "").trim() || "selecionada"}.`,
        ),
      );

    reader.readAsDataURL(file);
  });
