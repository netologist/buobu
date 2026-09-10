/**
 * Trial-expiry warning utilities (M7 — Polish).
 *
 * getTrialDaysRemaining returns the number of whole days until trial_end,
 * or null when the user is not on a trial.
 *
 * Positive values mean the trial is still active (e.g. 2 → "2 days left").
 * 0 means the trial ends today (same calendar day in UTC).
 * Negative values mean the trial has already ended.
 */

/**
 * Returns whole days remaining until `trialEnd`, or `null` if `trialEnd` is
 * falsy (not on a trial).
 *
 * Computation:
 *   daysRemaining = floor((trialEndMs - nowMs) / MS_PER_DAY)
 *
 * This intentionally uses floor (not ceil) so that a trial expiring in, say,
 * 23 hours returns 0 — "trial ends today" — and a trial expiring in 25 hours
 * returns 1.
 *
 * @param trialEnd  ISO-8601 timestamp string, or `null` / `undefined`.
 * @param now       Current time as a Date — injectable for testing. Defaults
 *                  to `new Date()`.
 */
export function getTrialDaysRemaining(
  trialEnd: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!trialEnd) return null;

  const endMs = new Date(trialEnd).getTime();
  if (Number.isNaN(endMs)) return null;

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.floor((endMs - now.getTime()) / MS_PER_DAY);
}

/**
 * Returns true when a trial-expiry warning should be shown to the user.
 *
 * The plan specifies warnings at 2 days and 1 day before end.
 * We show the banner for the entire window where daysRemaining is 0, 1, or 2.
 */
export function shouldShowTrialWarning(
  trialEnd: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const days = getTrialDaysRemaining(trialEnd, now);
  if (days === null) return false;
  return days >= 0 && days <= 2;
}
