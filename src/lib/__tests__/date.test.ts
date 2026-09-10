import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatDateKey, getTodayDateKey, getDateKeyFromIsoLike } from '../date';

describe('formatDateKey', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(formatDateKey(new Date(2026, 2, 26))).toBe('2026-03-26');
  });

  it('zero-pads month and day', () => {
    expect(formatDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('handles December (month 11)', () => {
    expect(formatDateKey(new Date(2025, 11, 31))).toBe('2025-12-31');
  });

  it('handles leap day', () => {
    expect(formatDateKey(new Date(2024, 1, 29))).toBe('2024-02-29');
  });

  it('result has exactly length 10', () => {
    expect(formatDateKey(new Date(2026, 2, 26))).toHaveLength(10);
  });
});

describe('getTodayDateKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 26, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns today as YYYY-MM-DD', () => {
    expect(getTodayDateKey()).toBe('2026-03-26');
  });

  it('result matches formatDateKey(new Date())', () => {
    expect(getTodayDateKey()).toBe(formatDateKey(new Date()));
  });
});

describe('getDateKeyFromIsoLike', () => {
  it('returns null for null input', () => {
    expect(getDateKeyFromIsoLike(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(getDateKeyFromIsoLike(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getDateKeyFromIsoLike('')).toBeNull();
  });

  it('extracts YYYY-MM-DD from ISO datetime string', () => {
    expect(getDateKeyFromIsoLike('2026-03-26T10:30:00Z')).toBe('2026-03-26');
  });

  it('returns the value directly if already YYYY-MM-DD', () => {
    expect(getDateKeyFromIsoLike('2026-03-26')).toBe('2026-03-26');
  });

  it('handles ISO strings with milliseconds', () => {
    expect(getDateKeyFromIsoLike('2026-03-26T10:30:00.000Z')).toBe('2026-03-26');
  });

  it('returns null for an invalid date string', () => {
    expect(getDateKeyFromIsoLike('not-a-date')).toBeNull();
  });

  it('parses "2026-03" as March 1st (JS Date treats it as valid)', () => {
    // '2026-03' is shorter than 10 chars so it falls through to new Date(),
    // which parses it as 2026-03-01
    expect(getDateKeyFromIsoLike('2026-03')).toBe('2026-03-01');
  });

  it('parses a date-only string without time component', () => {
    expect(getDateKeyFromIsoLike('2026-01-01')).toBe('2026-01-01');
  });
});
