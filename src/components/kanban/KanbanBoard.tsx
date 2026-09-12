"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type CSSProperties,
} from "react";
import { useBacklogManager } from "@/hooks/useBacklogManager";
import { useBoardBase } from "@/hooks/useBoardBase";
import { useChecklistManager } from "@/hooks/useChecklistManager";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import { useSyncedScrollPanels } from "@/hooks/useSyncedScrollPanels";
import { useTaskBoardDragAndDrop } from "@/hooks/useTaskBoardDragAndDrop";
import { useTaskBoardCommon } from "@/hooks/useTaskBoardCommon";
import { useTaskBoardSidebarConfig } from "@/hooks/useTaskBoardSidebarConfig";
import { useTaskEditing } from "@/hooks/useTaskEditing";
import { useTransactionManager } from "@/hooks/useTransactionManager";
import { useBoardRenderProfiler } from "@/hooks/useBoardRenderProfiler";
import { ArchiveView } from "@/components/kanban/ArchiveView";
import { BoardConfigProvider } from "@/contexts/BoardConfigContext";
import { BacklogPanel } from "@/components/kanban/BacklogPanel";
import { KanbanSwimlane } from "@/components/kanban/KanbanSwimlane";
import { PomodoroIndicator } from "@/components/kanban/PomodoroIndicator";
import { PomodoroSummaryDialog } from "@/components/kanban/PomodoroSummaryDialog";
import { ScheduledTransactionsDialog } from "@/components/kanban/ScheduledTransactionsDialog";
import { SwimlaneTransactionsDialog } from "@/components/kanban/SwimlaneTransactionsDialog";
import { TaskDetailPanel } from "@/components/kanban/TaskDetailPanel";
import { AppLayout } from "@/components/layout/AppLayout";
import { KanbanSwimlanePanel } from "@/components/kanban/KanbanSwimlanePanel";
import {
  useActiveRoutines,
  useBoardHabitsSubscription,
  useBoardTasksSubscription,
  useHabits,
  useTasks,
} from "@/stores";
import { useDbStore } from "@/stores/db-store";
import type { BacklogItem, Task, TaskWorklog } from "@/lib/types";
import {
  deleteBacklogItem,
  deleteTask,
  getBacklogBySwimlane,
  getBacklogCountsBySwimlane,
  putBacklogItem,
  putTask,
  putTasks,
} from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { nanoid } from "nanoid";
import { Archive, ArrowUpDown } from "lucide-react";
import { useFilterStore } from "@/stores/filter-store";
import { initialUiPanelState, uiPanelReducer } from "@/reducers/uiPanelReducer";
import { ReorderColumnsModal } from "@/components/ui/reorder-columns-modal";
import { KanbanTaskCardContent } from "@/components/kanban/KanbanTaskCardContent";
import {
  buildTaskBoardPanelRows,
  countTasksBySwimlane,
} from "@/components/kanban/task-board-panel-utils";
import {
  areTaskCollectionsEqual,
  buildTask,
  buildTasksBySwimlaneAndColumn,
  filterTasksByBoardFilters,
  getColumnTasks,
  getPomodoroSummaryRows,
  getSwimlaneTransactions,
  normalizeTask,
} from "@/lib/kanban/taskUtils";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { useSwimlaneSelectionStore } from "@/stores/swimlane-selection-store";
import { clearSearchScopedFilters } from "@/lib/navigation/search-context";

