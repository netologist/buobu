"use client";

import { useState } from "react";
import {
  Loader2,
  Sparkles,
  CreditCard,
  Crown,
  Star,
  Clock,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEntitlements } from "@/stores/entitlements-store";
import { startCheckout } from "@/lib/subscriptions/checkout";
import { BILLING_ENABLED } from "@/lib/feature-flags";
import { supabase } from "@/lib/supabase";

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function openPortal(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch("/api/stripe/portal", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
  });

  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(error ?? "Could not open billing portal");
  }

  const { url } = (await res.json()) as { url: string };
  if (url) window.location.href = url;
}

// -----------------------------------------------------------------------
// Plan badge
// -----------------------------------------------------------------------

function PlanBadge({ cohort, isPlus }: { cohort: string; isPlus: boolean }) {
  if (cohort === "founder") {
    return (
      <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
        <Crown className="h-3 w-3" />
        Founder
      </Badge>
    );
  }
  if (cohort === "early") {
    return (
      <Badge className="gap-1 bg-violet-600 text-white hover:bg-violet-600">
        <Star className="h-3 w-3" />
        Early Access
      </Badge>
    );
  }
  if (isPlus) {
    return (
      <Badge className="gap-1 bg-blue-600 text-white hover:bg-blue-600">
        <Sparkles className="h-3 w-3" />
        Plus
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      Free
    </Badge>
  );
}

// -----------------------------------------------------------------------
// Price selector shown when upgrading
// -----------------------------------------------------------------------

const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_MONTHLY ?? "";
const YEARLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_YEARLY ?? "";

function PriceSelector({
  onSelect,
  loading,
}: {
  onSelect: (priceId: string) => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-2">
      <Button
        variant="default"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={() => onSelect(YEARLY_PRICE_ID)}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Yearly — best value (≈2 months free)
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={() => onSelect(MONTHLY_PRICE_ID)}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Monthly
      </Button>
      <p className="text-xs text-muted-foreground">
        Starts with a 7-day free trial. Cancel anytime.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------

export function BillingSection() {
  const {
    isPlus,
    status,
    trialEnd,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    cohort,
    isLoading,
  } = useEntitlements();

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPricePicker, setShowPricePicker] = useState(false);

  // Billing is disabled — all users already have Plus access via the
  // entitlements store; no UI needed.
  if (!BILLING_ENABLED) return null;

  async function handleUpgrade(priceId: string) {
    if (!priceId) {
      setError("Pricing is not configured. Please contact support.");
      return;
    }
    setCheckoutLoading(true);
    setError(null);
    try {
      await startCheckout(priceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setCheckoutLoading(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    setError(null);
    try {
      await openPortal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing portal");
      setPortalLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading plan info…
      </div>
    );
  }

  const isTrialing = status === "trialing";
  const isPastDue = status === "past_due";

  return (
    <div className="space-y-4">
      {/* ── Current plan row ── */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            {isPlus ? "Buobu Plus" : "Free plan"}
          </p>
          {isTrialing && trialEnd && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Trial ends {formatDate(trialEnd)}
            </p>
          )}
          {isPlus && !isTrialing && currentPeriodEnd && (
            <p className="text-xs text-muted-foreground">
              {cancelAtPeriodEnd
                ? `Cancels ${formatDate(currentPeriodEnd)}`
                : `Renews ${formatDate(currentPeriodEnd)}`}
            </p>
          )}
        </div>
        <PlanBadge cohort={cohort} isPlus={isPlus} />
      </div>

      {/* ── Past due warning ── */}
      {isPastDue && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Your last payment failed. Update your payment method to keep Plus access.
          </span>
        </div>
      )}

      {/* ── Cancel-at-period-end warning ── */}
      {isPlus && cancelAtPeriodEnd && !isPastDue && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Your subscription is set to cancel at the end of the billing period.
            Reactivate in the billing portal to keep Plus access.
          </span>
        </div>
      )}

      {/* ── Cohort discount permanence warning ── */}
      {(cohort === "founder" || cohort === "early") && cancelAtPeriodEnd && (
        <p className="text-xs text-muted-foreground">
          Your {cohort === "founder" ? "Founder" : "Early Access"} pricing will be
          lost permanently if the subscription fully lapses.
        </p>
      )}

      {/* ── Free: upgrade CTA ── */}
      {!isPlus && !showPricePicker && (
        <Button
          variant="default"
          size="sm"
          className="w-full gap-2"
          onClick={() => setShowPricePicker(true)}
          disabled={checkoutLoading}
        >
          <Sparkles className="h-4 w-4" />
          Upgrade to Plus
        </Button>
      )}

      {!isPlus && showPricePicker && (
        <PriceSelector onSelect={handleUpgrade} loading={checkoutLoading} />
      )}

      {/* ── Plus: manage billing ── */}
      {isPlus && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={handleManageBilling}
          disabled={portalLoading}
        >
          {portalLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          Manage Billing
          <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
        </Button>
      )}

      {/* ── Plan features ── */}
      {!isPlus && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
          <p className="text-xs font-medium">Plus includes:</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-blue-500" />
              Cloud sync across all devices
            </li>
            <li className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-blue-500" />
              Unlimited boards, habits, routines
            </li>
            <li className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-blue-500" />
              API keys &amp; MCP integration
            </li>
          </ul>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
