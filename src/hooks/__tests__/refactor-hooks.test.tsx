import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBacklogManager } from "@/hooks/useBacklogManager";
import { useBoardBase } from "@/hooks/useBoardBase";
import { useChecklistManager } from "@/hooks/useChecklistManager";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import { useTaskEditing } from "@/hooks/useTaskEditing";
import { useTransactionManager } from "@/hooks/useTransactionManager";
import { initialUiPanelState, uiPanelReducer } from "@/reducers/uiPanelReducer";
import { makeBacklogItem, makeTask } from "@/test/factories";

vi.mock("@/stores/hooks/use-boards", () => ({
  useBoards: vi.fn(() => ({
    boards: [],
    swimlanes: [{ id: "lane-1", archived: true }],
    activeBoards: [],
    activeSwimlanes: [],
    filteredSwimlanes: [],
    board: null,
    labels: { swimlane: "Lane", swimlanePlural: "Lanes" },
    isLoading: false,
    isArchivedSelectionMode: false,
    selections: [],
    isAllSelected: true,
    selectedSwimlaneIds: new Set<string>(),
    selectedBoardIds: new Set<string>(),
    primaryBoardId: null,
    hasSelections: false,
    isSwimlaneSelected: () => false,
    isBoardSelected: () => false,
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
  })),
}));

vi.mock("@/stores/filter-store", () => ({
  useFilterStore: vi.fn((selector?: (state: { filters: { searchText: string }; setFilters: (filters: { searchText: string }) => void }) => unknown) => {
    const state = {
      filters: { searchText: "focus" },
      setFilters: vi.fn(),
    };
    return typeof selector === "function" ? selector(state) : state;
  }),
}));

