// src/stores/__tests__/apps-bar-store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useAppsBarStore } from "../apps-bar-store";

beforeEach(() => {
	useAppsBarStore.setState({ isOpen: true });
	localStorage.clear();
});

describe("useAppsBarStore", () => {
	describe("initial state", () => {
		it("isOpen defaults to true", () => {
			expect(useAppsBarStore.getState().isOpen).toBe(true);
		});
	});

	describe("toggle", () => {
		it("flips isOpen from true to false", () => {
			useAppsBarStore.getState().toggle();
			expect(useAppsBarStore.getState().isOpen).toBe(false);
		});

		it("flips isOpen back to true on second call", () => {
			useAppsBarStore.getState().toggle();
			useAppsBarStore.getState().toggle();
			expect(useAppsBarStore.getState().isOpen).toBe(true);
		});
	});

	describe("persistence", () => {
		it("writes isOpen to localStorage under goals-apps-bar", () => {
			useAppsBarStore.getState().toggle(); // → false
			const stored = JSON.parse(localStorage.getItem("goals-apps-bar") ?? "{}");
			expect(stored.state.isOpen).toBe(false);
		});
	});
});
