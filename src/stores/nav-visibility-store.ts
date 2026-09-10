"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/lib/constants";
import {
	DEFAULT_NAV_VISIBILITY,
	canHideTaskView,
	type NavVisibility,
} from "@/lib/navigation/nav-visibility";

type NavVisibilityStore = NavVisibility & {
	setAppHidden: (id: string, hidden: boolean) => void;
	setTaskViewHidden: (id: string, hidden: boolean) => void;
	reset: () => void;
};

/**
 * Per-user navigation visibility. Persisted to localStorage so the choice
 * survives reloads. Hiding is visibility-only; the store guards against
 * hiding the last remaining task view.
 */
export const useNavVisibilityStore = create<NavVisibilityStore>()(
	persist(
		(set, get) => ({
			...DEFAULT_NAV_VISIBILITY,
			setAppHidden: (id, hidden) =>
				set((s) => ({
					hiddenAppIds: hidden
						? Array.from(new Set([...s.hiddenAppIds, id]))
						: s.hiddenAppIds.filter((x) => x !== id),
				})),
			setTaskViewHidden: (id, hidden) => {
				// Guard: never allow hiding the last visible task view.
				if (hidden && !canHideTaskView(get().hiddenTaskViewIds)) return;
				set((s) => ({
					hiddenTaskViewIds: hidden
						? Array.from(new Set([...s.hiddenTaskViewIds, id]))
						: s.hiddenTaskViewIds.filter((x) => x !== id),
				}));
			},
			reset: () => set({ ...DEFAULT_NAV_VISIBILITY }),
		}),
		{
			name: STORAGE_KEYS.NAV_VISIBILITY,
			partialize: (s) => ({
				hiddenAppIds: s.hiddenAppIds,
				hiddenTaskViewIds: s.hiddenTaskViewIds,
			}),
		},
	),
);
