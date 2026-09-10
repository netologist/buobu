import { describe, it, expect } from 'vitest';
import { getTrialDaysRemaining, shouldShowTrialWarning } from '../trial-warning';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns an ISO timestamp `days` days from `base` (default: Unix epoch for determinism). */
function daysFrom(days: number, base: Date = new Date('2026-01-01T12:00:00Z')): string {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

const NOW = new Date('2026-01-10T12:00:00Z');

// ---------------------------------------------------------------------------
// getTrialDaysRemaining
// ---------------------------------------------------------------------------

describe('getTrialDaysRemaining', () => {
  // ── Null / falsy inputs ──────────────────────────────────────────────────

  it('returns null when trialEnd is null', () => {
    expect(getTrialDaysRemaining(null, NOW)).toBeNull();
  });

  it('returns null when trialEnd is undefined', () => {
    expect(getTrialDaysRemaining(undefined, NOW)).toBeNull();
  });

  it('returns null when trialEnd is empty string', () => {
    expect(getTrialDaysRemaining('', NOW)).toBeNull();
  });

  it('returns null when trialEnd is an unparseable string', () => {
    expect(getTrialDaysRemaining('not-a-date', NOW)).toBeNull();
  });

  // ── Positive (future) ────────────────────────────────────────────────────

  it('returns 1 when trial ends exactly 1 day (24 hours) from now', () => {
    const trialEnd = daysFrom(1, NOW); // 2026-01-11T12:00:00Z
    expect(getTrialDaysRemaining(trialEnd, NOW)).toBe(1);
  });

  it('returns 2 when trial ends exactly 2 days from now', () => {
    const trialEnd = daysFrom(2, NOW);
    expect(getTrialDaysRemaining(trialEnd, NOW)).toBe(2);
  });

  it('returns 7 when trial ends 7 days from now', () => {
    const trialEnd = daysFrom(7, NOW);
    expect(getTrialDaysRemaining(trialEnd, NOW)).toBe(7);
  });

  it('returns 0 when trial ends 23 hours from now (same day, floor rounds down)', () => {
    const trialEnd = new Date(NOW.getTime() + 23 * 60 * 60 * 1000).toISOString();
    expect(getTrialDaysRemaining(trialEnd, NOW)).toBe(0);
  });

  it('returns 0 when trial ends exactly at now (0 ms remaining)', () => {
    expect(getTrialDaysRemaining(NOW.toISOString(), NOW)).toBe(0);
  });

  // ── Zero / same day ──────────────────────────────────────────────────────

  it('returns 0 when trial ends 1 second in the future', () => {
    const trialEnd = new Date(NOW.getTime() + 1000).toISOString();
    expect(getTrialDaysRemaining(trialEnd, NOW)).toBe(0);
  });

  // ── Negative (past) ──────────────────────────────────────────────────────

  it('returns -1 when trial ended 1 day ago', () => {
    const trialEnd = daysFrom(-1, NOW);
    expect(getTrialDaysRemaining(trialEnd, NOW)).toBe(-1);
  });

  it('returns -7 when trial ended 7 days ago', () => {
    const trialEnd = daysFrom(-7, NOW);
    expect(getTrialDaysRemaining(trialEnd, NOW)).toBe(-7);
  });

  // ── Default now parameter ────────────────────────────────────────────────

  it('uses the real current time when now is omitted', () => {
    // A trial ending far in the future should always be positive.
    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    expect(getTrialDaysRemaining(farFuture)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// shouldShowTrialWarning
// ---------------------------------------------------------------------------

describe('shouldShowTrialWarning', () => {
  it('returns false when trialEnd is null', () => {
    expect(shouldShowTrialWarning(null, NOW)).toBe(false);
  });

  it('returns false when trialEnd is undefined', () => {
    expect(shouldShowTrialWarning(undefined, NOW)).toBe(false);
  });

  it('returns false when trial ends more than 2 days from now (3 days)', () => {
    expect(shouldShowTrialWarning(daysFrom(3, NOW), NOW)).toBe(false);
  });

  it('returns false when trial ends exactly 3 days from now', () => {
    const trialEnd = daysFrom(3, NOW);
    expect(shouldShowTrialWarning(trialEnd, NOW)).toBe(false);
  });

  // ── Warning window: 0–2 days ─────────────────────────────────────────────

  it('returns true when trial ends in exactly 2 days', () => {
    expect(shouldShowTrialWarning(daysFrom(2, NOW), NOW)).toBe(true);
  });

  it('returns true when trial ends in exactly 1 day', () => {
    expect(shouldShowTrialWarning(daysFrom(1, NOW), NOW)).toBe(true);
  });

  it('returns true when trial ends today (0 days remaining)', () => {
    const trialEnd = new Date(NOW.getTime() + 60 * 1000).toISOString(); // 1 min away
    expect(shouldShowTrialWarning(trialEnd, NOW)).toBe(true);
  });

  // ── Already expired ───────────────────────────────────────────────────────

  it('returns false when trial ended 1 day ago', () => {
    expect(shouldShowTrialWarning(daysFrom(-1, NOW), NOW)).toBe(false);
  });

  it('returns false when trial ended 7 days ago', () => {
    expect(shouldShowTrialWarning(daysFrom(-7, NOW), NOW)).toBe(false);
  });
});
