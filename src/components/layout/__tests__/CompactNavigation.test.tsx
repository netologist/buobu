import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";

import { useSwimlaneSelectionStore } from "@/stores/swimlane-selection-store";

vi.mock("@/stores/archive-filter-store", () => ({
  useArchiveFilterStore: () => ({
    showArchivedItems: false,
    setShowArchivedItems: vi.fn(),
    isLockedBySelection: false,
    setLockedBySelection: vi.fn(),
  }),
}));

vi.mock("@/components/ui/reorder-boards-modal", () => ({
  ReorderBoardsModal: () => null,
}));

vi.mock("@/components/ui/reorder-swimlanes-modal", () => ({
  ReorderSwimlanesModal: () => null,
}));

vi.mock("@/components/ui/move-swimlane-modal", () => ({
  MoveSwimlaneModal: () => null,
}));

import { CompactNavigation } from "@/components/layout/CompactNavigation";

const boards = [
  { id: "b1", name: "Personal", columns: [] },
  { id: "b2", name: "Work", columns: [] },
];
const swimlanes = [
  { id: "s1", boardId: "b1", name: "Health", currency: "USD" },
  { id: "s2", boardId: "b2", name: "Workout", currency: "USD" },
];

function renderCompact() {
  return render(
    <CompactNavigation
      boards={boards as never}
      swimlanes={swimlanes as never}
      allBoards={boards as never}
      allSwimlanes={swimlanes as never}
      labels={{
        board: "Board",
        boardPlural: "Boards",
        swimlane: "Swimlane",
        swimlanePlural: "Swimlanes",
      }}
    />,
  );
}

function openDropdownAndSearch() {
  const trigger = document.querySelector(
    "button.flex.min-h-14",
  ) as HTMLButtonElement | null;
  expect(trigger).toBeTruthy();
  fireEvent.click(trigger!);
  fireEvent.click(
    screen.getByRole("button", { name: /open swimlane search/i }),
  );
  return screen.getByTestId("compact-swimlane-search-input");
}

describe("CompactNavigation — swimlane search state lifecycle", () => {
  beforeEach(() => {
    const store = useSwimlaneSelectionStore.getState();
    store.clearSelection();
    store.selectBoard("b1");
  });

  it("does not render the search input by default (dropdown closed)", () => {
    renderCompact();
    expect(screen.queryByTestId("compact-swimlane-search-input")).toBeNull();
  });

  it("opening the dropdown, typing a query, then closing the dropdown resets the query", () => {
    renderCompact();

    const input = openDropdownAndSearch();
    fireEvent.change(input, { target: { value: "work" } });
    expect(input).toHaveValue("work");

    // Close the dropdown via outside pointerdown.
    act(() => {
      document.body.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true }),
      );
    });

    // Re-open and the query should be empty.
    const input2 = openDropdownAndSearch();
    expect(input2).toHaveValue("");
  });

  it("clicking a search result selects the parent board, toggles the swimlane, and closes the dropdown", () => {
    renderCompact();
    const input = openDropdownAndSearch();
    fireEvent.change(input, { target: { value: "work" } });

    // Confirm the search input is visible before clicking.
    expect(
      screen.getByTestId("compact-swimlane-search-input"),
    ).toBeInTheDocument();

    // Click the "Workout" result (s2, in board b2).
    fireEvent.click(screen.getByText("Workout"));

    // The store should now have b2:s2 selected.
    const state = useSwimlaneSelectionStore.getState();
    expect(state.selections).toContain("b2:s2");

    // The search input should be gone — the dropdown has closed.
    expect(screen.queryByTestId("compact-swimlane-search-input")).toBeNull();
  });
});
