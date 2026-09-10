"use client";

import { useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import type { Habit, HabitLog, Routine, RoutineLog, Task } from "@/lib/types";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BriefingApproveRoutineDialog } from "./BriefingApproveRoutineDialog";
import { BriefingMoveTaskDialog } from "./BriefingMoveTaskDialog";
import { BriefingSwimlaneGroup } from "./BriefingSwimlaneGroup";
import {
  deleteRoutineLog,
  putRoutine,
  putRoutineLog,
  putTask,
} from "@/lib/db";
import { deleteHabitLog } from "@/lib/db";
import { computeNextDueDate } from "@/lib/recurrence";
import { getEffectiveRecurrenceForRoutine, buildTimeblockMap } from "@/lib/timeblocks/effective-recurrence";
import { useAllTimeblocks } from "@/stores/hooks/use-timeblocks";
import { generateId } from "@/lib/uuid";
import { getDateKeyFromIsoLike, getTodayDateKey } from "@/lib/date";
import {
  useApprovalRequiredRoutines,
  useAutoProcessRoutines,
  useRoutineLogs,
} from "@/stores/hooks/use-routines";
import {
  routineLogsLoadingAtom,
  routinesLoadingAtom,
} from "@/stores/atoms/routines";
import {
  habitActions,
  useActiveHabits,
  useHabitLogs,
} from "@/stores/hooks/use-habits";
import {
  habitLogsLoadingAtom,
  habitsLoadingAtom,
} from "@/stores/atoms/habits";
import { useActiveTasks } from "@/stores/hooks/use-tasks";
import { tasksLoadingAtom } from "@/stores/atoms/tasks";
import { useBoards } from "@/stores/hooks/use-boards";
import { filterItems } from "@/stores/swimlane-selection-store";
import {
  buildDailyBriefingGroups,
  countCompletedDailyBriefingItems,
  filterDailyBriefingGroups,
} from "@/lib/routines/daily-briefing";
import { DEFAULT_CURRENCY } from "@/lib/constants";

