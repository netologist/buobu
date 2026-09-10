import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const nav = vi.hoisted(() => ({
	pathname: "/",
	searchParams: new URLSearchParams(),
	push: vi.fn(),
	replace: vi.fn(),
}));

const state = vi.hoisted(() => ({
	boards: [{ id: "b1", name: "Main Board", archived: false }],
	swimlanes: [{ id: "s1", name: "Inbox", boardId: "b1", archived: false }],
	tasks: [] as Array<{ id: string; title: string; boardId: string; swimlaneId: string; archived?: boolean }>,
	habits: [] as Array<{ id: string; title: string; boardId: string; swimlaneId: string; archived?: boolean }>,
	notes: [] as Array<{ id: string; title: string; boardId: string; swimlaneId: string; archived?: boolean }>,
	mindmaps: [] as Array<{ id: string; title: string; boardId: string; swimlaneId: string; archived?: boolean }>,
	bookmarks: [] as Array<{ id: string; title?: string; url: string; archived?: boolean }>,
	visionItems: [] as Array<{ id: string; title: string; archived?: boolean }>,
	timeblocks: [] as Array<{ id: string; title: string; boardId: string; swimlaneId: string; archived?: boolean }>,
	enter: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: nav.push, replace: nav.replace }),
	usePathname: () => nav.pathname,
	useSearchParams: () => nav.searchParams,
}));

vi.mock("@/components/ui/command", () => ({
	CommandDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
		(open ? React.createElement("div", null, children) : null),
	CommandList: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
	CommandEmpty: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
	CommandGroup: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
	CommandInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement("input", props),
	CommandItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) =>
		React.createElement("button", { onClick: onSelect, type: "button" }, children),
	CommandSeparator: () => React.createElement("hr"),
}));

vi.mock("@/stores/board-store", () => ({
	useBoardStore: (selector: (s: { boards: typeof state.boards; swimlanes: typeof state.swimlanes }) => unknown) =>
		selector({ boards: state.boards, swimlanes: state.swimlanes }),
}));

vi.mock("@/stores/archive-view-store", () => ({
	useArchiveViewStore: (selector: (s: { enter: typeof state.enter }) => unknown) => selector({ enter: state.enter }),
}));

vi.mock("@/stores", () => ({
	useTasks: () => state.tasks,
	useHabits: () => state.habits,
	useNotes: () => state.notes,
	useMindmaps: () => state.mindmaps,
	useBookmarks: () => state.bookmarks,
	useVisionItems: () => state.visionItems,
}));

vi.mock("@/stores/hooks/use-timeblocks", () => ({
	useAllTimeblocks: () => state.timeblocks,
}));

import { GlobalSearchPalette } from "../global-search-palette";

describe("GlobalSearchPalette", () => {
	beforeEach(() => {
		nav.pathname = "/";
		nav.searchParams = new URLSearchParams();
		nav.push.mockReset();
		nav.replace.mockReset();
		state.enter.mockReset();
		state.tasks = [];
		state.habits = [];
		state.notes = [];
		state.mindmaps = [];
		state.bookmarks = [];
		state.visionItems = [];
		state.timeblocks = [];
	});

	it("navigates task result to kanban with board, swimlane, resource and search-context params", async () => {
		state.tasks = [
			{ id: "task-1", title: "Fix auth redirect", boardId: "b1", swimlaneId: "s1", archived: false },
		];

		const user = userEvent.setup();
		render(React.createElement(GlobalSearchPalette));

		await user.type(screen.getByPlaceholderText("Search..."), "Fix auth");
		await user.click(screen.getByText("Fix auth redirect"));

		expect(nav.push).toHaveBeenCalledOnce();
		const href = String(nav.push.mock.calls[0][0]);
		expect(href.startsWith("/tasks/kanban-view?")).toBe(true);
		expect(href).toContain("_gs=1");
		expect(href).toContain("_gsType=task");
		expect(href).toContain("_gsItem=task-1");
		expect(href).toContain("boardId=b1");
		expect(href).toContain("taskId=task-1");
		expect(href).toContain("swimlaneId=s1");
	});

	it("navigates timeblock result to timeblocks page with board/swimlane context", async () => {
		state.timeblocks = [
			{ id: "tb-1", title: "Deep Work", boardId: "b1", swimlaneId: "s1", archived: false },
		];

		const user = userEvent.setup();
		render(React.createElement(GlobalSearchPalette));

		await user.type(screen.getByPlaceholderText("Search..."), "Deep");
		await user.click(screen.getByText("Deep Work"));

		expect(nav.push).toHaveBeenCalledOnce();
		const href = String(nav.push.mock.calls[0][0]);
		expect(href.startsWith("/timeblocks?")).toBe(true);
		expect(href).toContain("_gsType=timeblock");
		expect(href).toContain("timeblockId=tb-1");
		expect(href).toContain("boardId=b1");
		expect(href).toContain("swimlaneId=s1");
	});

	it("shows search-context band and reset clears only search-scoped params", async () => {
		nav.pathname = "/notes";
		nav.searchParams = new URLSearchParams(
			"boardId=b1&foo=bar&_gs=1&_gsType=task&_gsItem=task-1&taskId=task-1&swimlaneId=s1",
		);

		const user = userEvent.setup();
		render(React.createElement(GlobalSearchPalette));

		expect(screen.getByText(/Search filter:/i)).toBeDefined();
		await user.click(screen.getByRole("button", { name: "Reset" }));

		expect(nav.replace).toHaveBeenCalledOnce();
		expect(nav.replace).toHaveBeenCalledWith("/notes?boardId=b1&foo=bar");
	});
});