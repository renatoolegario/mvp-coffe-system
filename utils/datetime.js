const pad = (value) => String(value).padStart(2, "0");
const APP_TIMEZONE = "America/Sao_Paulo";

const toDatePartsInTimeZone = (input = new Date()) => {
  const date = input instanceof Date ? input : new Date(input);
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
    second: getPart("second"),
  };
};

export const toLocalDateTime = (input = new Date()) => {
  const { year, month, day, hour, minute, second } =
    toDatePartsInTimeZone(input);
  const hours = pad(hour);
  const minutes = pad(minute);
  const seconds = pad(second);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export const addDaysLocalDateTime = (days = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return toLocalDateTime(date);
};

export const toTimestampMillis = (value) => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};
