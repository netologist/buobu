import { getWeekStart, parseLocalDate } from "@/lib/kanban/dateUtils";

export function formatSwimlaneDeadlineLabel(deadline: string, referenceDate = new Date()) {
  const date = parseLocalDate(deadline);
  if (!date) return null;
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  ).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.ceil((target - startOfToday) / dayMs);
  return `${diffDays} days left`;
}

export function formatSwimlaneDeadlineHover(deadline: string, referenceDate = new Date()) {
  const date = parseLocalDate(deadline);
  if (!date) return deadline;
  const weekStart = getWeekStart(referenceDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  if (date >= weekStart && date < weekEnd) {
    return new Intl.DateTimeFormat("en", { weekday: "long" }).format(date);
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
