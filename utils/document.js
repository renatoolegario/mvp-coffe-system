const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

const allDigitsEqual = (value) => /^(\d)\1+$/.test(value);

export const normalizeCpfCnpj = (value) => onlyDigits(value);

export const isValidCpf = (value) => {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || allDigitsEqual(cpf)) return false;

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(cpf[index]) * (10 - index);
  }
  let firstDigit = (sum * 10) % 11;
  if (firstDigit === 10) firstDigit = 0;
  if (firstDigit !== Number(cpf[9])) return false;

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(cpf[index]) * (11 - index);
  }
  let secondDigit = (sum * 10) % 11;
  if (secondDigit === 10) secondDigit = 0;
  return secondDigit === Number(cpf[10]);
};

const cnpjVerifierDigit = (base, factors) => {
  const sum = base
    .split("")
    .reduce((acc, digit, index) => acc + Number(digit) * factors[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

export const isValidCnpj = (value) => {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || allDigitsEqual(cnpj)) return false;

  const base = cnpj.slice(0, 12);
  const firstDigit = cnpjVerifierDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = cnpjVerifierDigit(
    `${base}${firstDigit}`,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return (
    firstDigit === Number(cnpj[12]) &&
    secondDigit === Number(cnpj[13])
  );
};

export const isValidCpfCnpj = (value) => {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
};
