import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/notes",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/stores/hooks/use-boards", () => ({
  useBoards: vi.fn(),
  useBoardsSubscription: vi.fn(),
}));

vi.mock("@/stores", () => ({
  useNotes: vi.fn().mockReturnValue([]),
  useNotesSubscription: vi.fn(),
}));

vi.mock("@/stores/db-store", () => ({
  useDbStore: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/db", () => ({
  getAllNotes: vi.fn().mockResolvedValue([]),
  putNote: vi.fn().mockResolvedValue(undefined),
  deleteNote: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({
    middlePanel,
    rightPanel,
  }: {
    middlePanel: React.ReactNode;
    rightPanel: React.ReactNode;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "app-layout" },
      React.createElement("div", { "data-testid": "middle" }, middlePanel),
      React.createElement("div", { "data-testid": "right" }, rightPanel),
    ),
}));

// Tiptap editor is dynamically imported and SSR-disabled; mock it entirely
vi.mock("@/components/notes/NoteEditor", () => ({
  default: ({ note }: { note: { title?: string } | null }) =>
    React.createElement("div", {
      "data-testid": "note-editor",
      "data-note-title": note?.title ?? "",
    }),
}));

vi.mock("@/components/ui/swimlane-picker-modal", () => ({
  SwimlanePickerModal: () => null,
}));

vi.mock("@/stores/swimlane-selection-store", () => ({
  useSwimlaneSelectionStore: () => ({
    selections: [],
    clearSelection: vi.fn(),
  }),
  useSwimlaneSelectionDerived: () => ({
    selections: [],
    isAllSelected: true,
    selectedSwimlaneIds: new Set(),
    selectedBoardIds: new Set(),
    primaryBoardId: null,
    hasSelections: false,
    isSwimlaneSelected: vi.fn().mockReturnValue(false),
    isBoardSelected: vi.fn().mockReturnValue(false),
  }),
  filterSwimlanes: (s: unknown[]) => s,
  filterItems: (items: unknown[]) => items,
}));

vi.mock("@/stores/archive-filter-store", () => ({
  useArchiveFilterStore: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/naming", () => ({
  DEFAULT_NAMING: {
    board: "Board",
    task: "Task",
    note: "Note",
    habit: "Habit",
    swimlane: "Swimlane",
  },
}));

vi.mock("@/contexts/NamingContext", () => ({
  NamingProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  useNaming: () => ({
    board: "Board",
    task: "Task",
    note: "Note",
    habit: "Habit",
  }),
}));

import { NotesBoard } from "../NotesBoard";
import { useBoards } from "@/stores/hooks/use-boards";
import { useNotes } from "@/stores";
import { makeBoard, makeSwimlane, makeNote } from "@/test/factories";

function setupBoards() {
  const board = makeBoard({ name: "Notes Board" });
  const swimlane = makeSwimlane({ boardId: board.id, name: "General" });
  vi.mocked(useBoards).mockReturnValue({
    boards: [board],
    swimlanes: [swimlane],
    activeBoards: [board],
    activeSwimlanes: [swimlane],
    filteredSwimlanes: [swimlane],
    board,
    labels: {
      board: "Board",
      task: "Task",
      note: "Note",
      habit: "Habit",
      swimlane: "Swimlane",
    } as never,
    isLoading: false,
    isArchivedSelectionMode: false,
    selections: [],
    isAllSelected: true,
    selectedSwimlaneIds: new Set([swimlane.id]),
    selectedBoardIds: new Set([board.id]),
    primaryBoardId: board.id,
    hasSelections: false,
    isSwimlaneSelected: vi.fn().mockReturnValue(true),
    isBoardSelected: vi.fn().mockReturnValue(true),
    selectAll: vi.fn(),
    selectBoard: vi.fn(),
    toggleSwimlane: vi.fn(),
    clearSelection: vi.fn(),
    putBoard: vi.fn(),
    deleteBoard: vi.fn(),
    putSwimlane: vi.fn(),
    deleteSwimlane: vi.fn(),
    loadBoards: vi.fn(),
    reloadSwimlanes: vi.fn(),
  });
  return { board, swimlane };
}

