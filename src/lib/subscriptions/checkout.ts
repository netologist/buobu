"use client";

import { supabase } from "@/lib/supabase";
import { STORAGE_KEYS } from "@/lib/constants";

/**
 * Redirects the user to a Stripe Checkout session for the given price ID.
 * Pre-fills any pending promotion code stored in localStorage.
 */
export async function startCheckout(priceId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const pendingPromo =
    typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEYS.PENDING_PROMO)
      : undefined;

  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      priceId,
      ...(pendingPromo ? { promotionCode: pendingPromo } : {}),
    }),
  });

  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(error ?? "Checkout failed");
  }

  const { url } = (await res.json()) as { url: string };
  if (url) window.location.href = url;
}
