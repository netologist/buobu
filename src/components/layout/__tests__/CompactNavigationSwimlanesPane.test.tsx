import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import type { Board, Swimlane } from "@/lib/types";
import {
  filterAndRankSwimlanes,
  CompactNavigationSwimlanesPane,
} from "@/components/layout/CompactNavigationSwimlanesPane";

const boards: Board[] = [
  { id: "b1", name: "Personal", columns: [] },
  { id: "b2", name: "Work", columns: [] },
];

const lanes: Swimlane[] = [
  { id: "s1", boardId: "b1", name: "Health", currency: "USD" },
  { id: "s2", boardId: "b1", name: "Learning", label: "Edu", currency: "USD" },
  { id: "s3", boardId: "b2", name: "Work Focus", currency: "USD" },
  { id: "s4", boardId: "b2", name: "Workout", label: "Fit", currency: "USD" },
  {
    id: "s5",
    boardId: "b2",
    name: "Deep Work",
    label: "WORK",
    currency: "USD",
  },
];

describe("filterAndRankSwimlanes", () => {
  it("returns empty array for empty query", () => {
    expect(filterAndRankSwimlanes(lanes, boards, "", new Set())).toEqual([]);
  });

  it("returns empty array for whitespace-only query", () => {
    expect(filterAndRankSwimlanes(lanes, boards, "   ", new Set())).toEqual([]);
  });

  it("matches by name case-insensitively", () => {
    const result = filterAndRankSwimlanes(lanes, boards, "WORK", new Set());
    // s3 (name "Work Focus"), s4 (name "Workout"), s5 (label "WORK") all match
    expect(result.map((s) => s.id).sort()).toEqual(["s3", "s4", "s5"]);
  });

  it("matches by label case-insensitively", () => {
    const result = filterAndRankSwimlanes(lanes, boards, "edu", new Set());
    expect(result.map((s) => s.id)).toEqual(["s2"]);
  });

  it("excludes swimlanes without a boardId", () => {
    const orphan: Swimlane = { id: "sx", name: "Orphan", currency: "USD" };
    const result = filterAndRankSwimlanes(
      [...lanes, orphan],
      boards,
      "orphan",
      new Set(),
    );
    expect(result.map((s) => s.id)).toEqual([]);
  });

  it("includes both active and archived swimlanes (no status filter)", () => {
    const archived: Swimlane = {
      id: "s6",
      boardId: "b1",
      name: "Old Health",
      currency: "USD",
      archived: true,
    };
    const result = filterAndRankSwimlanes(
      [...lanes, archived],
      boards,
      "health",
      new Set(),
    );
    expect(result.map((s) => s.id).sort()).toEqual(["s1", "s6"]);
  });

  it("ranks selected swimlanes first, then by parent board name, then by swimlane name", () => {
    const selected = new Set(["s4"]);
    const result = filterAndRankSwimlanes(lanes, boards, "work", selected);
    // Matches: s3 (Work Focus, Work), s4 (Workout, Work), s5 (Deep Work, label WORK, Work)
    // Selected first: s4
    // Remaining (s3, s5) are both in "Work" board — sort by name asc.
    // "Deep Work" (D) < "Work Focus" (W) alphabetically, so s5 comes before s3.
    expect(result.map((s) => s.id)).toEqual(["s4", "s5", "s3"]);
  });
});

// ── Pane rendering ──────────────────────────────────────────────────────────

function renderPane(
  overrides: Partial<
    React.ComponentProps<typeof CompactNavigationSwimlanesPane>
  > = {},
) {
  const menuRefs: React.ComponentProps<
    typeof CompactNavigationSwimlanesPane
  >["menuRefs"] = {
    current: {},
  } as never;
  const defaultProps: React.ComponentProps<
    typeof CompactNavigationSwimlanesPane
  > = {
    labels: { swimlane: "Swimlane", swimlanePlural: "Swimlanes" },
    openMenuKey: null,
    menuPosition: null,
    menuRefs,
    filteredSwimlanes: [],
    visibleSwimlanes: [],
    archivedSwimlanesForBoard: [],
    isArchivedBoardSelected: false,
    archivedInlineVisible: false,
    showArchivedSwimlanes: false,
    isAllSwimlanesActive: true,
    isSwimlaneSelected: () => false,
    canShowSwimlaneMenu: false,
    onAllSwimlanesSelect: () => {},
    onSwimlaneToggle: () => {},
    onArchivedSwimlaneToggle: () => {},
    onToggleMenu: () => {},
    onCloseMenu: () => {},
    onToggleArchivedSwimlanes: () => {},
    onOpenReorderSwimlanes: () => {},
    // added in Task 3:
    searchOpen: false,
    onSearchOpenChange: () => {},
    searchQuery: "",
    onSearchQueryChange: () => {},
    swimlaneBoardMap: {},
    // added in Task 4:
    allSwimlanes: [],
    selectedSwimlaneIds: new Set<string>(),
    // added in refinement:
    onSearchResultSelect: () => {},
    ...overrides,
  };
  return render(<CompactNavigationSwimlanesPane {...defaultProps} />);
}

describe("CompactNavigationSwimlanesPane header", () => {
  it("renders the search toggle button", () => {
    renderPane();
    expect(
      screen.getByRole("button", { name: /open swimlane search/i }),
    ).toBeInTheDocument();
  });

  it("clicking the search toggle calls onSearchOpenChange(true) when closed", () => {
    const onSearchOpenChange = vi.fn();
    renderPane({ onSearchOpenChange });
    fireEvent.click(
      screen.getByRole("button", { name: /open swimlane search/i }),
    );
    expect(onSearchOpenChange).toHaveBeenCalledWith(true);
  });
});