describe("refactor hooks", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("runs the pomodoro lifecycle and records work completion", () => {
    vi.useFakeTimers();
    const onFocusComplete = vi.fn();
    const { result } = renderHook(() => usePomodoroTimer({ onFocusComplete, tickIntervalMs: 100 }));

    act(() => {
      result.current.startPomodoro("task-1", { work: 1 / 60, rest: 1 / 60 });
    });

    expect(result.current.activePomodoroTaskId).toBe("task-1");
    expect(result.current.pomodoroPhase).toBe("work");

    act(() => {
      vi.advanceTimersByTime(1_100);
    });

    expect(onFocusComplete).toHaveBeenCalledTimes(1);
    expect(result.current.pomodoroPhase).toBe("break");

    act(() => {
      vi.advanceTimersByTime(1_100);
    });

    expect(result.current.activePomodoroTaskId).toBeNull();
    expect(result.current.pomodoroPhase).toBe("idle");
  });

  it("manages draft task labels and comments", () => {
    const { result } = renderHook(() => useTaskEditing());

    act(() => {
      result.current.setDraftTask(makeTask());
    });

    act(() => {
      result.current.addLabel("urgent");
      result.current.addComment("Looks good");
    });

    expect(result.current.draftTask?.labels).toEqual(["urgent"]);
    expect(result.current.draftTask?.comments).toHaveLength(1);
  });

  it("manages checklist state updates", () => {
    const { result: taskEditing } = renderHook(() => useTaskEditing());
    const { result } = renderHook(() =>
      useChecklistManager({
        draftTask: taskEditing.current.draftTask,
        setDraftTask: taskEditing.current.setDraftTask,
      }),
    );

    act(() => {
      taskEditing.current.setDraftTask(makeTask());
    });

    act(() => {
      result.current.addChecklist("Ship it");
    });

    const checklistId = taskEditing.current.draftTask?.checklists[0]?.id;
    expect(checklistId).toBeTruthy();

    act(() => {
      result.current.addChecklistItem(checklistId as string, "Write tests");
    });

    const itemId = taskEditing.current.draftTask?.checklists[0]?.items[0]?.id as string;

    act(() => {
      result.current.toggleChecklistItem(checklistId as string, itemId, true);
    });

    expect(taskEditing.current.draftTask?.checklists[0]?.items[0]?.done).toBe(true);
  });

  it("manages transaction draft state", () => {
    const { result: taskEditing } = renderHook(() => useTaskEditing());
    const { result } = renderHook(() =>
      useTransactionManager({
        draftTask: taskEditing.current.draftTask,
        setDraftTask: taskEditing.current.setDraftTask,
        getCurrencyForSwimlane: () => "USD",
      }),
    );

    act(() => {
      taskEditing.current.setDraftTask(makeTask({ swimlaneId: "lane-1" }));
    });

    act(() => {
      result.current.addTransaction({ amount: 42, note: "Coffee" });
    });

    expect(taskEditing.current.draftTask?.transactions).toHaveLength(1);
    expect(taskEditing.current.draftTask?.transactions[0]?.currency).toBe("USD");
  });

  it("provides shared board base state", () => {
    const { result } = renderHook(() => useBoardBase({ items: ["focus-task"], filterFn: (item, query) => item.includes(query) }));

    expect(result.current.searchQuery).toBe("focus");
    expect(result.current.filteredItems).toEqual(["focus-task"]);
    expect(result.current.archivedSwimlaneIdSet.has("lane-1")).toBe(true);
  });

  it("manages backlog modal state and counts", async () => {
    const loadItems = vi.fn().mockResolvedValue([makeBacklogItem({ swimlaneId: "lane-1" })]);
    const saveItem = vi.fn().mockResolvedValue(undefined);
    const removeItem = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useBacklogManager({
        loadItems,
        saveItem,
        removeItem,
      }),
    );

    await act(async () => {
      await result.current.openBacklog("lane-1");
    });

    expect(loadItems).toHaveBeenCalledWith("lane-1");
    expect(result.current.backlogItems).toHaveLength(1);

    act(() => {
      result.current.setBacklogInput("Polish backlog");
    });

    await act(async () => {
      await result.current.addBacklogItem();
    });

    expect(saveItem).toHaveBeenCalledTimes(1);
    expect(result.current.backlogCounts["lane-1"]).toBe(2);

    await act(async () => {
      await result.current.removeBacklogItem(result.current.backlogItems[0].id);
    });

    expect(removeItem).toHaveBeenCalledTimes(1);
  });

  it("tracks lane dialogs with a single ui panel reducer", () => {
    let state = uiPanelReducer(initialUiPanelState, {
      type: "TOGGLE_BACKLOG",
      swimlaneId: "lane-1",
    });

    expect(state.activeBacklogSwimlaneId).toBe("lane-1");

    state = uiPanelReducer(state, {
      type: "TOGGLE_ARCHIVE",
      open: true,
      swimlaneId: "lane-2",
    });

    expect(state.showArchive).toBe(true);
    expect(state.archiveSwimlaneId).toBe("lane-2");

    state = uiPanelReducer(state, {
      type: "TOGGLE_TRANSACTIONS",
      open: true,
      swimlaneId: "lane-3",
      scheduled: true,
    });

    expect(state.showTransactions).toBe(false);
    expect(state.showScheduledTransactions).toBe(true);
    expect(state.transactionsSwimlaneId).toBe("lane-3");

    state = uiPanelReducer(state, {
      type: "TOGGLE_POMODOROS",
      open: true,
      swimlaneId: "lane-4",
    });

    expect(state.showPomodoros).toBe(true);
    expect(state.pomodorosSwimlaneId).toBe("lane-4");

    state = uiPanelReducer(state, { type: "OPEN_REORDER_COLUMNS" });
    expect(state.reorderColumnsOpen).toBe(true);

    state = uiPanelReducer(state, { type: "CLOSE_REORDER_COLUMNS" });
    expect(state.reorderColumnsOpen).toBe(false);

    state = uiPanelReducer(state, {
      type: "TOGGLE_TRANSACTIONS",
      open: false,
      swimlaneId: "lane-3",
      scheduled: true,
    });

    expect(state.showScheduledTransactions).toBe(false);
    expect(state.transactionsSwimlaneId).toBeNull();
  });
});
