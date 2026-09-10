"use client";

import { useState } from "react";
import { canCreate } from "@/lib/subscriptions/guards";
import type { CappedFeature } from "@/lib/subscriptions/limits";
import { useEntitlements } from "@/stores/entitlements-store";
import { BILLING_ENABLED } from "@/lib/feature-flags";

interface BlockedState {
  feature: CappedFeature;
  current: number;
  limit: number;
}

interface UseUpgradeGuardReturn {
  /**
   * Returns `true` if the create action is allowed, `false` if blocked.
   * When blocked, stores the limit info so the caller can render UpgradeDialog.
   */
  guard: (feature: CappedFeature, current: number) => boolean;
  /** Non-null when the create was blocked; pass to UpgradeDialog props. */
  blocked: BlockedState | null;
  /** Call in the UpgradeDialog's onOpenChange to dismiss. */
  dismissDialog: () => void;
}

export function useUpgradeGuard(): UseUpgradeGuardReturn {
  const { isPlus } = useEntitlements();
  const [blocked, setBlocked] = useState<BlockedState | null>(null);

  function guard(feature: CappedFeature, current: number): boolean {
    if (!BILLING_ENABLED) return true;
    const result = canCreate(feature, current, isPlus);
    if (!result.ok) {
      setBlocked({ feature, current: result.current, limit: result.limit });
      return false;
    }
    return true;
  }

  function dismissDialog() {
    setBlocked(null);
  }

  return { guard, blocked, dismissDialog };
}
