import type { RecurrenceRule } from './types';

/**
 * Compute the next ISO date string ("YYYY-MM-DD") after baseDate
 * based on the given recurrence rule.
 * Returns null if endDate is set and the next occurrence would exceed it.
 */
export function computeNextDueDate(
  rule: RecurrenceRule,
  baseDate: string,
): string | null {
  const base = new Date(baseDate + 'T00:00:00');

  let next: Date;

  switch (rule.type) {
    case 'daily':
    case 'custom': {
      next = new Date(base);
      next.setDate(next.getDate() + rule.interval);
      break;
    }
    case 'weekly': {
      const days = rule.daysOfWeek && rule.daysOfWeek.length > 0
        ? [...rule.daysOfWeek].sort((a, b) => a - b)
        : [base.getDay()];
      // Find the next occurrence of any target day after base
      next = new Date(base);
      next.setDate(next.getDate() + 1); // at least 1 day ahead
      let found = false;
      // Search up to 7*interval days ahead for a matching weekday
      for (let i = 0; i < 7 * rule.interval + 7; i++) {
        const candidate = new Date(next);
        candidate.setDate(next.getDate() + i);
        if (days.includes(candidate.getDay())) {
          // Use UTC midnight to compute the calendar-day difference so that
          // DST transitions (where a local midnight-to-midnight can be 23 h or
          // 25 h) do not cause weeksDiff to be miscounted.
          const MS_PER_DAY = 24 * 60 * 60 * 1000;
          const daysDiff = Math.round(
            (Date.UTC(candidate.getFullYear(), candidate.getMonth(), candidate.getDate()) -
              Date.UTC(base.getFullYear(), base.getMonth(), base.getDate())) /
              MS_PER_DAY,
          );
          const weeksDiff = Math.floor(daysDiff / 7);
          // For interval=1, same-week matching is valid (weeksDiff >= 0).
          // For interval>1, require full-week blocks so e.g. an every-2-weeks
          // rule cannot match a date only 1 week later.
          const minWeeks = rule.interval > 1 ? rule.interval : 0;
          if (weeksDiff >= minWeeks) {
            next = candidate;
            found = true;
            break;
          }
        }
      }
      if (!found) {
        // Fallback: add interval weeks
        next = new Date(base);
        next.setDate(next.getDate() + 7 * rule.interval);
      }
      break;
    }
    case 'monthly': {
      const targetDay = rule.dayOfMonth ?? base.getDate();
      const targetMonth = base.getMonth() + rule.interval;
      // Build from year/month/1 to avoid day-overflow when the base date is
      // near month-end (e.g. Jan 31 + 1 month must land in February, not March).
      next = new Date(base.getFullYear(), targetMonth, 1);
      next.setDate(Math.min(targetDay, getDaysInMonth(next.getFullYear(), next.getMonth())));
      break;
    }
    case 'yearly': {
      const targetDay = rule.dayOfMonth ?? base.getDate();
      const targetMonth = rule.monthOfYear != null
        ? rule.monthOfYear - 1  // monthOfYear is 1-indexed
        : base.getMonth();
      const targetYear = base.getFullYear() + rule.interval;
      // Build from year/month/1 to avoid day-overflow (e.g. Feb 29 in a
      // non-leap target year) before the final day clamp is applied.
      next = new Date(targetYear, targetMonth, 1);
      next.setDate(Math.min(targetDay, getDaysInMonth(next.getFullYear(), next.getMonth())));
      break;
    }
    default: {
      next = new Date(base);
      next.setDate(next.getDate() + 1);
    }
  }

  const result = formatDate(next);

  if (rule.endDate && result > rule.endDate) {
    return null;
  }

  return result;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
