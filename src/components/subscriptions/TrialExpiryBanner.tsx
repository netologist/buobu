"use client";

/**
 * TrialExpiryBanner (M7 — Polish)
 *
 * Shows a dismissible amber banner when the user's trial ends within 2 days.
 *
 * Usage:
 *   <TrialExpiryBanner trialEnd={trialEnd} />
 *
 * The banner is hidden when:
 *   - trialEnd is null / undefined (not on a trial).
 *   - trialEnd is more than 2 days away.
 *   - trialEnd has already passed (the subscription is then expired / downgraded
 *     by the webhook — no redundant warning needed here).
 *   - The user has manually dismissed it for this browser session (localStorage).
 */

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shouldShowTrialWarning, getTrialDaysRemaining } from "@/lib/subscriptions/trial-warning";
import { startCheckout } from "@/lib/subscriptions/checkout";

const YEARLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_YEARLY ?? "";
const DISMISS_KEY = "buobu_trial_banner_dismissed";

interface TrialExpiryBannerProps {
  trialEnd: string | null | undefined;
}

export function TrialExpiryBanner({ trialEnd }: TrialExpiryBannerProps) {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISS_KEY) === "1";
  });
  const [loading, setLoading] = useState(false);

  if (!shouldShowTrialWarning(trialEnd) || dismissed) return null;

  const days = getTrialDaysRemaining(trialEnd)!;
  const label =
    days === 0
      ? "Your trial ends today."
      : days === 1
        ? "Your trial ends tomorrow."
        : `Your trial ends in ${days} days.`;

  function handleDismiss() {
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISS_KEY, "1");
    }
    setDismissed(true);
  }

  async function handleUpgrade() {
    setLoading(true);
    try {
      await startCheckout(YEARLY_PRICE_ID);
    } catch {
      setLoading(false);
    }
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        <span>{label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="default"
          className="h-7 px-3 text-xs"
          onClick={handleUpgrade}
          disabled={loading}
          aria-label="Upgrade to Plus"
        >
          {loading ? "Redirecting…" : "Upgrade to Plus"}
        </Button>
        <button
          type="button"
          aria-label="Dismiss trial expiry warning"
          className="rounded p-0.5 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
