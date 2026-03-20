const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatCurrency = (value) => {
  const number = Number(value || 0);
  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

export const formatDate = (value) => {
  if (!value) return "-";
  const raw = String(value).trim();
  if (!raw) return "-";

  if (isoDatePattern.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${day}/${month}/${year}`;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "-";

  const [year, month, day] = toIsoDate(date).split("-");
  return `${day}/${month}/${year}`;
};
