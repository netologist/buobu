import { describe, it, expect } from 'vitest';
import { computeNextDueDate } from '../recurrence';

describe('computeNextDueDate', () => {
  it('daily: interval 1 from 2026-03-21 -> 2026-03-22', () => {
    expect(computeNextDueDate({ type: 'daily', interval: 1 }, '2026-03-21')).toBe('2026-03-22');
  });

  it('daily: interval 3 from 2026-03-21 -> 2026-03-24', () => {
    expect(computeNextDueDate({ type: 'daily', interval: 3 }, '2026-03-21')).toBe('2026-03-24');
  });

  it('weekly: interval 1, Monday [1] from Saturday 2026-03-21 -> 2026-03-23', () => {
    expect(computeNextDueDate({ type: 'weekly', interval: 1, daysOfWeek: [1] }, '2026-03-21')).toBe('2026-03-23');
  });

  it('weekly: interval 1, Saturday [6] from Saturday 2026-03-21 -> 2026-03-28', () => {
    expect(computeNextDueDate({ type: 'weekly', interval: 1, daysOfWeek: [6] }, '2026-03-21')).toBe('2026-03-28');
  });

  it('monthly: interval 1, dayOfMonth 15, from 2026-03-21 -> 2026-04-15', () => {
    expect(computeNextDueDate({ type: 'monthly', interval: 1, dayOfMonth: 15 }, '2026-03-21')).toBe('2026-04-15');
  });

  it('yearly: interval 1, monthOfYear 1, dayOfMonth 1, from 2026-03-21 -> 2027-01-01', () => {
    expect(computeNextDueDate({ type: 'yearly', interval: 1, monthOfYear: 1, dayOfMonth: 1 }, '2026-03-21')).toBe('2027-01-01');
  });

  it('custom: interval 5 from 2026-03-21 -> 2026-03-26 (treated as daily)', () => {
    expect(computeNextDueDate({ type: 'custom', interval: 5 }, '2026-03-21')).toBe('2026-03-26');
  });

  it('weekly: daysOfWeek [1, 3] from Saturday 2026-03-21 -> 2026-03-23 (Monday is closer)', () => {
    expect(computeNextDueDate({ type: 'weekly', interval: 1, daysOfWeek: [1, 3] }, '2026-03-21')).toBe('2026-03-23');
  });

  it('weekly: interval 2, Monday [1] from Saturday 2026-03-21 -> 2026-04-06 (not 9 days/1 week later)', () => {
    // bi-weekly from a Saturday; the next Monday that is at least 2 full-week-blocks away
    // Monday 2026-03-23 (2 days, weeksDiff=0) and 2026-03-30 (9 days, weeksDiff=1) must be skipped
    expect(computeNextDueDate({ type: 'weekly', interval: 2, daysOfWeek: [1] }, '2026-03-21')).toBe('2026-04-06');
  });

  it('weekly: interval 1, Mon/Wed/Fri [1,3,5] from Monday 2026-03-23 -> 2026-03-25 (same-week Wednesday)', () => {
    // interval=1 should allow within-week cycling: Monday -> Wednesday
    expect(computeNextDueDate({ type: 'weekly', interval: 1, daysOfWeek: [1, 3, 5] }, '2026-03-23')).toBe('2026-03-25');
  });

  it('weekly: interval 2, Mon/Wed [1,3] from Monday 2026-03-23 -> 2026-04-06 (2 full weeks later)', () => {
    // bi-weekly Mon/Wed cycle: base Monday, next must be at least 2 weeks ahead -> Monday 2026-04-06
    expect(computeNextDueDate({ type: 'weekly', interval: 2, daysOfWeek: [1, 3] }, '2026-03-23')).toBe('2026-04-06');
  });

  it('weekly: interval 2, Saturday [6] across US DST spring-forward (2026-03-07 -> 2026-03-21)', () => {
    // US DST begins 2026-03-08; the base Saturday is 2026-03-07.
    // Exactly 14 calendar days later is 2026-03-21, which is also a Saturday.
    // A ms-based weeksDiff over a DST boundary could evaluate to 1.99 and
    // Math.floor would wrongly return 1, skipping the correct occurrence.
    expect(computeNextDueDate({ type: 'weekly', interval: 2, daysOfWeek: [6] }, '2026-03-07')).toBe('2026-03-21');
  });

  it('returns string of length 10 (YYYY-MM-DD)', () => {
    const result = computeNextDueDate({ type: 'daily', interval: 1 }, '2026-03-21');
    expect(result).toHaveLength(10);
  });

  it('endDate respected: returns null if computed date exceeds endDate', () => {
    expect(
      computeNextDueDate({ type: 'daily', interval: 5, endDate: '2026-03-24' }, '2026-03-21')
    ).toBeNull();
  });

  it('endDate: returns date if computed date equals endDate', () => {
    expect(
      computeNextDueDate({ type: 'daily', interval: 3, endDate: '2026-03-24' }, '2026-03-21')
    ).toBe('2026-03-24');
  });

  // Month-end overflow edge cases
  it('monthly: Jan 31 + 1 month stays in February (no overflow to March)', () => {
    expect(computeNextDueDate({ type: 'monthly', interval: 1 }, '2026-01-31')).toBe('2026-02-28');
  });

  it('monthly: dayOfMonth 31 in April clamps to 30', () => {
    expect(
      computeNextDueDate({ type: 'monthly', interval: 1, dayOfMonth: 31 }, '2026-03-15')
    ).toBe('2026-04-30');
  });

  it('yearly: Feb 29 base in leap year + 1 year clamps to Feb 28 in non-leap year', () => {
    expect(computeNextDueDate({ type: 'yearly', interval: 1 }, '2024-02-29')).toBe('2025-02-28');
  });

  it('yearly: monthOfYear 2, dayOfMonth 29 in non-leap year clamps to Feb 28', () => {
    expect(
      computeNextDueDate({ type: 'yearly', interval: 1, monthOfYear: 2, dayOfMonth: 29 }, '2026-03-21')
    ).toBe('2027-02-28');
  });

  // Branch coverage: empty daysOfWeek fallback
  it('weekly: empty daysOfWeek falls back to base weekday (Saturday -> next Saturday)', () => {
    // daysOfWeek: [] triggers the fallback branch: uses [base.getDay()] = [6] (Saturday)
    expect(computeNextDueDate({ type: 'weekly', interval: 1, daysOfWeek: [] }, '2026-03-21')).toBe('2026-03-28');
  });

  // Branch coverage: default switch case
  it('unknown type falls back to +1 day (default case)', () => {
    expect(computeNextDueDate({ type: 'unknown' as any, interval: 1 }, '2026-03-21')).toBe('2026-03-22');
  });

  // Explicit non-overflow cases for monthly/yearly without optional params
  it('monthly without dayOfMonth uses base.getDate() — normal case', () => {
    expect(computeNextDueDate({ type: 'monthly', interval: 1 }, '2026-03-21')).toBe('2026-04-21');
  });

  it('yearly without monthOfYear uses base.getMonth() — normal case', () => {
    expect(computeNextDueDate({ type: 'yearly', interval: 1 }, '2026-03-21')).toBe('2027-03-21');
  });
});