export function KanbanBoard() {
  const db = useDbStore((s) => s.db);
  const router = useRouter();
  const pathname = usePathname();
  const selectBoard = useSwimlaneSelectionStore((s) => s.selectBoard);
  const toggleSwimlane = useSwimlaneSelectionStore((s) => s.toggleSwimlane);
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [asyncError, setAsyncError] = useState<string | null>(null);
  const [unsavedDraftTaskId, setUnsavedDraftTaskId] = useState<string | null>(
    null,
  );
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);
  const [bulkArchiveScope, setBulkArchiveScope] = useState<"all" | "filtered">(
    "all",
  );
  const [bulkArchivePending, setBulkArchivePending] = useState(false);
  const {
    boards,
    swimlanes,
    activeBoards,
    activeSwimlanes,
    filteredSwimlanes,
    board,
    labels,
    hasSelections,
    selectedSwimlaneIds,
    isAllSelected,
    isArchivedSelectionMode,
    putSwimlane: storePutSwimlane,
    deleteSwimlane: storeDeleteSwimlane,
    filteredItems: selectionFilteredTasks,
    archivedSwimlaneIdSet,
  } = useBoardBase<Task>({ items: tasks });
  const boardScopedSubscriptionId = isAllSelected ? undefined : board?.id;
  useBoardTasksSubscription(boardScopedSubscriptionId);
  useBoardHabitsSubscription(boardScopedSubscriptionId);
  const subscribedTasks = useTasks();
  const subscribedHabits = useHabits();
  const routines = useActiveRoutines();
  const taskIdParam = searchParams.get("taskId");
  const boardIdParam = searchParams.get("boardId");
  const swimlaneIdParam =
    searchParams.get("swimlaneId") ?? searchParams.get("swimlane");

  useEffect(() => {
    if (boardIdParam) {
      selectBoard(boardIdParam);
    }
  }, [boardIdParam, selectBoard]);

  useEffect(() => {
    if (boardIdParam && swimlaneIdParam) {
      toggleSwimlane(boardIdParam, swimlaneIdParam);
    }
  }, [boardIdParam, swimlaneIdParam, toggleSwimlane]);

  const {
    activeTaskId,
    draftTask,
    labelInput,
    commentInput,
    editingCommentId,
    editingCommentText,
    setActiveTaskId,
    setDraftTask,
    setLabelInput,
    setCommentInput,
    setEditingCommentId,
    setEditingCommentText,
    addLabel,
    removeLabel,
    addComment,
    removeComment,
    startEditComment,
    saveEditComment,
    cancelEditComment,
  } = useTaskEditing();
  const {
    checklistTitleInput,
    checklistItemInputs,
    collapsedChecklists,
    editingChecklistId,
    editingChecklistTitle,
    editingChecklistItem,
    editingChecklistItemText,
    setChecklistTitleInput,
    setChecklistItemInputs,
    setEditingChecklistId,
    setEditingChecklistTitle,
    setEditingChecklistItem,
    setEditingChecklistItemText,
    addChecklist,
    removeChecklist,
    addChecklistItem,
    removeChecklistItem,
    toggleChecklistItem,
    toggleChecklistVisibility,
    saveEditChecklistTitle,
    cancelEditChecklistTitle,
    startEditChecklistItem,
    saveEditChecklistItem,
    cancelEditChecklistItem,
  } = useChecklistManager({ draftTask, setDraftTask });
  const [uiPanelState, dispatchUiPanel] = useReducer(
    uiPanelReducer,
    initialUiPanelState,
  );
  const {
    showArchive,
    archiveSwimlaneId,
    showTransactions,
    showScheduledTransactions,
    transactionsSwimlaneId,
    showPomodoros,
    pomodorosSwimlaneId,
    reorderColumnsOpen,
  } = uiPanelState;
  const filterState = useFilterStore((state) => state.filters);
  const {
    activeBacklogSwimlaneId,
    backlogItems,
    backlogInput,
    backlogCounts,
    setBacklogItems,
    setBacklogInput,
    setBacklogCounts,
    openBacklog,
    closeBacklog,
    addBacklogItem,
    removeBacklogItem,
  } = useBacklogManager({
    loadItems: getBacklogBySwimlane,
    saveItem: putBacklogItem,
    removeItem: deleteBacklogItem,
  });

  const countsBySwimlane = useMemo(
    () => countTasksBySwimlane(tasks, archivedSwimlaneIdSet),
    [tasks, archivedSwimlaneIdSet],
  );
  const habits = subscribedHabits;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const {
    routineTitleById,
    swimlaneCurrencyMap,
    swimlanePomodoroMap,
    archiveColumnId,
    middlePanelHeaderLabel,
  } = useTaskBoardCommon({
    board,
    labels,
    selectedSwimlaneIds,
    swimlanes,
    routines,
  });

  const displayFilteredTasks = useMemo(
    () => filterTasksByBoardFilters(selectionFilteredTasks, filterState),
    [selectionFilteredTasks, filterState],
  );

  const boardVisibleTasks = useMemo(
    () =>
      isArchivedSelectionMode
        ? displayFilteredTasks.filter((task) => task.archived)
        : displayFilteredTasks.filter((task) => !task.archived),
    [displayFilteredTasks, isArchivedSelectionMode],
  );
  const allDoneTasks = useMemo(
    () =>
      selectionFilteredTasks.filter(
        (task) => !task.archived && task.columnId === archiveColumnId,
      ),
    [archiveColumnId, selectionFilteredTasks],
  );
  const filteredDoneTasks = useMemo(
    () =>
      displayFilteredTasks.filter(
        (task) => !task.archived && task.columnId === archiveColumnId,
      ),
    [archiveColumnId, displayFilteredTasks],
  );

  const boardColumns = useMemo(() => {
    if (isAllSelected) {
      const seen = new Set<string>();
      const merged: import("@/lib/types").BoardColumn[] = [];
      for (const b of activeBoards) {
        for (const col of b.columns ?? []) {
          if (!seen.has(col.id)) {
            seen.add(col.id);
            merged.push(col);
          }
        }
      }
      return merged;
    }
    return board?.columns ?? [];
  }, [isAllSelected, activeBoards, board?.columns]);
  const boardTasksBySwimlaneAndColumn = useMemo(
    () =>
      buildTasksBySwimlaneAndColumn({
        tasks: boardVisibleTasks,
        swimlaneIds: filteredSwimlanes.map((lane) => lane.id),
        columnIds: boardColumns.map((column) => column.id),
      }),
    [boardColumns, boardVisibleTasks, filteredSwimlanes],
  );

  const middlePanelRows = useMemo(
    () =>
      buildTaskBoardPanelRows({
        filteredSwimlanes,
        boardVisibleTasks,
        tasks,
        habits,
        backlogCounts,
        archiveColumnId,
      }),
    [
      filteredSwimlanes,
      boardVisibleTasks,
      tasks,
      habits,
      backlogCounts,
      archiveColumnId,
    ],
  );

  const swimlaneSyncKey = useMemo(
    () => filteredSwimlanes.map((lane) => lane.id).join("|"),
    [filteredSwimlanes],
  );

  const {
    middlePanelRef: middleScrollRef,
    rightPanelRef: kanbanScrollRef,
    handleMiddleScroll,
    handleRightScroll: handleKanbanScroll,
  } = useSyncedScrollPanels({
    deps: [swimlaneSyncKey],
    preserveScrollPosition: true,
  });

  const archivedTasksForSwimlane = useMemo(() => {
    const source = displayFilteredTasks.filter((task) => task.archived);
    if (!archiveSwimlaneId) return source;
    return source.filter((task) => task.swimlaneId === archiveSwimlaneId);
  }, [displayFilteredTasks, archiveSwimlaneId]);

  const isReadOnly = draftTask
    ? Boolean(draftTask.columnId === archiveColumnId || draftTask.archived)
    : false;

  const swimlaneColorMap = useMemo(() => {
    const entries = swimlanes.map((lane) => [lane.id, lane.color] as const);
    return Object.fromEntries(entries);
  }, [swimlanes]);
  const selectedBulkArchiveTasks = useMemo(
    () => (bulkArchiveScope === "all" ? allDoneTasks : filteredDoneTasks),
    [allDoneTasks, bulkArchiveScope, filteredDoneTasks],
  );
  const previewBulkArchiveTasks = useMemo(
    () => selectedBulkArchiveTasks.slice(0, 8),
    [selectedBulkArchiveTasks],
  );
  const hasMorePreviewTasks =
    selectedBulkArchiveTasks.length > previewBulkArchiveTasks.length;
  const bulkArchiveBoardSummary = useMemo(() => {
    const boardNames = Array.from(
      new Set(
        allDoneTasks.map((task) => {
          const itemBoard = boards.find((item) => item.id === task.boardId);
          return itemBoard?.name ?? "Unknown board";
        }),
      ),
    );
    const swimlaneNames = Array.from(
      new Set(
        allDoneTasks.map((task) => {
          const itemSwimlane = swimlanes.find(
            (item) => item.id === task.swimlaneId,
          );
          return itemSwimlane?.name ?? "Unknown swimlane";
        }),
      ),
    );
    return {
      boards: boardNames,
      swimlanes: swimlaneNames,
    };
  }, [allDoneTasks, boards, swimlanes]);

  const {
    transactionType,
    transactionAmount,
    transactionNote,
    transactionDate,
    editingTransactionId,
    editingTransactionDraft,
    setTransactionType,
    setTransactionAmount,
    setTransactionNote,
    setTransactionDate,
    setEditingTransactionId,
    setEditingTransactionDraft,
    addTransaction,
    removeTransaction,
    startEditTransaction,
    saveEditTransaction,
    cancelEditTransaction,
  } = useTransactionManager({
    draftTask,
    setDraftTask,
    getCurrencyForSwimlane: (swimlaneId) =>
      swimlaneCurrencyMap[swimlaneId] ?? DEFAULT_CURRENCY,
  });

  const sidebarConfig = useTaskBoardSidebarConfig({
    activeBoards,
    activeSwimlanes,
    boards,
    swimlanes,
    countsBySwimlane,
    boardVisibleCount: boardVisibleTasks.length,
    isAllSelected,
    hasSelections,
    isArchivedSelectionMode,
    putSwimlane: storePutSwimlane,
    deleteSwimlane: storeDeleteSwimlane,
    db,
  });

  useBoardRenderProfiler({
    name: "KanbanBoard",
    stats: {
      swimlanes: filteredSwimlanes.length,
      visibleTasks: boardVisibleTasks.length,
      activeTask: activeTaskId ?? "none",
      archivedMode: isArchivedSelectionMode,
    },
  });

  useEffect(() => {
    const nextTasks = subscribedTasks.map(normalizeTask);
    setTasks((previousTasks) =>
      areTaskCollectionsEqual(previousTasks, nextTasks)
        ? previousTasks
        : nextTasks,
    );
  }, [subscribedTasks]);

  useEffect(() => {
    if (!board?.name) return;
    document.title = board.name;
  }, [board?.name]);

  useEffect(() => {
    if (!activeTaskId) {
      setDraftTask(null);
      return;
    }
    const current = tasks.find((task) => task.id === activeTaskId) ?? null;
    setDraftTask(current ? { ...normalizeTask(current) } : null);
    setEditingCommentId(null);
    setEditingChecklistId(null);
    setEditingChecklistItem(null);
    setEditingTransactionId(null);
  }, [
    activeTaskId,
    tasks,
    setDraftTask,
    setEditingChecklistId,
    setEditingChecklistItem,
    setEditingCommentId,
    setEditingTransactionId,
  ]);

  useEffect(() => {
    if (!activeBacklogSwimlaneId) return;
    let isMounted = true;
    getBacklogBySwimlane(activeBacklogSwimlaneId)
      .then((items) => {
        if (!isMounted) return;
        setAsyncError(null);
        setBacklogItems(items);
        setBacklogCounts((prev) => ({
          ...prev,
          [activeBacklogSwimlaneId]: items.length,
        }));
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error("Failed to load backlog items:", error);
        setAsyncError("Backlog items could not be loaded.");
        setBacklogItems([]);
      });
    return () => {
      isMounted = false;
    };
  }, [activeBacklogSwimlaneId, setBacklogCounts, setBacklogItems]);

  useEffect(() => {
    const swimlaneIds = filteredSwimlanes.map((lane) => lane.id);
    if (swimlaneIds.length === 0) return;

    let isMounted = true;
    getBacklogCountsBySwimlane(swimlaneIds)
      .then((counts) => {
        if (!isMounted) return;
        setAsyncError(null);
        setBacklogCounts(
          Object.fromEntries(swimlaneIds.map((id) => [id, counts[id] ?? 0])),
        );
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error("Failed to load backlog counts:", error);
        setAsyncError("Backlog totals could not be loaded.");
        setBacklogCounts(Object.fromEntries(swimlaneIds.map((id) => [id, 0])));
      });
    return () => {
      isMounted = false;
    };
  }, [filteredSwimlanes, setBacklogCounts]);

  const updateTask = useCallback(
    (taskId: string, patch: Partial<Task>) => {
      const current = tasks.find((task) => task.id === taskId);
      if (!current) return;
      const updated: Task = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? updated : task)),
      );
      void putTask(updated);
    },
    [tasks],
  );

  const { activeDragTaskId, handleDragStart, handleDragCancel, handleDragEnd } =
    useTaskBoardDragAndDrop({
      tasks,
      setTasks,
      archiveColumnId,
      persistTask: putTask,
      persistTasks: putTasks,
      primaryScrollRef: kanbanScrollRef,
      secondaryScrollRef: middleScrollRef,
    });

  const {
    activePomodoroTaskId,
    pomodoroPhase,
    pomodoroWorkMinutes,
    pomodoroBreakMinutes,
    pomodoroRemaining,
    startPomodoro: startPomodoroSession,
    cancelPomodoro,
  } = usePomodoroTimer({
    onFocusComplete: (taskId, details) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task) return;
      const worklog: TaskWorklog = {
        id: nanoid(),
        startedAt: details.startedAt,
        endedAt: details.endedAt,
        durationMinutes: details.workMinutes,
        breakMinutes:
          details.breakMinutes > 0 ? details.breakMinutes : undefined,
      };
      updateTask(task.id, {
        ...task,
        pomodoros: (task.pomodoros ?? 0) + 1,
        worklogs: [...(task.worklogs ?? []), worklog],
      });
    },
  });

  const startPomodoro = useCallback(
    (task: Task) => {
      const config = swimlanePomodoroMap[task.swimlaneId] ?? {
        work: 25,
        rest: 5,
      };
      startPomodoroSession(task.id, config);
    },
    [startPomodoroSession, swimlanePomodoroMap],
  );

  const activePomodoroTask = useMemo(
    () => tasks.find((task) => task.id === activePomodoroTaskId) ?? null,
    [tasks, activePomodoroTaskId],
  );

  const createTask = useCallback(
    (swimlaneId: string, columnId: string) => {
      if (!board) return;
      const existing = getColumnTasks(tasks, swimlaneId, columnId);
      const task = {
        ...buildTask({ boardId: board.id, swimlaneId, columnId }),
        order: existing.length,
      };
      setTasks((prev) => [...prev, task]);
      setUnsavedDraftTaskId(task.id);
      setActiveTaskId(task.id);
    },
    [board, tasks, setActiveTaskId],
  );

  const moveBacklogItemToBoard = useCallback(
    async (item: BacklogItem) => {
      if (!board) return;
      const firstColumnId = board.columns[0]?.id;
      if (!firstColumnId) return;
      const now = new Date().toISOString();
      const task: Task = {
        id: nanoid(),
        boardId: board.id,
        swimlaneId: item.swimlaneId,
        columnId: firstColumnId,
        title: item.text,
        description: "",
        labels: [],
        comments: [],
        checklists: [],
        transactions: [],
        worklogs: [],
        pomodoros: 0,
        order: getColumnTasks(tasks, item.swimlaneId, firstColumnId).length,
        date: null,
        deadline: null,
        priority: "low",
        archived: false,
        archivedAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      setTasks((prev) => [...prev, task]);
      await putTask(task);
      await removeBacklogItem(item.id);
    },
    [board, removeBacklogItem, tasks],
  );

  function archiveActiveTask() {
    if (!draftTask) return;
    if (draftTask.columnId !== archiveColumnId) return;
    updateTask(draftTask.id, {
      ...draftTask,
      archived: true,
      archivedAt: new Date().toISOString(),
    });
    setActiveTaskId(null);
  }

  async function deleteActiveTask() {
    if (!draftTask) return;
    setTasks((prev) => prev.filter((task) => task.id !== draftTask.id));
    setActiveTaskId(null);
    if (draftTask.id === unsavedDraftTaskId) {
      setUnsavedDraftTaskId(null);
      return;
    }
    await deleteTask(draftTask.id);
  }

  function saveDraft() {
    if (!draftTask) return;
    updateTask(draftTask.id, { ...draftTask });
    if (draftTask.id === unsavedDraftTaskId) {
      setUnsavedDraftTaskId(null);
    }
    setActiveTaskId(null);
  }

  function removeWorklog(worklogId: string) {
    if (!draftTask) return;
    setDraftTask({
      ...draftTask,
      worklogs: draftTask.worklogs.filter((log) => log.id !== worklogId),
    });
  }

  const handleArchiveTask = useCallback(
    (task: Task) => {
      updateTask(task.id, {
        ...task,
        archived: true,
        archivedAt: new Date().toISOString(),
      });
    },
    [updateTask],
  );

  const executeBulkArchive = useCallback(async () => {
    const sourceTasks =
      bulkArchiveScope === "all" ? allDoneTasks : filteredDoneTasks;
    if (sourceTasks.length === 0) {
      setBulkArchiveOpen(false);
      return;
    }

    const archivedAt = new Date().toISOString();
    const sourceMap = new Map(sourceTasks.map((task) => [task.id, task]));
    const updatedTasks = sourceTasks.map((task) => ({
      ...task,
      archived: true,
      archivedAt,
      updatedAt: archivedAt,
    }));
    const updatedMap = new Map(updatedTasks.map((task) => [task.id, task]));

    setBulkArchivePending(true);
    setAsyncError(null);
    setTasks((previousTasks) =>
      previousTasks.map((task) => updatedMap.get(task.id) ?? task),
    );
    try {
      await putTasks(updatedTasks);
      setBulkArchiveOpen(false);
    } catch (error) {
      console.error("Failed to archive done tasks:", error);
      setAsyncError("Done column tasks could not be archived.");
      setTasks((previousTasks) =>
        previousTasks.map((task) => sourceMap.get(task.id) ?? task),
      );
    } finally {
      setBulkArchivePending(false);
    }
  }, [allDoneTasks, bulkArchiveScope, filteredDoneTasks]);

  const handleAddCard = useCallback(
    (swimlaneId: string, columnId: string) => {
      createTask(swimlaneId, columnId);
    },
    [createTask],
  );

  function restoreTask(taskId: string) {
    updateTask(taskId, { archived: false, archivedAt: null });
  }

  const columnsMinWidth = boardColumns.length * 200;
  const horizontalPaddingPx = 48; // px-6 left + right
  const columnsStyle = useMemo<CSSProperties>(
    () => ({
      minWidth: `${columnsMinWidth}px`,
      gridTemplateColumns: `repeat(${boardColumns.length}, minmax(0, 1fr))`,
    }),
    [boardColumns.length, columnsMinWidth],
  );
  const boardHeaderStyle = useMemo<CSSProperties>(
    () =>
      ({
        "--columns-min-width": `${columnsMinWidth + horizontalPaddingPx}px`,
      }) as CSSProperties,
    [columnsMinWidth],
  );
  const activeDragTask = useMemo(
    () => tasks.find((item) => item.id === activeDragTaskId) ?? null,
    [tasks, activeDragTaskId],
  );

  useEffect(() => {
    if (!taskIdParam) return;
    const target = tasks.find((task) => task.id === taskIdParam);
    if (target) {
      setActiveTaskId(target.id);
    }
  }, [setActiveTaskId, taskIdParam, tasks]);

  const closeTaskDetailPanel = useCallback(() => {
    if (draftTask?.id === unsavedDraftTaskId) {
      setTasks((prev) => prev.filter((task) => task.id !== draftTask.id));
      setUnsavedDraftTaskId(null);
    }
    setActiveTaskId(null);
    setLabelInput("");
    setCommentInput("");
    setChecklistTitleInput("");

    const params = clearSearchScopedFilters(
      new URLSearchParams(searchParams.toString()),
    );
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname);
  }, [
    draftTask,
    pathname,
    router,
    searchParams,
    setActiveTaskId,
    setChecklistTitleInput,
    setCommentInput,
    setLabelInput,
    unsavedDraftTaskId,
  ]);

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No board found.
      </div>
    );
  }

  const middlePanel = (
    <KanbanSwimlanePanel
      headerLabel={middlePanelHeaderLabel}
      headerCount={filteredSwimlanes.length}
      rows={middlePanelRows}
      scrollRef={middleScrollRef}
      onScroll={handleMiddleScroll}
      onOpenBacklog={openBacklog}
      onOpenArchive={(laneId) => {
        dispatchUiPanel({
          type: "TOGGLE_ARCHIVE",
          open: true,
          swimlaneId: laneId,
        });
      }}
      onOpenPomodoros={(laneId) => {
        dispatchUiPanel({
          type: "TOGGLE_POMODOROS",
          open: true,
          swimlaneId: laneId,
        });
      }}
      onOpenCurrentTransactions={(laneId) => {
        dispatchUiPanel({
          type: "TOGGLE_TRANSACTIONS",
          open: true,
          swimlaneId: laneId,
        });
      }}
      onOpenScheduledTransactions={(laneId) => {
        dispatchUiPanel({
          type: "TOGGLE_TRANSACTIONS",
          open: true,
          swimlaneId: laneId,
          scheduled: true,
        });
      }}
    />
  );

  const rightPanel = (
    <div className="flex flex-1 flex-col overflow-hidden bg-muted/30">
      {asyncError && (
        <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {asyncError}
        </div>
      )}
      <div
        ref={kanbanScrollRef}
        onScroll={handleKanbanScroll}
        className="flex-1 overflow-auto"
      >
        <div
          className="sticky top-0 z-10 w-full min-w-(--columns-min-width) border-b bg-background"
          style={boardHeaderStyle}
        >
          <div className="relative min-h-14 px-6 py-5">
            <div
              className="grid min-w-0 gap-0 pr-0 text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground"
              style={columnsStyle}
            >
              {boardColumns.map((column) => (
                <div key={column.id} className="px-3 pt-0.5">
                  {column.title}
                </div>
              ))}
            </div>
            {boardColumns.length >= 2 && (
              <div className="absolute right-8 top-4 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setBulkArchiveScope("all");
                    setBulkArchiveOpen(true);
                  }}
                  disabled={allDoneTasks.length === 0 || bulkArchivePending}
                  className="h-8"
                  title="Move done-column tasks to archive"
                >
                  <Archive className="h-3.5 w-3.5" />
                  Move to Archive
                </Button>
                <button
                  type="button"
                  onClick={() =>
                    dispatchUiPanel({ type: "OPEN_REORDER_COLUMNS" })
                  }
                  className="inline-flex h-8 w-8 border items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Reorder columns"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4">
          <DndContext
            sensors={sensors}
            autoScroll={false}
            onDragStart={handleDragStart}
            onDragCancel={handleDragCancel}
            onDragEnd={handleDragEnd}
          >
            <div className="flex min-w-full flex-col gap-4">
              {filteredSwimlanes.map((lane) => (
                <KanbanSwimlane
                  key={lane.id}
                  lane={lane}
                  columns={boardColumns}
                  tasksByColumn={boardTasksBySwimlaneAndColumn[lane.id] ?? {}}
                  columnsStyle={columnsStyle}
                  viewportRef={kanbanScrollRef}
                  swimlaneCurrency={
                    swimlaneCurrencyMap[lane.id] ?? DEFAULT_CURRENCY
                  }
                  swimlaneColor={swimlaneColorMap[lane.id]}
                  onOpenTask={setActiveTaskId}
                  onStartPomodoro={startPomodoro}
                  onArchiveTask={handleArchiveTask}
                  onAddCard={handleAddCard}
                />
              ))}
            </div>
            <DragOverlay>
              {activeDragTask ? (
                <Card
                  className="border-l-4 border-l-(--lane-color) p-3 shadow-sm"
                  style={
                    {
                      "--lane-color":
                        swimlaneColorMap[activeDragTask.swimlaneId] ??
                        "transparent",
                    } as CSSProperties
                  }
                >
                  <KanbanTaskCardContent
                    task={activeDragTask}
                    currency={
                      swimlaneCurrencyMap[activeDragTask.swimlaneId] ??
                      DEFAULT_CURRENCY
                    }
                  />
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  );

  return (
    <BoardConfigProvider
      archiveColumnId={archiveColumnId}
      routineTitleById={routineTitleById}
    >
      <AppLayout
        sidebarConfig={sidebarConfig}
        middlePanel={middlePanel}
        rightPanel={rightPanel}
        middlePanelClassName="w-72 overflow-hidden"
        rightPanelClassName="overflow-hidden bg-muted/30"
      />

      <TaskDetailPanel
        open={Boolean(activeTaskId)}
        onOpenChange={(open) => {
          if (!open) {
            closeTaskDetailPanel();
          }
        }}
        onCancel={closeTaskDetailPanel}
        boards={boards}
        swimlanes={swimlanes}
        model={{
          draftTask,
          setDraftTask,
          labelInput,
          setLabelInput,
          addLabel,
          removeLabel,
          commentInput,
          setCommentInput,
          editingCommentId,
          editingCommentText,
          setEditingCommentText,
          addComment,
          removeComment,
          startEditComment,
          saveEditComment,
          cancelEditComment,
          checklistTitleInput,
          setChecklistTitleInput,
          checklistItemInputs,
          setChecklistItemInputs,
          collapsedChecklists,
          editingChecklistId,
          editingChecklistTitle,
          setEditingChecklistTitle,
          editingChecklistItem,
          editingChecklistItemText,
          setEditingChecklistItemText,
          addChecklist,
          removeChecklist,
          addChecklistItem,
          removeChecklistItem,
          toggleChecklistItem,
          toggleChecklistVisibility,
          saveEditChecklistTitle,
          cancelEditChecklistTitle,
          startEditChecklistItem,
          saveEditChecklistItem,
          cancelEditChecklistItem,
          transactionType,
          setTransactionType,
          transactionAmount,
          setTransactionAmount,
          transactionNote,
          setTransactionNote,
          transactionDate,
          setTransactionDate,
          editingTransactionId,
          editingTransactionDraft,
          setEditingTransactionDraft,
          addTransaction,
          removeTransaction,
          startEditTransaction,
          saveEditTransaction,
          cancelEditTransaction,
          removeWorklog,
        }}
        isReadOnly={isReadOnly}
        swimlaneCurrency={
          draftTask
            ? (swimlaneCurrencyMap[draftTask.swimlaneId] ?? DEFAULT_CURRENCY)
            : DEFAULT_CURRENCY
        }
        onArchiveTask={archiveActiveTask}
        onDeleteTask={() => void deleteActiveTask()}
        onSave={saveDraft}
      />

      <Dialog
        open={bulkArchiveOpen}
        onOpenChange={(open) => {
          if (bulkArchivePending) return;
          setBulkArchiveOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Done Column Tasks to Archive</DialogTitle>
            <DialogDescription>
              Select which done-column tasks should be archived.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setBulkArchiveScope("all")}
                disabled={bulkArchivePending}
                className="flex w-full items-start gap-2 rounded-md border p-3 text-left"
                aria-pressed={bulkArchiveScope === "all"}
              >
                <input
                  type="radio"
                  name="bulk-archive-scope"
                  checked={bulkArchiveScope === "all"}
                  readOnly
                  aria-label="All done tasks"
                  className="pointer-events-none"
                />
                <span>
                  <span className="font-medium">All done tasks</span>
                  <span className="block text-muted-foreground">
                    {allDoneTasks.length} task(s)
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBulkArchiveScope("filtered")}
                disabled={bulkArchivePending}
                className="flex w-full items-start gap-2 rounded-md border p-3 text-left"
                aria-pressed={bulkArchiveScope === "filtered"}
              >
                <input
                  type="radio"
                  name="bulk-archive-scope"
                  checked={bulkArchiveScope === "filtered"}
                  readOnly
                  aria-label="Only filtered done tasks"
                  className="pointer-events-none"
                />
                <span>
                  <span className="font-medium">Only filtered done tasks</span>
                  <span className="block text-muted-foreground">
                    {filteredDoneTasks.length} task(s)
                  </span>
                </span>
              </button>
            </div>

            {bulkArchiveScope === "all" && (
              <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                <div>
                  Boards: {bulkArchiveBoardSummary.boards.join(", ") || "None"}
                </div>
                <div>
                  Swimlanes:{" "}
                  {bulkArchiveBoardSummary.swimlanes.join(", ") || "None"}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Selected done tasks
              </div>
              {previewBulkArchiveTasks.length === 0 ? (
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  No tasks found for this option.
                </div>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-auto rounded-md border p-2 text-sm">
                  {previewBulkArchiveTasks.map((task) => (
                    <li key={task.id} className="truncate">
                      {task.title || "Untitled task"}
                    </li>
                  ))}
                  {hasMorePreviewTasks && (
                    <li className="text-xs text-muted-foreground">
                      ...and{" "}
                      {selectedBulkArchiveTasks.length -
                        previewBulkArchiveTasks.length}{" "}
                      more.
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkArchiveOpen(false)}
              disabled={bulkArchivePending}
            >
              No
            </Button>
            <Button
              onClick={() => void executeBulkArchive()}
              disabled={
                selectedBulkArchiveTasks.length === 0 || bulkArchivePending
              }
            >
              {bulkArchivePending ? "Archiving..." : "Yes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ArchiveView
        open={showArchive}
        onOpenChange={(open) => {
          dispatchUiPanel({ type: "TOGGLE_ARCHIVE", open });
        }}
        tasks={archivedTasksForSwimlane}
        onRestore={restoreTask}
      />

      {(() => {
        const txLane = transactionsSwimlaneId
          ? filteredSwimlanes.find((item) => item.id === transactionsSwimlaneId)
          : null;
        const txCurrency =
          txLane?.currency ??
          filteredSwimlanes[0]?.currency ??
          DEFAULT_CURRENCY;
        const txSwimlaneName = transactionsSwimlaneId
          ? (filteredSwimlanes.find(
              (item) => item.id === transactionsSwimlaneId,
            )?.name ?? labels.swimlane)
          : labels.swimlanePlural;
        return (
          <>
            <SwimlaneTransactionsDialog
              open={showTransactions}
              onOpenChange={(open) => {
                dispatchUiPanel({
                  type: "TOGGLE_TRANSACTIONS",
                  open,
                  swimlaneId: transactionsSwimlaneId,
                });
              }}
              rows={getSwimlaneTransactions(
                tasks,
                transactionsSwimlaneId,
                false,
              )}
              currency={txCurrency}
              swimlaneName={txSwimlaneName}
            />

            <ScheduledTransactionsDialog
              open={showScheduledTransactions}
              onOpenChange={(open) => {
                dispatchUiPanel({
                  type: "TOGGLE_TRANSACTIONS",
                  open,
                  swimlaneId: transactionsSwimlaneId,
                  scheduled: true,
                });
              }}
              rows={getSwimlaneTransactions(
                tasks,
                transactionsSwimlaneId,
                true,
              )}
              currency={txCurrency}
              swimlaneName={txSwimlaneName}
            />
          </>
        );
      })()}

      <PomodoroSummaryDialog
        open={showPomodoros}
        onOpenChange={(open) => {
          dispatchUiPanel({ type: "TOGGLE_POMODOROS", open });
        }}
        rows={getPomodoroSummaryRows(tasks, pomodorosSwimlaneId)}
      />

      <BacklogPanel
        open={Boolean(activeBacklogSwimlaneId)}
        onOpenChange={(open) => {
          if (!open) {
            closeBacklog();
          }
        }}
        title={
          activeBacklogSwimlaneId
            ? `Backlog - ${
                filteredSwimlanes.find(
                  (lane) => lane.id === activeBacklogSwimlaneId,
                )?.name ?? labels.swimlane
              }`
            : "Backlog"
        }
        backlogInput={backlogInput}
        setBacklogInput={setBacklogInput}
        items={backlogItems}
        onAddItem={() => void addBacklogItem()}
        onMoveToBoard={moveBacklogItemToBoard}
        onRemoveItem={removeBacklogItem}
      />

      <PomodoroIndicator
        task={activePomodoroTask}
        phase={pomodoroPhase}
        workMinutes={pomodoroWorkMinutes}
        breakMinutes={pomodoroBreakMinutes}
        remaining={pomodoroRemaining}
        onCancel={cancelPomodoro}
      />

      <ReorderColumnsModal
        open={reorderColumnsOpen}
        onOpenChange={(open) => {
          dispatchUiPanel({
            type: open ? "OPEN_REORDER_COLUMNS" : "CLOSE_REORDER_COLUMNS",
          });
        }}
        boardId={board?.id}
      />
    </BoardConfigProvider>
  );
}
