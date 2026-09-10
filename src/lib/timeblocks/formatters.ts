import type { RecurrenceRule } from '@/lib/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function recurrenceSummary(r: RecurrenceRule): string {
  const { type, interval, daysOfWeek, dayOfMonth, monthOfYear } = r;
  switch (type) {
    case 'daily':
      return interval === 1 ? 'Every day' : `Every ${interval} days`;
    case 'weekly': {
      const days =
        daysOfWeek && daysOfWeek.length > 0
          ? daysOfWeek.map((d) => DAY_NAMES[d]).join(', ')
          : 'week';
      if (interval === 2) return `Every 2 weeks on ${days}`;
      return interval === 1 ? `Every ${days}` : `Every ${interval} weeks on ${days}`;
    }
    case 'monthly':
      return dayOfMonth ? `Monthly on day ${dayOfMonth}` : `Every ${interval} month(s)`;
    case 'yearly': {
      const month = monthOfYear ? MONTH_NAMES[monthOfYear - 1] : '?';
      return dayOfMonth ? `Yearly on ${month} ${dayOfMonth}` : 'Yearly';
    }
    case 'custom':
      return `Every ${interval} days`;
    default:
      return 'Recurring';
  }
}

/** Derive human-readable day labels from daysOfWeek array */
export function formatDaysOfWeek(days: number[]): string {
  if (days.length === 7) return 'Every day';
  if (days.length === 0) return '—';
  return days.map((d) => DAY_NAMES_FULL[d]).join(', ');
}

/** Format minutes as "X sa Y dk" or "X sa" or "Y dk" */
export function formatTimebox(minutes: number): string {
  if (minutes <= 0) return '0 dk';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h} sa ${m} dk`;
  if (h > 0) return `${h} sa`;
  return `${m} dk`;
}