describe("NotesBoard — rendering", () => {
  beforeEach(() => {
    setupBoards();
    vi.mocked(useNotes).mockReturnValue([]);
  });

  it("renders the app layout", () => {
    render(<NotesBoard />);
    expect(screen.getByTestId("app-layout")).toBeDefined();
  });

  it("renders with no notes without crashing", () => {
    render(<NotesBoard />);
    expect(screen.getByTestId("app-layout")).toBeDefined();
  });

  it("renders note titles as cards", () => {
    const { swimlane } = setupBoards();
    const note = makeNote({ swimlaneId: swimlane.id, title: "Meeting Notes" });
    vi.mocked(useNotes).mockReturnValue([note]);
    render(<NotesBoard />);
    expect(screen.getByText("Meeting Notes")).toBeDefined();
  });

  it("renders multiple notes", () => {
    const { swimlane } = setupBoards();
    const notes = [
      makeNote({ swimlaneId: swimlane.id, title: "Note Alpha" }),
      makeNote({ swimlaneId: swimlane.id, title: "Note Beta" }),
    ];
    vi.mocked(useNotes).mockReturnValue(notes);
    render(<NotesBoard />);
    expect(screen.getByText("Note Alpha")).toBeDefined();
    expect(screen.getByText("Note Beta")).toBeDefined();
  });

  it("shows search input", () => {
    render(<NotesBoard />);
    expect(screen.getByPlaceholderText("Search…")).toBeDefined();
  });
});

describe("NotesBoard — note selection", () => {
  beforeEach(() => {
    setupBoards();
  });

  it("opens note editor when a note is clicked", async () => {
    const user = userEvent.setup();
    const { swimlane } = setupBoards();
    const note = makeNote({ swimlaneId: swimlane.id, title: "Clickable Note" });
    vi.mocked(useNotes).mockReturnValue([note]);

    render(<NotesBoard />);
    const noteCard = screen.getByText("Clickable Note");
    await user.click(noteCard);

    await waitFor(() => {
      expect(screen.getByTestId("note-editor")).toBeDefined();
    });
  });
});

describe("NotesBoard — new note", () => {
  beforeEach(() => {
    setupBoards();
    vi.mocked(useNotes).mockReturnValue([]);
  });

  it("shows swimlane header with three-dot menu", () => {
    render(<NotesBoard />);
    // Each swimlane header has a three-dot menu button
    expect(screen.getAllByTitle(/Actions for/i).length).toBeGreaterThan(0);
  });

  it("opens note editor from three-dot menu", async () => {
    const user = userEvent.setup();
    render(<NotesBoard />);
    // Click the three-dot button to open menu
    const menuBtn = screen.getAllByTitle(/Actions for/i)[0];
    await user.click(menuBtn);
    // Find and click Add note option
    const addNoteOpt = screen.getByText(/add note/i);
    await user.click(addNoteOpt);

    await waitFor(() => {
      expect(screen.getByTestId("note-editor")).toBeDefined();
    });
  });
});

describe("NotesBoard — search", () => {
  beforeEach(() => {
    setupBoards();
  });

  it("filters notes by title search", async () => {
    const user = userEvent.setup();
    const { swimlane } = setupBoards();
    const notes = [
      makeNote({ swimlaneId: swimlane.id, title: "Meeting Summary" }),
      makeNote({ swimlaneId: swimlane.id, title: "Personal Goals" }),
    ];
    vi.mocked(useNotes).mockReturnValue(notes);

    render(<NotesBoard />);
    const searchInput = screen.getByPlaceholderText("Search…");
    await user.type(searchInput, "Meeting");

    await waitFor(() => {
      expect(screen.getByText("Meeting Summary")).toBeDefined();
      expect(screen.queryByText("Personal Goals")).toBeNull();
    });
  });
});
