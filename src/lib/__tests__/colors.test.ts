// src/lib/__tests__/colors.test.ts
import { describe, it, expect } from "vitest";
import {
	pickDistinctColor,
	colorDistanceHex,
	DEFAULT_SWIMLANE_COLOR,
} from "../colors";

const HEX = /^#[0-9a-f]{6}$/i;

/** Minimum perceptual distance (Delta-E) we consider "visually distinct". */
function minDistanceTo(picked: string, used: string[]): number {
	return Math.min(...used.map((u) => colorDistanceHex(picked, u) ?? Infinity));
}

describe("pickDistinctColor", () => {
	it("returns the default color when nothing is used", () => {
		expect(pickDistinctColor([])).toBe(DEFAULT_SWIMLANE_COLOR);
		expect(pickDistinctColor()).toBe(DEFAULT_SWIMLANE_COLOR);
	});

	it("returns the default color when all inputs are invalid", () => {
		expect(pickDistinctColor(["nope", "", "#xyz", "12345"])).toBe(
			DEFAULT_SWIMLANE_COLOR,
		);
	});

	it("always returns a valid 6-digit hex color", () => {
		expect(pickDistinctColor(["#ff0000", "#00ff00"])).toMatch(HEX);
	});

	it("picks a color far from a single used color", () => {
		const used = ["#6366F1"]; // indigo (the app default)
		const picked = pickDistinctColor(used);
		expect(picked).not.toBe(used[0]);
		expect(minDistanceTo(picked, used)).toBeGreaterThanOrEqual(30);
	});

	it("picks a color far from multiple used colors", () => {
		const used = ["#EF4444", "#3B82F6"]; // red, blue
		const picked = pickDistinctColor(used);
		expect(used).not.toContain(picked);
		expect(minDistanceTo(picked, used)).toBeGreaterThanOrEqual(20);
	});

	it("tolerates a mix of valid and invalid entries", () => {
		const picked = pickDistinctColor(["#EF4444", "garbage", "", "#3B82F6"]);
		expect(picked).toMatch(HEX);
		expect(
			minDistanceTo(picked, ["#EF4444", "#3B82F6"]),
		).toBeGreaterThanOrEqual(20);
	});

	it("is deterministic (same input → same output)", () => {
		const used = ["#10B981", "#F59E0B", "#8B5CF6"];
		expect(pickDistinctColor(used)).toBe(pickDistinctColor(used));
	});

	it("keeps dispersing as colors accumulate", () => {
		const used = ["#6366F1"];
		const first = pickDistinctColor(used);
		const second = pickDistinctColor([...used, first]);
		expect(second).not.toBe(first);
		expect(second).not.toBe(used[0]);
		// Still reasonably distinct from everything chosen so far.
		expect(minDistanceTo(second, [...used, first])).toBeGreaterThanOrEqual(15);
	});
});

describe("colorDistanceHex", () => {
	it("is symmetric", () => {
		const d1 = colorDistanceHex("#ff0000", "#00ff00");
		const d2 = colorDistanceHex("#00ff00", "#ff0000");
		expect(d1).not.toBeNull();
		expect(d2).not.toBeNull();
		// The metric is symmetric → identical values.
		expect(d1).toBe(d2);
	});

	it("is ~0 for identical colors", () => {
		expect(colorDistanceHex("#abcdef", "#abcdef")).toBeCloseTo(0, 5);
	});

	it("returns null for invalid input", () => {
		expect(colorDistanceHex("nope", "#ff0000")).toBeNull();
		expect(colorDistanceHex("#ff0000", "")).toBeNull();
	});

	it("accepts 3-digit hex shorthand", () => {
		expect(colorDistanceHex("#fff", "#ffffff")).toBeCloseTo(0, 5);
	});
});
