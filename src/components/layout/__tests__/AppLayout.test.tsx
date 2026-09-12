import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
	usePathname: () => "/kanban",
	useSearchParams: () => new URLSearchParams(),
}));

const selectionDerived = vi.hoisted(() => ({
	isAllSelected: false,
	isSwimlaneSelected: vi.fn().mockReturnValue(false),
	primaryBoardId: null as string | null,
	selectedSwimlaneIds: new Set<string>(),
	selectedBoardIds: new Set<string>(),
	hasSelections: false,
	isBoardSelected: vi.fn().mockReturnValue(false),
	selections: [] as string[],
}));

vi.mock("@/stores/swimlane-selection-store", () => ({
	useSwimlaneSelectionDerived: () => selectionDerived,
	useSwimlaneSelectionStore: () => ({
		selectBoard: vi.fn(),
		toggleSwimlane: vi.fn(),
		selectAll: vi.fn(),
		clearSelection: vi.fn(),
		selections: selectionDerived.selections,
	}),
	filterSwimlanes: (s: unknown[]) => s,
}));

const archiveViewState = vi.hoisted(() => ({
	target: null as string | null,
	exit: vi.fn(),
}));

vi.mock("@/stores/archive-view-store", () => ({
	useArchiveViewStore: (selector: (s: typeof archiveViewState) => unknown) =>
		selector(archiveViewState),
}));

vi.mock("@/stores/board-store", () => ({
	useBoardStore: (selector: (s: { boards: []; swimlanes: [] }) => unknown) =>
		selector({ boards: [], swimlanes: [] }),
}));

vi.mock("@/lib/naming", () => ({
	DEFAULT_NAMING: { task: "Task", habit: "Habit", note: "Note" },
}));

// Mock sub-components that use complex hooks/stores internally
vi.mock("@/components/kanban/AppHeader", () => ({
	AppHeader: ({ children }: { children?: React.ReactNode }) =>
		React.createElement(
			"div",
			{ "data-testid": "app-header" },
			children ?? null,
		),
}));

vi.mock("@/components/ui/swimlane-dialog", () => ({
	SwimlaneDialog: () => null,
}));

vi.mock("@/components/ui/board-modal", () => ({
	BoardModal: () => null,
}));


vi.mock("@/components/layout/CompactNavigation", () => ({
	CompactNavigation: () => null,
}));

vi.mock("@/components/layout/AppsBar", () => ({
	AppsBar: () => React.createElement("div", { "data-testid": "apps-bar" }),
}));

vi.mock("@/contexts/NamingContext", () => ({
	NamingProvider: ({ children }: { children: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
}));

import { AppLayout } from "../AppLayout";
import { makeBoard, makeSwimlane } from "@/test/factories";
import type { SidebarConfig } from "../AppLayout";
import { useEntitlementsStore } from "@/stores/entitlements-store";

function makeSidebarConfig(overrides?: Partial<SidebarConfig>): SidebarConfig {
	return {
		boards: [],
		swimlanes: [],
		...overrides,
	};
}

describe("AppLayout — rendering", () => {
	beforeEach(() => {
		selectionDerived.primaryBoardId = null;
		archiveViewState.target = null;
		useEntitlementsStore.setState({ trialEnd: null });
	});

	it("renders middle panel content", () => {
		render(
			<AppLayout
				sidebarConfig={makeSidebarConfig()}
				middlePanel={<div data-testid="middle">Middle Content</div>}
				rightPanel={<div data-testid="right">Right Content</div>}
			/>,
		);
		expect(screen.getByTestId("middle")).toBeDefined();
	});

	it("renders the apps bar", () => {
		render(
			<AppLayout
				sidebarConfig={makeSidebarConfig()}
				middlePanel={<div />}
				rightPanel={<div />}
			/>,
		);
		expect(screen.getByTestId("apps-bar")).toBeDefined();
	});

	it("renders right panel content", () => {
		render(
			<AppLayout
				sidebarConfig={makeSidebarConfig()}
				middlePanel={<div>Middle</div>}
				rightPanel={<div data-testid="right">Right Content</div>}
			/>,
		);
		expect(screen.getByTestId("right")).toBeDefined();
	});

	it("renders without crashing with boards in sidebar config", () => {
		const board = makeBoard({ name: "My Board" });
		expect(() =>
			render(
				<AppLayout
					sidebarConfig={makeSidebarConfig({ boards: [board], swimlanes: [] })}
					middlePanel={<div />}
					rightPanel={<div />}
				/>,
			),
		).not.toThrow();
	});

	it("renders without crashing with swimlanes in sidebar config", () => {
		const board = makeBoard();
		const swimlane = makeSwimlane({ boardId: board.id, name: "Sprint 1" });
		selectionDerived.primaryBoardId = board.id;
		expect(() =>
			render(
				<AppLayout
					sidebarConfig={makeSidebarConfig({
						boards: [board],
						swimlanes: [swimlane],
					})}
					middlePanel={<div />}
					rightPanel={<div />}
				/>,
			),
		).not.toThrow();
	});
});

describe("AppLayout — board navigation", () => {
	it("renders without crashing with multiple boards", () => {
		const board1 = makeBoard({ name: "Board One" });
		const board2 = makeBoard({ name: "Board Two" });

		expect(() =>
			render(
				<AppLayout
					sidebarConfig={makeSidebarConfig({
						boards: [board1, board2],
						swimlanes: [],
					})}
					middlePanel={<div />}
					rightPanel={<div />}
				/>,
			),
		).not.toThrow();
	});

	it("renders without crashing with boards available", () => {
		const board = makeBoard();
		expect(() =>
			render(
				<AppLayout
					sidebarConfig={makeSidebarConfig({ boards: [board], swimlanes: [] })}
					middlePanel={<div />}
					rightPanel={<div />}
				/>,
			),
		).not.toThrow();
	});
});

describe("AppLayout — archive mode", () => {
	it("renders without crashing when archive mode is active", () => {
		archiveViewState.target = "board-1";
		expect(() =>
			render(
				<AppLayout
					sidebarConfig={makeSidebarConfig()}
					middlePanel={<div />}
					rightPanel={<div />}
				/>,
			),
		).not.toThrow();
	});

	it("does not show archive banner when archiveTarget is null", () => {
		archiveViewState.target = null;
		render(
			<AppLayout
				sidebarConfig={makeSidebarConfig()}
				middlePanel={<div />}
				rightPanel={<div />}
			/>,
		);
		expect(screen.queryByText(/exit archive/i)).toBeNull();
	});
});

describe("AppLayout — trial expiry banner", () => {
	it("renders trial expiry warning when trial is expiring within 2 days", () => {
		const oneDayFromNow = new Date(Date.now() + 86_400_000).toISOString();
		useEntitlementsStore.setState({ trialEnd: oneDayFromNow });
		render(
			<AppLayout
				sidebarConfig={makeSidebarConfig()}
				middlePanel={<div />}
				rightPanel={<div />}
			/>,
		);
		expect(screen.getByRole("alert")).toBeInTheDocument();
		expect(screen.getByText(/Your trial ends/i)).toBeInTheDocument();
	});
});

