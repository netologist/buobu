// src/lib/navigation/__tests__/app-nav-items.test.ts
import { describe, it, expect } from "vitest";
import { APP_NAV_ITEMS } from "../app-nav-items";

describe("APP_NAV_ITEMS", () => {
	it("has exactly 8 items", () => {
		expect(APP_NAV_ITEMS).toHaveLength(8);
	});

	it("each item has the required shape", () => {
		for (const item of APP_NAV_ITEMS) {
			expect(item.id).toBeTruthy();
			expect(item.label).toBeTruthy();
			expect(item.icon).toBeTruthy();
			expect(item.href).toBeTruthy();
			expect(Array.isArray(item.matchPrefixes)).toBe(true);
			expect(item.matchPrefixes.length).toBeGreaterThan(0);
		}
	});

	it("lists all apps in order", () => {
		const labels = APP_NAV_ITEMS.map((i) => i.label);
		expect(labels).toEqual([
			"Tasks",
			"Routines",
			"Time Blocks",
			"Habits",
			"Notes",
			"Bookmarks",
			"Whiteboards",
			"Mindmaps",
		]);
	});

	it("Tasks item matches all task sub-routes", () => {
		const tasks = APP_NAV_ITEMS.find((i) => i.id === "tasks");
		expect(tasks?.matchPrefixes).toContain("/tasks");
	});
});
