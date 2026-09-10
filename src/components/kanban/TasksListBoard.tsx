"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBoardBase } from "@/hooks/useBoardBase";
import { useChecklistManager } from "@/hooks/useChecklistManager";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import { useTaskBoardDragAndDrop } from "@/hooks/useTaskBoardDragAndDrop";
import { useTaskBoardCommon } from "@/hooks/useTaskBoardCommon";
import { useTaskBoardSidebarConfig } from "@/hooks/useTaskBoardSidebarConfig";
import { useTaskEditing } from "@/hooks/useTaskEditing";
import { useTransactionManager } from "@/hooks/useTransactionManager";
import { useBoardRenderProfiler } from "@/hooks/useBoardRenderProfiler";
import { PomodoroIndicator } from "@/components/kanban/PomodoroIndicator";
import { TaskDetailPanel } from "@/components/kanban/TaskDetailPanel";
import { AppLayout } from "@/components/layout/AppLayout";
import { MobileFab } from "@/components/layout/MobileFab";
import {
  useActiveRoutines,
  useBoardHabitsSubscription,
  useBoardTasksSubscription,
  useTasks,
} from "@/stores";
import { useDbStore } from "@/stores/db-store";
import type { Task, TaskWorklog } from "@/lib/types";
import { deleteTask, putTask, putTasks } from "@/lib/db";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { nanoid } from "nanoid";
import { useFilterStore } from "@/stores/filter-store";
import { TasksListColumnSection } from "@/components/kanban/TasksListColumnSection";
import { TasksListTaskItemOverlay } from "@/components/kanban/TasksListTaskItemOverlay";
import { countTasksBySwimlane } from "@/components/kanban/task-board-panel-utils";
import {
  areTaskCollectionsEqual,
  buildTask,
  filterTasksByBoardFilters,
  getColumnTasks,
  normalizeTask,
} from "@/lib/kanban/taskUtils";
import { buildListSections } from "@/lib/kanban/listSections";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { BoardConfigProvider } from "@/contexts/BoardConfigContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function TasksListBoard() {
  const db = useDbStore((s) => s.db);
  const [tasks, setTasks] = useState<Task[]>([]);
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
  const routines = useActiveRoutines();

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
  const filterState = useFilterStore((state) => state.filters);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

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
  } = useTaskBoardCommon({
    board,
    labels,
    selectedSwimlaneIds,
    swimlanes,
    routines,
  });

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

  const sectionsBoards = useMemo(
    () => (isAllSelected ? activeBoards : board ? [board] : []),
    [isAllSelected, activeBoards, board],
  );

  const sections = useMemo(
    () =>
      buildListSections({
        boards: sectionsBoards,
        tasks: boardVisibleTasks,
        swimlanes,
        archiveColumnId: archiveColumnId || null,
      }),
    [sectionsBoards, boardVisibleTasks, swimlanes, archiveColumnId],
  );

  const countsBySwimlane = useMemo(
    () => countTasksBySwimlane(tasks, archivedSwimlaneIdSet),
    [tasks, archivedSwimlaneIdSet],
  );

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
    name: "TasksListBoard",
    stats: {
      swimlanes: filteredSwimlanes.length,
      visibleTasks: boardVisibleTasks.length,
      activeTask: activeTaskId ?? "none",
      archivedMode: isArchivedSelectionMode,
    },
  });

  useEffect(() => {
    const nextTasks = subscribedTasks.map(normalizeTask);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync subscribed tasks into local optimistic board state only when the payload actually changed
    setTasks((previousTasks) =>
      areTaskCollectionsEqual(previousTasks, nextTasks)
        ? previousTasks
        : nextTasks,
    );
  }, [subscribedTasks]);

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
    if (!board?.name) return;
    document.title = board.name;
  }, [board?.name]);

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !(prev[sectionId] ?? false),
    }));
  }, []);

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
    async (swimlaneId: string, columnId: string) => {
      if (!board) return;
      const existing = getColumnTasks(tasks, swimlaneId, columnId);
      const task = {
        ...buildTask({ boardId: board.id, swimlaneId, columnId }),
        order: existing.length,
      };
      setTasks((prev) => [...prev, task]);
      await putTask(task);
      setActiveTaskId(task.id);
    },
    [board, tasks, setActiveTaskId],
  );

  async function deleteActiveTask() {
    if (!draftTask) return;
    setTasks((prev) => prev.filter((task) => task.id !== draftTask.id));
    setActiveTaskId(null);
    await deleteTask(draftTask.id);
  }

  function saveDraft() {
    if (!draftTask) return;
    updateTask(draftTask.id, { ...draftTask });
    setActiveTaskId(null);
  }

  function removeWorklog(worklogId: string) {
    if (!draftTask) return;
    setDraftTask({
      ...draftTask,
      worklogs: draftTask.worklogs.filter((log) => log.id !== worklogId),
    });
  }

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

  const isReadOnly = draftTask
    ? Boolean(draftTask.columnId === archiveColumnId || draftTask.archived)
    : false;

  const handleAddTask = useCallback(
    (swimlaneId: string, columnId: string) => {
      void createTask(swimlaneId, columnId);
    },
    [createTask],
  );

  const handleArchiveTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task) return;

      updateTask(task.id, {
        ...task,
        archived: true,
        archivedAt: new Date().toISOString(),
      });
    },
    [tasks, updateTask],
  );

  const activeDragTask = useMemo(
    () => tasks.find((task) => task.id === activeDragTaskId) ?? null,
    [tasks, activeDragTaskId],
  );

  const [movingTask, setMovingTask] = useState<Task | null>(null);
  const [moveTargetSwimlaneId, setMoveTargetSwimlaneId] = useState<string>("");
  const [moveTargetColumnId, setMoveTargetColumnId] = useState<string>("");

  // Pool of swimlanes available as Move targets (across selected boards).
  const moveTargetSwimlanes = useMemo(() => {
    const boardIds = new Set(sectionsBoards.map((b) => b.id));
    return activeSwimlanes.filter(
      (sw) => sw.boardId !== undefined && boardIds.has(sw.boardId),
    );
  }, [sectionsBoards, activeSwimlanes]);

  const moveTargetColumns = useMemo(() => {
    const targetSwimlane = moveTargetSwimlanes.find(
      (sw) => sw.id === moveTargetSwimlaneId,
    );
    const targetBoard =
      sectionsBoards.find((b) => b.id === targetSwimlane?.boardId) ?? board;
    return (targetBoard?.columns ?? []).filter((c) => c.id !== archiveColumnId);
  }, [
    moveTargetSwimlaneId,
    moveTargetSwimlanes,
    sectionsBoards,
    board,
    archiveColumnId,
  ]);

  const handleMoveTask = useCallback((task: Task) => {
    setMovingTask(task);
    setMoveTargetSwimlaneId(task.swimlaneId);
    setMoveTargetColumnId(task.columnId);
  }, []);

  const confirmMoveTask = useCallback(() => {
    if (!movingTask || !moveTargetSwimlaneId || !moveTargetColumnId) return;
    const target = moveTargetSwimlanes.find(
      (sw) => sw.id === moveTargetSwimlaneId,
    );
    const patch: Partial<Task> = {
      swimlaneId: moveTargetSwimlaneId,
      columnId: moveTargetColumnId,
    };
    if (target?.boardId) patch.boardId = target.boardId;
    updateTask(movingTask.id, patch);
    setMovingTask(null);
  }, [
    movingTask,
    moveTargetSwimlaneId,
    moveTargetColumnId,
    moveTargetSwimlanes,
    updateTask,
  ]);

  const middlePanel = null;

  const rightPanel = (
    <div className="flex flex-1 flex-col overflow-hidden bg-muted">
      <div className="shrink-0 px-3 py-3 min-h-16" />
      <div className="flex-1 overflow-auto">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-3 p-4">
            {sections.length === 0 ? (
              <div className="flex items-center justify-center rounded-xl border border-dashed bg-background/40 p-10 text-sm text-muted-foreground">
                No tasks in the current selection.
              </div>
            ) : (
              sections.map((section) => {
                const isCollapsed =
                  collapsedSections[section.columnId] ?? false;
                return (
                  <TasksListColumnSection
                    key={section.columnId}
                    columnId={section.columnId}
                    title={section.title}
                    items={section.tasks}
                    isCollapsed={isCollapsed}
                    canAddTask={Boolean(board && filteredSwimlanes.length > 0)}
                    onToggle={() => toggleSection(section.columnId)}
                    onAddTask={() => {
                      const lane = filteredSwimlanes[0];
                      if (lane) handleAddTask(lane.id, section.columnId);
                    }}
                    onOpenTask={setActiveTaskId}
                    onStartPomodoro={startPomodoro}
                    onArchiveTask={handleArchiveTask}
                    onMoveTask={handleMoveTask}
                  />
                );
              })
            )}
          </div>
          <DragOverlay>
            {activeDragTask ? (
              <TasksListTaskItemOverlay task={activeDragTask} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No board found.
      </div>
    );
  }

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

      <MobileFab
        aria-label="Add new task"
        icon={
          <span className="text-2xl leading-none" aria-hidden>
            +
          </span>
        }
        onClick={() => {
          const swimlane = filteredSwimlanes[0];
          const column =
            boardColumns.find((c) => c.id !== archiveColumnId) ??
            boardColumns[0];
          if (swimlane && column) handleAddTask(swimlane.id, column.id);
        }}
      />

      <TaskDetailPanel
        open={Boolean(activeTaskId)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveTaskId(null);
            setLabelInput("");
            setCommentInput("");
            setChecklistTitleInput("");
          }
        }}
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
        onCancel={() => setActiveTaskId(null)}
        onSave={saveDraft}
        saveLabel="Okay"
      />

      <PomodoroIndicator
        task={activePomodoroTask}
        phase={pomodoroPhase}
        workMinutes={pomodoroWorkMinutes}
        breakMinutes={pomodoroBreakMinutes}
        remaining={pomodoroRemaining}
        onCancel={cancelPomodoro}
      />

      {/* Move task dialog — mobile shortcut */}
      <Dialog
        open={!!movingTask}
        onOpenChange={(open) => {
          if (!open) setMovingTask(null);
        }}
      >
        <DialogContent className="max-w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Move task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Swimlane</Label>
              <Select
                value={moveTargetSwimlaneId}
                onValueChange={setMoveTargetSwimlaneId}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select swimlane" />
                </SelectTrigger>
                <SelectContent>
                  {moveTargetSwimlanes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Column</Label>
              <Select
                value={moveTargetColumnId}
                onValueChange={setMoveTargetColumnId}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {moveTargetColumns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMovingTask(null)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={confirmMoveTask}>
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BoardConfigProvider>
  );
}