describe("CompactNavigationSwimlanesPane search mode", () => {
  it("renders the search input below the header when searchOpen is true", () => {
    renderPane({ searchOpen: true });
    expect(
      screen.getByTestId("compact-swimlane-search-input"),
    ).toBeInTheDocument();
  });

  it("does not render the search input when searchOpen is false", () => {
    renderPane({ searchOpen: false });
    expect(screen.queryByTestId("compact-swimlane-search-input")).toBeNull();
  });

  it("shows the 'All swimlanes' row and the board's swimlanes when query is empty", () => {
    const swimlanes: Swimlane[] = [
      { id: "s1", boardId: "b1", name: "Health", currency: "USD" },
      { id: "s2", boardId: "b1", name: "Learning", currency: "USD" },
    ];
    renderPane({
      searchOpen: true,
      searchQuery: "",
      visibleSwimlanes: swimlanes,
      allSwimlanes: swimlanes,
      swimlaneBoardMap: { b1: { id: "b1", name: "Personal", columns: [] } },
    });
    expect(screen.getByText(/^All$/)).toBeInTheDocument();
    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(screen.getByText("Learning")).toBeInTheDocument();
  });

  it("hides the 'All swimlanes' row and shows cross-board results when query is non-empty", () => {
    const swimlanes: Swimlane[] = [
      { id: "s1", boardId: "b1", name: "Health", currency: "USD" },
      { id: "s2", boardId: "b2", name: "Workout", currency: "USD" },
    ];
    renderPane({
      searchOpen: true,
      searchQuery: "work",
      visibleSwimlanes: swimlanes,
      allSwimlanes: swimlanes,
      swimlaneBoardMap: {
        b1: { id: "b1", name: "Personal", columns: [] },
        b2: { id: "b2", name: "Work", columns: [] },
      },
    });
    expect(screen.queryByText(/^All$/)).toBeNull();
    expect(screen.queryByText("Health")).toBeNull();
    expect(screen.getByText("Workout")).toBeInTheDocument();
    // parent board name shown on a separate line (no `·` separator)
    expect(screen.getByText("Work")).toBeInTheDocument();
  });

  it("search results have no checkbox", () => {
    renderPane({
      searchOpen: true,
      searchQuery: "work",
      allSwimlanes: [
        { id: "s2", boardId: "b2", name: "Workout", currency: "USD" },
      ],
      swimlaneBoardMap: { b2: { id: "b2", name: "Work", columns: [] } },
    });
    // The result row should not contain a checkbox role element
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("search result shows the board name on a second, muted line below the swimlane name", () => {
    renderPane({
      searchOpen: true,
      searchQuery: "work",
      allSwimlanes: [
        { id: "s2", boardId: "b2", name: "Workout", currency: "USD" },
      ],
      swimlaneBoardMap: { b2: { id: "b2", name: "Work", columns: [] } },
    });
    const boardName = screen.getByText("Work");
    expect(boardName.className).toMatch(/text-\[10px\]/);
    expect(boardName.className).toMatch(/text-muted-foreground/);
  });

  it("shows a no-match row when query has no hits", () => {
    renderPane({
      searchOpen: true,
      searchQuery: "zzzz",
      visibleSwimlanes: [
        { id: "s1", boardId: "b1", name: "Health", currency: "USD" },
      ],
      allSwimlanes: [
        { id: "s1", boardId: "b1", name: "Health", currency: "USD" },
      ],
      swimlaneBoardMap: { b1: { id: "b1", name: "Personal", columns: [] } },
    });
    expect(screen.getByText(/no swimlanes match/i)).toBeInTheDocument();
  });

  it("marks archived swimlanes with an archive icon in results", () => {
    renderPane({
      searchOpen: true,
      searchQuery: "old",
      visibleSwimlanes: [
        {
          id: "s1",
          boardId: "b1",
          name: "Old Health",
          currency: "USD",
          archived: true,
        },
      ],
      allSwimlanes: [
        {
          id: "s1",
          boardId: "b1",
          name: "Old Health",
          currency: "USD",
          archived: true,
        },
      ],
      swimlaneBoardMap: { b1: { id: "b1", name: "Personal", columns: [] } },
    });
    expect(screen.getByTitle("Archived")).toBeInTheDocument();
  });

  it("clicking a search result calls onSearchResultSelect with the swimlane (not onSwimlaneToggle)", () => {
    const onSwimlaneToggle = vi.fn();
    const onSearchResultSelect = vi.fn();
    renderPane({
      searchOpen: true,
      searchQuery: "work",
      visibleSwimlanes: [
        { id: "s2", boardId: "b2", name: "Workout", currency: "USD" },
      ],
      allSwimlanes: [
        { id: "s2", boardId: "b2", name: "Workout", currency: "USD" },
      ],
      swimlaneBoardMap: { b2: { id: "b2", name: "Work", columns: [] } },
      onSwimlaneToggle,
      onSearchResultSelect,
    });
    fireEvent.click(screen.getByText("Workout"));
    expect(onSearchResultSelect).toHaveBeenCalledTimes(1);
    expect(onSearchResultSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s2", boardId: "b2", name: "Workout" }),
    );
    // onSwimlaneToggle must NOT be called when onSearchResultSelect is provided
    expect(onSwimlaneToggle).not.toHaveBeenCalled();
  });
});
