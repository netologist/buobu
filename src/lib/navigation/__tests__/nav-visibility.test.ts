// src/lib/navigation/__tests__/nav-visibility.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { STORAGE_KEYS } from "@/lib/constants";
import {
	resolveTaskHref,
	getVisibleApps,
	canHideTaskView,
	isHiddenTaskViewPath,
	isHiddenAppPath,
	readNavVisibility,
	getTaskViews,
} from "../nav-visibility";

describe("resolveTaskHref (adaptive default)", () => {
	it("returns the preferred href when it is visible", () => {
		expect(resolveTaskHref("/tasks/kanban-view", [])).toBe(
			"/tasks/kanban-view",
		);
	});

	it("falls back to the first visible view when preferred is hidden", () => {
		// hide kanban → first visible is list
		expect(resolveTaskHref("/tasks/kanban-view", ["tasks-kanban"])).toBe(
			"/tasks/list-view",
		);
	});

	it("falls back past multiple hidden views in canonical order", () => {
		// hide kanban + list → first visible is calendar
		expect(
			resolveTaskHref("/tasks/kanban-view", ["tasks-kanban", "tasks-list"]),
		).toBe("/tasks/calendar-view");
	});

	it("keeps a non-preferred but visible href", () => {
		expect(resolveTaskHref("/tasks/cash-flow-view", ["tasks-kanban"])).toBe(
			"/tasks/cash-flow-view",
		);
	});
});

describe("canHideTaskView", () => {
	it("allows hiding while more than one view is visible", () => {
		expect(canHideTaskView([])).toBe(true);
	});

	it("forbids hiding the last visible view", () => {
		const allButOne = getTaskViews()
			.slice(1)
			.map((v) => v.id);
		expect(canHideTaskView(allButOne)).toBe(false);
	});
});

describe("getVisibleApps", () => {
	it("keeps Tasks even when asked to hide it", () => {
		const visible = getVisibleApps(["tasks", "notes"]);
		const ids = visible.map((a) => a.id);
		expect(ids).toContain("tasks");
		expect(ids).not.toContain("notes");
	});
});

describe("path helpers", () => {
	it("isHiddenTaskViewPath detects hidden task routes", () => {
		expect(isHiddenTaskViewPath("/tasks/kanban-view", ["tasks-kanban"])).toBe(
			true,
		);
		expect(isHiddenTaskViewPath("/tasks/list-view", ["tasks-kanban"])).toBe(
			false,
		);
	});

	it("isHiddenAppPath never flags the Tasks section as hidden", () => {
		expect(isHiddenAppPath("/tasks/kanban-view", ["tasks"])).toBe(false);
	});

	it("isHiddenAppPath detects other hidden app sections", () => {
		expect(isHiddenAppPath("/notes/abc", ["notes"])).toBe(true);
		expect(isHiddenAppPath("/notes", ["notes"])).toBe(true);
		expect(isHiddenAppPath("/habits", ["notes"])).toBe(false);
	});
});

describe("readNavVisibility", () => {
	beforeEach(() => window.localStorage.clear());

	it("returns defaults when nothing is stored", () => {
		expect(readNavVisibility()).toEqual({
			hiddenAppIds: [],
			hiddenTaskViewIds: [],
		});
	});

	it("parses the persisted zustand shape", () => {
		window.localStorage.setItem(
			STORAGE_KEYS.NAV_VISIBILITY,
			JSON.stringify({
				state: { hiddenAppIds: ["notes"], hiddenTaskViewIds: ["tasks-cash"] },
				version: 0,
			}),
		);
		expect(readNavVisibility()).toEqual({
			hiddenAppIds: ["notes"],
			hiddenTaskViewIds: ["tasks-cash"],
		});
	});

	it("returns defaults on corrupt JSON", () => {
		window.localStorage.setItem(STORAGE_KEYS.NAV_VISIBILITY, "{not json");
		expect(readNavVisibility()).toEqual({
			hiddenAppIds: [],
			hiddenTaskViewIds: [],
		});
	});
});
