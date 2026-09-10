import { formatAmountWithSymbol } from "@/lib/formatters/amountFormatter";
import { parseLocalDate } from "@/lib/kanban/dateUtils";
import type { Task, TaskTransaction } from "@/lib/types";

export type TransactionRow = {
  task: Task;
  tx: TaskTransaction;
};

export const PIE_COLORS = [
  "#6366f1",
  "#f43f5e",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#ef4444",
  "#06b6d4",
];

export { formatAmountWithSymbol, parseLocalDate };

export function isFutureDate(dateString?: string | null) {
  if (!dateString) return false;
  const date = parseLocalDate(dateString);
  if (!date) return false;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  return date >= startOfTomorrow;
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = parseLocalDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
