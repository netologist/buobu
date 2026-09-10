"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type AppsBarState = {
	isOpen: boolean;
	toggle: () => void;
};

export const useAppsBarStore = create<AppsBarState>()(
	persist(
		(set) => ({
			isOpen: true,
			toggle: () => set((state) => ({ isOpen: !state.isOpen })),
		}),
		{
			name: "goals-apps-bar",
			partialize: (state) => ({ isOpen: state.isOpen }),
		},
	),
);
