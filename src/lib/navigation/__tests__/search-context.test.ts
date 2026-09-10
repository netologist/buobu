import { describe, expect, it } from "vitest";

import {
	buildSearchContextLabel,
	clearSearchScopedFilters,
	isSearchContextActive,
} from "@/lib/navigation/search-context";

describe("search-context helpers", () => {
	it("detects active search context from query params", () => {
		expect(isSearchContextActive(new URLSearchParams("_gs=1"))).toBe(true);
		expect(isSearchContextActive(new URLSearchParams("_gs=0"))).toBe(false);
		expect(isSearchContextActive(new URLSearchParams(""))).toBe(false);
	});

	it("clears only search-scoped filters and keeps board/unrelated params", () => {
		const params = new URLSearchParams(
			"boardId=b1&foo=bar&_gs=1&_gsType=task&_gsItem=t1&taskId=t1&swimlaneId=s1",
		);

		const cleared = clearSearchScopedFilters(params);

		expect(cleared.get("boardId")).toBe("b1");
		expect(cleared.get("foo")).toBe("bar");
		expect(cleared.get("_gs")).toBeNull();
		expect(cleared.get("taskId")).toBeNull();
		expect(cleared.get("swimlaneId")).toBeNull();
	});

	it("builds a readable label with available fields", () => {
		const label = buildSearchContextLabel(
			new URLSearchParams(
				"_gsType=task&_gsItem=t1&boardId=b1&swimlaneId=s1",
			),
		);

		expect(label).toContain("type=task");
		expect(label).toContain("id=t1");
		expect(label).toContain("board=b1");
		expect(label).toContain("swimlane=s1");
	});
});