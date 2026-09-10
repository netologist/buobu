"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS, DEFAULT_CURRENCY } from "@/lib/constants";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "TRY" | "JPY" | "CHF";

export const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = [
	{ value: "USD", label: "USD ($)" },
	{ value: "EUR", label: "EUR (€)" },
	{ value: "GBP", label: "GBP (£)" },
	{ value: "TRY", label: "TRY (₺)" },
	{ value: "JPY", label: "JPY (¥)" },
	{ value: "CHF", label: "CHF (Fr)" },
];

function isValidCurrency(v: unknown): v is CurrencyCode {
	return CURRENCY_OPTIONS.some((c) => c.value === v);
}

interface DefaultCurrencyState {
	currency: CurrencyCode;
	setCurrency: (currency: CurrencyCode) => void;
	reset: () => void;
}

/**
 * Per-user default currency for new swimlanes.
 * Persisted to localStorage so the choice survives reloads.
 * Defaults to GBP (£).
 */
export const useDefaultCurrencyStore = create<DefaultCurrencyState>()(
	persist(
		(set) => ({
			currency: DEFAULT_CURRENCY as CurrencyCode,
			setCurrency: (currency: CurrencyCode) => set({ currency }),
			reset: () => set({ currency: DEFAULT_CURRENCY as CurrencyCode }),
		}),
		{
			name: STORAGE_KEYS.DEFAULT_CURRENCY,
			partialize: (s) => ({ currency: s.currency }),
			onRehydrateStorage: () => (state) => {
				if (state && !isValidCurrency(state.currency)) {
					state.currency = DEFAULT_CURRENCY as CurrencyCode;
				}
			},
		},
	),
);