type Props = {
  open: boolean;
  onDismiss: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function DailyBriefingModal({ open, onDismiss }: Props) {
  const today = getTodayDateKey();

  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [autoProcessDone, setAutoProcessDone] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [moveTaskOpen, setMoveTaskOpen] = useState(false);
  const [movingTask, setMovingTask] = useState<Task | null>(null);
  const [moveDate, setMoveDate] = useState("");
  const [approveRoutineOpen, setApproveRoutineOpen] = useState(false);
  const [approvingRoutine, setApprovingRoutine] = useState<Routine | null>(null);
  const [approveTaskTitle, setApproveTaskTitle] = useState("");

  const approvalRoutines = useApprovalRequiredRoutines();
  const autoProcessRoutines = useAutoProcessRoutines();
  const routineLogs = useRoutineLogs();
  const activeHabits = useActiveHabits();
  const habitLogs = useHabitLogs();
  const allTasks = useActiveTasks();
  const { boards, swimlanes, selections } = useBoards();
  const allTimeblocks = useAllTimeblocks();
  const timeblockMap = useMemo(() => buildTimeblockMap(allTimeblocks), [allTimeblocks]);

  const routinesLoading = useAtomValue(routinesLoadingAtom);
  const routineLogsLoading = useAtomValue(routineLogsLoadingAtom);
  const habitsLoading = useAtomValue(habitsLoadingAtom);
  const habitLogsLoading = useAtomValue(habitLogsLoadingAtom);
  const tasksLoading = useAtomValue(tasksLoadingAtom);

  const isDataLoading =
    routinesLoading || routineLogsLoading || habitsLoading || habitLogsLoading || tasksLoading;

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getHabitLogToday(habitId: string): HabitLog | undefined {
    return habitLogs.find(
      (log) => log.habitId === habitId && getDateKeyFromIsoLike(log.date) === today,
    );
  }

  function getRoutineLogToday(routineId: string): RoutineLog | undefined {
    return routineLogs.find((log) => log.routineId === routineId && log.date === today);
  }

  function markProcessing(id: string) {
    setProcessing((s) => new Set(s).add(id));
  }
  function unmarkProcessing(id: string) {
    setProcessing((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }

  const routineLogIdsForToday = useMemo(
    () => new Set(routineLogs.filter((log) => log.date === today).map((log) => log.routineId)),
    [routineLogs, today],
  );

  // ── Auto-process payment/event routines on open ───────────────────────────

  useEffect(() => {
    if (!open || autoProcessDone || isDataLoading) return;

    if (autoProcessRoutines.length === 0) {
      setAutoProcessDone(true);
      return;
    }

    let cancelled = false;

    async function processAuto() {
      for (const routine of autoProcessRoutines) {
        if (cancelled) return;
        if (routineLogIdsForToday.has(routine.id)) continue;
        try {
          const nowIso = new Date().toISOString();
          const taskId = generateId();
          const transactions =
            routine.type === "payment"
              ? [
                  {
                    id: generateId(),
                    type: routine.paymentType ?? "expense",
                    amount: routine.paymentAmount ?? 0,
                    currency: routine.paymentCurrency ?? DEFAULT_CURRENCY,
                    note: routine.paymentNote ?? undefined,
                    date: today,
                  },
                ]
              : [];

          await putTask({
            id: taskId,
            boardId: routine.boardId,
            swimlaneId: routine.swimlaneId,
            columnId: routine.columnId,
            title: routine.title,
            description: "",
            labels: [],
            comments: [],
            checklists: [],
            transactions,
            worklogs: [],
            routineId: routine.id,
            ...(routine.type === "event"
              ? { date: today, time: routine.eventTime ?? null }
              : {}),
            createdAt: nowIso,
            updatedAt: nowIso,
          } as Task);

          await putRoutineLog({
            routineId: routine.id,
            date: today,
            status: "auto-processed",
            taskId,
            createdAt: nowIso,
          });

          const nextDueDate = computeNextDueDate(getEffectiveRecurrenceForRoutine(routine, timeblockMap), today);
          await putRoutine({ id: routine.id, nextDueDate, lastGeneratedAt: today });
        } catch (err) {
          console.error("Failed to auto-process routine", routine.id, err);
        }
      }
      if (!cancelled) {
        setAutoProcessDone(true);
      }
    }

    void processAuto();

    return () => {
      cancelled = true;
    };
  }, [open, autoProcessDone, isDataLoading, autoProcessRoutines, routineLogIdsForToday, today]);

  // ── Reset on open ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    setAutoProcessDone(false);
    setProcessing(new Set());
    setCollapsed(new Set());
    setSearchQuery("");
    setMoveTaskOpen(false);
    setMovingTask(null);
    setMoveDate("");
    setApproveRoutineOpen(false);
    setApprovingRoutine(null);
    setApproveTaskTitle("");
  }, [open]);

  // ── Build today's items ───────────────────────────────────────────────────

  const todayDayOfWeek = new Date().getDay();

  const todayTasks = useMemo(
    () =>
      allTasks.filter(
        (t) => !t.archived && getDateKeyFromIsoLike(t.date ?? null) === today,
      ),
    [allTasks, today],
  );

  const habitsInSelection = useMemo(
    () => filterItems(activeHabits, selections),
    [activeHabits, selections],
  );
  const habitsDueToday = useMemo(
    () =>
      habitsInSelection.filter((h) => {
        if (!h.frequencyDays || h.frequencyDays.length === 0) return true;
        return h.frequencyDays.includes(todayDayOfWeek);
      }),
    [habitsInSelection, todayDayOfWeek],
  );

  const groups = useMemo(
    () =>
      buildDailyBriefingGroups({
        boards,
        swimlanes,
        tasks: todayTasks,
        routines: approvalRoutines,
        habits: habitsDueToday,
      }),
    [todayTasks, approvalRoutines, habitsDueToday, boards, swimlanes],
  );

  const filteredGroups = useMemo(
    () => filterDailyBriefingGroups(groups, searchQuery),
    [groups, searchQuery],
  );

  // ── Task actions ──────────────────────────────────────────────────────────

  async function handleCompleteTask(task: Task) {
    if (processing.has(task.id)) return;
    markProcessing(task.id);
    try {
      const now = new Date().toISOString();
      await putTask({ ...task, completedAt: now, updatedAt: now });
    } finally {
      unmarkProcessing(task.id);
    }
  }

  async function handleRevertTask(task: Task) {
    if (processing.has(task.id)) return;
    markProcessing(task.id);
    try {
      const now = new Date().toISOString();
      await putTask({ ...task, completedAt: null, updatedAt: now });
    } finally {
      unmarkProcessing(task.id);
    }
  }

  async function handleSkipTask(task: Task) {
    if (processing.has(task.id)) return;
    markProcessing(task.id);
    try {
      const now = new Date().toISOString();
      // "Skip" = remove from today by clearing date
      await putTask({ ...task, date: null, updatedAt: now });
    } finally {
      unmarkProcessing(task.id);
    }
  }

  function openMoveTask(task: Task) {
    setMovingTask(task);
    setMoveDate("");
    setMoveTaskOpen(true);
  }

  async function handleConfirmMove() {
    if (!movingTask || !moveDate) return;
    markProcessing(movingTask.id);
    try {
      const now = new Date().toISOString();
      await putTask({ ...movingTask, date: moveDate, updatedAt: now });
    } finally {
      unmarkProcessing(movingTask.id);
      setMoveTaskOpen(false);
      setMovingTask(null);
      setMoveDate("");
    }
  }

  // ── Routine actions ───────────────────────────────────────────────────────

  function handleOpenApproveDialog(routine: Routine) {
    if (processing.has(routine.id) || getRoutineLogToday(routine.id)) return;
    setApprovingRoutine(routine);
    setApproveTaskTitle(routine.title);
    setApproveRoutineOpen(true);
  }

  async function handleApproveRoutine(routine: Routine, taskTitle: string) {
    if (processing.has(routine.id) || getRoutineLogToday(routine.id)) return;
    markProcessing(routine.id);
    try {
      const nowIso = new Date().toISOString();
      const taskId = generateId();

      await putTask({
        id: taskId,
        boardId: routine.boardId,
        swimlaneId: routine.swimlaneId,
        columnId: routine.columnId,
        title: taskTitle,
        description: "",
        labels: [],
        comments: [],
        checklists: [],
        transactions: [],
        worklogs: [],
        routineId: routine.id,
        ...(routine.type === "event"
          ? { date: today, time: routine.eventTime ?? null }
          : {}),
        createdAt: nowIso,
        updatedAt: nowIso,
      } as Task);

      await putRoutineLog({
        routineId: routine.id,
        date: today,
        status: "approved",
        taskId,
        createdAt: nowIso,
      });

      const nextDueDate = computeNextDueDate(getEffectiveRecurrenceForRoutine(routine, timeblockMap), today);
      await putRoutine({ id: routine.id, nextDueDate, lastGeneratedAt: today });
    } catch (err) {
      console.error("Failed to approve routine", routine.id, err);
    } finally {
      unmarkProcessing(routine.id);
    }
  }

  async function handleConfirmApprove() {
    if (!approvingRoutine || !approveTaskTitle.trim()) return;
    await handleApproveRoutine(approvingRoutine, approveTaskTitle.trim());
    setApproveRoutineOpen(false);
    setApprovingRoutine(null);
    setApproveTaskTitle("");
  }

  async function handleSkipRoutine(routine: Routine) {
    if (processing.has(routine.id) || getRoutineLogToday(routine.id)) return;
    markProcessing(routine.id);
    try {
      const nowIso = new Date().toISOString();
      await putRoutineLog({
        routineId: routine.id,
        date: today,
        status: "skipped",
        taskId: null,
        createdAt: nowIso,
      });
      const nextDueDate = computeNextDueDate(getEffectiveRecurrenceForRoutine(routine, timeblockMap), today);
      await putRoutine({ id: routine.id, nextDueDate, lastGeneratedAt: today });
    } catch (err) {
      console.error("Failed to skip routine", routine.id, err);
    } finally {
      unmarkProcessing(routine.id);
    }
  }

  async function handleRevertRoutine(routine: Routine) {
    const log = getRoutineLogToday(routine.id);
    if (!log || processing.has(routine.id)) return;
    markProcessing(routine.id);
    try {
      await deleteRoutineLog(log.id);
      // Also revert nextDueDate back to today
      await putRoutine({ id: routine.id, nextDueDate: today, lastGeneratedAt: null });
    } catch (err) {
      console.error("Failed to revert routine", routine.id, err);
    } finally {
      unmarkProcessing(routine.id);
    }
  }

  // ── Habit actions ─────────────────────────────────────────────────────────

  async function handleMarkHabitDone(habit: Habit) {
    if (getHabitLogToday(habit.id)) return;
    const nowIso = new Date().toISOString();
    await habitActions.putLog({
      id: generateId(),
      habitId: habit.id,
      date: today,
      value: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    } as HabitLog);
  }

  async function handleSkipHabit(habit: Habit) {
    if (getHabitLogToday(habit.id)) return;
    const nowIso = new Date().toISOString();
    await habitActions.putLog({
      id: generateId(),
      habitId: habit.id,
      date: today,
      value: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    } as HabitLog);
  }

  async function handleRevertHabit(habit: Habit) {
    const log = getHabitLogToday(habit.id);
    if (!log) return;
    await deleteHabitLog(log.id);
  }

  // ── Collapse toggle ───────────────────────────────────────────────────────

  function toggleCollapse(key: string) {
    setCollapsed((s) => {
      const next = new Set(s);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // ── Counters ──────────────────────────────────────────────────────────────

  const totalItems = todayTasks.length + approvalRoutines.length + habitsDueToday.length;
  const doneItems = countCompletedDailyBriefingItems({
    tasks: todayTasks,
    routines: approvalRoutines,
    habits: habitsDueToday,
    getRoutineLogToday,
    getHabitLogToday,
  });

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onDismiss(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0">
          {/* Header */}
          <div className="border-b px-5 pt-5 pb-3 space-y-2 pr-12">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold">Daily Briefing</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              {totalItems > 0 && (
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold leading-none">
                    {doneItems}
                    <span className="font-normal text-muted-foreground">/{totalItems}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">done</p>
                </div>
              )}
            </div>
            {/* Search */}
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter…"
              className="h-7 text-xs"
            />
          </div>

          {isDataLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Preparing briefing...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No matches found." : "Nothing scheduled for today."}
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="px-5 py-3 space-y-5">
                {filteredGroups.map((group) => {
                  const key = `${group.boardId}:${group.swimlaneId}`;
                  return (
                    <BriefingSwimlaneGroup
                      key={key}
                      group={group}
                      isCollapsed={collapsed.has(key)}
                      processing={processing}
                      getRoutineLogToday={getRoutineLogToday}
                      getHabitLogToday={getHabitLogToday}
                      onToggleCollapse={toggleCollapse}
                      onCompleteTask={handleCompleteTask}
                      onRevertTask={handleRevertTask}
                      onSkipTask={handleSkipTask}
                      onMoveTask={openMoveTask}
                      onOpenApproveDialog={handleOpenApproveDialog}
                      onSkipRoutine={handleSkipRoutine}
                      onRevertRoutine={handleRevertRoutine}
                      onMarkHabitDone={handleMarkHabitDone}
                      onSkipHabit={handleSkipHabit}
                      onRevertHabit={handleRevertHabit}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* Footer */}
          <div className="border-t px-5 py-3">
            <Button onClick={onDismiss} className="w-full" size="sm">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BriefingMoveTaskDialog
        open={moveTaskOpen}
        movingTask={movingTask}
        moveDate={moveDate}
        onOpenChange={setMoveTaskOpen}
        onMoveDateChange={setMoveDate}
        onConfirm={handleConfirmMove}
      />

      <BriefingApproveRoutineDialog
        open={approveRoutineOpen}
        routine={approvingRoutine}
        approveTaskTitle={approveTaskTitle}
        processing={processing}
        onOpenChange={(open) => {
          setApproveRoutineOpen(open);
          if (!open) {
            setApprovingRoutine(null);
            setApproveTaskTitle("");
          }
        }}
        onApproveTaskTitleChange={setApproveTaskTitle}
        onConfirm={handleConfirmApprove}
      />
    </>
  );
}
