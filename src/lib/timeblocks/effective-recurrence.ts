import type { Habit, Routine, Timeblock, RecurrenceRule } from '../types';

/**
 * Returns the effective RecurrenceRule for a Routine.
 * If the routine has a timeblockId and the timeblock is found in the map,
 * the timeblock's recurrence overrides the routine's own recurrence.
 */
export function getEffectiveRecurrenceForRoutine(
  routine: Routine,
  timeblockMap: Map<string, Timeblock>,
): RecurrenceRule {
  if (routine.timeblockId) {
    const tb = timeblockMap.get(routine.timeblockId);
    if (tb) return tb.recurrence;
  }
  return routine.recurrence;
}

/**
 * Returns the effective frequencyDays for a Habit.
 * If the habit has a timeblockId and the timeblock is found in the map,
 * frequencyDays is derived from the timeblock's recurrence rule.
 *
 * Derivation rules:
 *   - weekly + daysOfWeek  → use daysOfWeek directly
 *   - daily / custom       → all days [0,1,2,3,4,5,6]
 *   - monthly / yearly     → [] (HabitCalendarGrid marks non-matching cells as skipped)
 */
export function getEffectiveFrequencyDaysForHabit(
  habit: Habit,
  timeblockMap: Map<string, Timeblock>,
): number[] | undefined {
  if (habit.timeblockId) {
    const tb = timeblockMap.get(habit.timeblockId);
    if (tb) {
      return deriveFrequencyDaysFromRecurrence(tb.recurrence);
    }
  }
  return habit.frequencyDays;
}

/**
 * Derive a frequencyDays array from a RecurrenceRule.
 * Used to bridge Timeblock's RecurrenceRule into Habit's frequencyDays model.
 */
export function deriveFrequencyDaysFromRecurrence(rule: RecurrenceRule): number[] {
  switch (rule.type) {
    case 'weekly':
      // Use explicit daysOfWeek if present; otherwise all days are active
      return rule.daysOfWeek && rule.daysOfWeek.length > 0
        ? [...rule.daysOfWeek]
        : [0, 1, 2, 3, 4, 5, 6];
    case 'daily':
    case 'custom':
      return [0, 1, 2, 3, 4, 5, 6];
    case 'monthly':
    case 'yearly':
      // Sparse recurrence — the calendar grid will show most days as skipped.
      // Actual active dates are computed separately via computeOccurrencesInRange.
      return [];
    default:
      return [];
  }
}

/**
 * Build a Map<timeblockId, Timeblock> from an array of timeblocks.
 * Convenience helper for call sites that hold a flat array.
 */
export function buildTimeblockMap(timeblocks: Timeblock[]): Map<string, Timeblock> {
  return new Map(timeblocks.map(tb => [tb.id, tb]));
}

/**
 * Returns all occurrence dates (YYYY-MM-DD) for a RecurrenceRule
 * that fall within [rangeStart, rangeEnd] inclusive.
 * Used by the weekly calendar to place timeblock cards on the correct days.
 */
export function computeOccurrencesInRange(
  rule: RecurrenceRule,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const results: string[] = [];
  const start = new Date(rangeStart + 'T00:00:00');
  const end = new Date(rangeEnd + 'T00:00:00');

  // Iterate day-by-day within the range and test each day against the rule.
  // This is intentionally simple — ranges are at most 7 days for the weekly calendar.
  const current = new Date(start);
  while (current <= end) {
    if (matchesRule(rule, current)) {
      results.push(formatDate(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return results;
}

/**
 * Test whether a given Date matches a RecurrenceRule (ignoring endDate —
 * the caller is responsible for filtering by endDate if needed).
 */
function matchesRule(rule: RecurrenceRule, date: Date): boolean {
  switch (rule.type) {
    case 'daily':
    case 'custom':
      // Every N days — we can't anchor without a base date, so treat as every day
      // for display purposes in the weekly calendar.
      return true;
    case 'weekly': {
      const dow = date.getDay();
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        return rule.daysOfWeek.includes(dow);
      }
      return true; // no specific days = every week
    }
    case 'monthly':
      return date.getDate() === (rule.dayOfMonth ?? 1);
    case 'yearly':
      return (
        date.getMonth() + 1 === (rule.monthOfYear ?? 1) &&
        date.getDate() === (rule.dayOfMonth ?? 1)
      );
    default:
      return false;
  }
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
