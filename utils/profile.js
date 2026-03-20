export const PERFIS = {
  ADMIN: 1,
  COMUM: 2,
};

const ROLE_BY_CODE = {
  [PERFIS.ADMIN]: "admin",
  [PERFIS.COMUM]: "comum",
};

const LABEL_BY_CODE = {
  [PERFIS.ADMIN]: "Admin",
  [PERFIS.COMUM]: "Comum",
};

const CODE_BY_ROLE = {
  admin: PERFIS.ADMIN,
  comum: PERFIS.COMUM,
};

export const parsePerfilCode = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  if (Number.isInteger(numeric) && ROLE_BY_CODE[numeric]) {
    return numeric;
  }

  const role = String(value).trim().toLowerCase();
  return CODE_BY_ROLE[role] || null;
};

export const toPerfilCode = (value) => {
  return parsePerfilCode(value) || PERFIS.COMUM;
};

export const toPerfilRole = (value) => ROLE_BY_CODE[toPerfilCode(value)];

export const toPerfilLabel = (value) => LABEL_BY_CODE[toPerfilCode(value)];
