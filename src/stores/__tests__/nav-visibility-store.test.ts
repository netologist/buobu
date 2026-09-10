// src/stores/__tests__/nav-visibility-store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { STORAGE_KEYS } from "@/lib/constants";
import { getTaskViews } from "@/lib/navigation/nav-visibility";
import { useNavVisibilityStore } from "../nav-visibility-store";

describe("useNavVisibilityStore", () => {
	beforeEach(() => {
		localStorage.clear();
		useNavVisibilityStore.setState({
			hiddenAppIds: [],
			hiddenTaskViewIds: [],
		});
	});

	it("toggles app visibility on and off", () => {
		useNavVisibilityStore.getState().setAppHidden("notes", true);
		expect(useNavVisibilityStore.getState().hiddenAppIds).toContain("notes");

		useNavVisibilityStore.getState().setAppHidden("notes", false);
		expect(useNavVisibilityStore.getState().hiddenAppIds).not.toContain(
			"notes",
		);
	});

	it("is idempotent when hiding the same app twice", () => {
		useNavVisibilityStore.getState().setAppHidden("notes", true);
		useNavVisibilityStore.getState().setAppHidden("notes", true);
		expect(
			useNavVisibilityStore
				.getState()
				.hiddenAppIds.filter((x) => x === "notes"),
		).toHaveLength(1);
	});

	it("prevents hiding the last visible task view", () => {
		// Hide every view except the first (kanban).
		const allButFirst = getTaskViews()
			.slice(1)
			.map((v) => v.id);
		for (const id of allButFirst) {
			useNavVisibilityStore.getState().setTaskViewHidden(id, true);
		}
		// Now only kanban is visible; attempting to hide it must be refused.
		useNavVisibilityStore.getState().setTaskViewHidden("tasks-kanban", true);
		expect(useNavVisibilityStore.getState().hiddenTaskViewIds).not.toContain(
			"tasks-kanban",
		);
	});

	it("persists to the NAV_VISIBILITY localStorage key", () => {
		useNavVisibilityStore.getState().setAppHidden("habits", true);
		const raw = localStorage.getItem(STORAGE_KEYS.NAV_VISIBILITY);
		expect(raw).toBeTruthy();
		let parsed: { state?: { hiddenAppIds?: string[] } };
		try {
			parsed = JSON.parse(raw!);
		} catch {
			throw new Error("persisted nav visibility should be valid JSON");
		}
		expect(parsed.state?.hiddenAppIds).toContain("habits");
	});

	it("reset clears all hidden ids", () => {
		useNavVisibilityStore.getState().setAppHidden("notes", true);
		useNavVisibilityStore.getState().setTaskViewHidden("tasks-cash", true);
		useNavVisibilityStore.getState().reset();
		expect(useNavVisibilityStore.getState().hiddenAppIds).toEqual([]);
		expect(useNavVisibilityStore.getState().hiddenTaskViewIds).toEqual([]);
	});
});
