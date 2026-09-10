export function parseLocalDate(value: string) {
  if (!value) return null;
  if (!value.includes("T")) {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getWeekStart(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function formatCardDate(value?: string | null) {
  if (!value) return null;
  const date = parseLocalDate(value);
  if (!date) return value;
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const hasTime = value.includes("T");
  const inWeek = date >= weekStart && date < weekEnd;

  const weekdayFormatter = new Intl.DateTimeFormat("en", { weekday: "short" });
  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  });

  const datePart = inWeek ? weekdayFormatter.format(date) : dateFormatter.format(date);

  if (!hasTime) return datePart;

  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${datePart}, ${timeFormatter.format(date)}`;
}

export function isFutureDate(dateString?: string | null) {
  if (!dateString) return false;
  const date = parseLocalDate(dateString);
  if (!date) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date.getTime() > now.getTime();
}
