import { isValidCpfCnpj, normalizeCpfCnpj } from "./document";

export const normalizeClienteEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const isValidClienteEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeClienteEmail(value));

const formatFieldList = (fields = []) => {
  if (!fields.length) return "";
  if (fields.length === 1) return fields[0];
  if (fields.length === 2) {
    return `${fields[0]} e ${fields[1]}`;
  }
  return `${fields.slice(0, -1).join(", ")} e ${fields[fields.length - 1]}`;
};

export const getClienteCobrancaRequirements = (cliente = {}) => {
  const safeCliente =
    cliente && typeof cliente === "object" ? cliente : {};
  const nome = String(safeCliente.nome || "").trim();
  const email = normalizeClienteEmail(safeCliente.email);
  const cpfCnpj = normalizeCpfCnpj(safeCliente.cpf_cnpj);
  const missingFields = [];
  const invalidFields = [];

  if (!nome) {
    missingFields.push("nome");
  }
  if (!cpfCnpj) {
    missingFields.push("CPF/CNPJ");
  } else if (!isValidCpfCnpj(cpfCnpj)) {
    invalidFields.push("CPF/CNPJ");
  }
  if (!email) {
    missingFields.push("email");
  } else if (!isValidClienteEmail(email)) {
    invalidFields.push("email");
  }

  return {
    nome,
    email,
    cpfCnpj,
    missingFields,
    invalidFields,
    isReady: missingFields.length === 0 && invalidFields.length === 0,
  };
};

export const buildClienteCobrancaBlockMessage = (
  cliente = {},
  action = "emitir cobrança no ASAAS",
) => {
  const { missingFields, invalidFields, isReady } =
    getClienteCobrancaRequirements(cliente);

  if (isReady) return "";

  const issues = [];

  if (missingFields.length) {
    issues.push(`faltam ${formatFieldList(missingFields)}`);
  }

  if (invalidFields.length) {
    const fieldsLabel = formatFieldList(invalidFields);
    issues.push(
      invalidFields.length === 1
        ? `${fieldsLabel} está inválido`
        : `${fieldsLabel} estão inválidos`,
    );
  }

  return `Nao e possivel ${action} porque ${issues.join(" e ")} no cadastro do cliente.`;
};
