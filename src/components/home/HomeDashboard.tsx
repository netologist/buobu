"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BellDot,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  FileText,
  Flame,
  ListTodo,
  PenTool,
  Repeat,
  Route,
  SquareArrowOutUpRight,
  Target,
  Wallet,
} from "lucide-react";

import { useAuthContext } from "@/components/auth/AuthProvider";
import { AppHeader } from "@/components/kanban/AppHeader";
import { useDailyBriefing } from "@/components/routines/DailyBriefingProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { getDateKeyFromIsoLike, getTodayDateKey } from "@/lib/date";
import { calculateHabitStats } from "@/lib/habits/stats";
import type {
  Bookmark as BookmarkItem,
  Habit,
  HabitLog,
  Note,
  Routine,
  RoutineLog,
  Task,
  TaskTransaction,
  VisionBoardItem,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useBoards } from "@/stores/hooks/use-boards";
import { useActiveBookmarks, useBookmarksSubscription } from "@/stores/hooks/use-bookmarks";
import { useActiveHabits, useHabitLogs } from "@/stores/hooks/use-habits";
import { useNotes, useNotesSubscription } from "@/stores/hooks/use-notes";
import {
  useApprovalRequiredRoutines,
  useAutoProcessRoutines,
  useRoutineLogs,
} from "@/stores/hooks/use-routines";
import { useActiveTasks } from "@/stores/hooks/use-tasks";
import { useActiveVisionItems, useVisionItemsSubscription } from "@/stores/hooks/use-vision";

type MoneyTotals = {
  currency: string;
  income: number;
  expense: number;
  net: number;
};

type ScheduleItem = {
  id: string;
  title: string;
  subtitle: string;
  time: string | null;
  kind: "task" | "routine";
  status: string;
  statusTitle?: string;
  href: string;
};

type WeekDayDetail = {
  key: string;
  date: Date;
  tasks: Task[];
  routines: Routine[];
  habitsDue: Habit[];
  habitsDone: number;
  money: MoneyTotals[];
  scheduledPayments: Routine[];
};

type ActivitySummary = {
  notesAdded: number;
  tasksAdded: number;
  habitsAdded: number;
  routinesAdded: number;
  habitChecks: number;
  routineLogs: number;
  transactionsCaptured: number;
  recentNotes: Note[];
};

const fullDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const weekdayFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "long" });
const shortWeekdayFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
const monthDayFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function normalizeDate(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function getTaskPriorityWeight(priority?: Task["priority"] | null) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  if (priority === "low") return 2;
  return 3;
}

function parseTimeValue(time?: string | null) {
  if (!time) return Number.POSITIVE_INFINITY;
  const [hours, minutes] = time.split(":").map((value) => Number(value));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.POSITIVE_INFINITY;
  return hours * 60 + minutes;
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function aggregateTransactions(transactions: TaskTransaction[]) {
  const grouped = new Map<string, MoneyTotals>();

  for (const transaction of transactions) {
    const currency = transaction.currency || DEFAULT_CURRENCY;
    const current = grouped.get(currency) ?? { currency, income: 0, expense: 0, net: 0 };

    if (transaction.type === "income") {
      current.income += transaction.amount;
      current.net += transaction.amount;
    } else {
      current.expense += transaction.amount;
      current.net -= transaction.amount;
    }

    grouped.set(currency, current);
  }

  return Array.from(grouped.values()).sort((left, right) => left.currency.localeCompare(right.currency));
}

function statusTone(status: string) {
  if (status.toLowerCase().includes("done") || status.toLowerCase().includes("approved")) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status.toLowerCase().includes("overdue") || status.toLowerCase().includes("risk")) {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  if (status.toLowerCase().includes("scheduled")) {
    return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }
  return "bg-muted text-muted-foreground";
}

function kindAccent(kind: ScheduleItem["kind"]) {
  if (kind === "task") return "border-l-violet-500";
  return "border-l-emerald-500";
}

function getGreetingName(email?: string | null) {
  const source = email?.split("@")[0]?.split(/[._-]/)[0] ?? "there";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function getTimeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getHabitLogForDate(logs: HabitLog[], habitId: string, dateKey: string) {
  return logs.find((log) => log.habitId === habitId && getDateKeyFromIsoLike(log.date) === dateKey);
}

function getRoutineLogForDate(logs: RoutineLog[], routineId: string, dateKey: string) {
  return logs.find((log) => log.routineId === routineId && log.date === dateKey);
}

function formatWindowRange(start: Date) {
  const end = addDays(start, 6);
  return `${monthDayFormatter.format(start)} - ${monthDayFormatter.format(end)}`;
}

function formatDueDateLabel(dateKey?: string | null) {
  if (!dateKey) return undefined;
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return fullDateFormatter.format(parsed);
}

function getTaskHref(task: Task) {
  return `/tasks/kanban-view?boardId=${encodeURIComponent(task.boardId)}&taskId=${encodeURIComponent(task.id)}`;
}

function getHabitHref(habit: Habit) {
  return `/habits?boardId=${encodeURIComponent(habit.boardId)}&habitId=${encodeURIComponent(habit.id)}`;
}

function getRoutineHref(routine: Routine) {
  return `/routines?boardId=${encodeURIComponent(routine.boardId)}&routineId=${encodeURIComponent(routine.id)}`;
}

function getNoteHref(note: Note) {
  return `/notes?boardId=${encodeURIComponent(note.boardId)}&noteId=${encodeURIComponent(note.id)}`;
}

function getWhiteboardHref(item: VisionBoardItem) {
  return `/whiteboards?whiteboardId=${encodeURIComponent(item.id)}&boardId=${encodeURIComponent(item.boardId)}`;
}

function getBookmarkHref(bookmark: BookmarkItem) {
  return `/bookmarks?bookmarkId=${encodeURIComponent(bookmark.id)}&boardId=${encodeURIComponent(bookmark.boardId)}`;
}

function isDateInWindow(dateLike: string | null | undefined, keySet: Set<string>) {
  const dateKey = getDateKeyFromIsoLike(dateLike);
  return Boolean(dateKey && keySet.has(dateKey));
}

function countCreatedInWindow<T extends { createdAt?: string | null }>(items: T[], keySet: Set<string>) {
  return items.filter((item) => isDateInWindow(item.createdAt ?? null, keySet)).length;
}

function HomeMetric({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
        </div>
        <div className="rounded-full bg-muted p-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function ResourceRow({
  href,
  title,
  meta,
  right,
  accentClass,
}: {
  href: string;
  title: string;
  meta: string;
  right?: React.ReactNode;
  accentClass?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-xl border border-border/60 border-l-4 bg-background/70 px-3 py-2.5 transition-colors hover:border-border hover:bg-background", accentClass)}
    >
      <div className="min-w-0">
        <div className="flex items-start gap-2">
          <span className="truncate text-sm font-semibold md:text-base">{title}</span>
          <SquareArrowOutUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
        <div className="mt-1 text-xs text-muted-foreground md:text-sm">{meta}</div>
      </div>
      {right}
    </Link>
  );
}

export function HomeDashboard() {
  useNotesSubscription();
  useVisionItemsSubscription();
  useBookmarksSubscription();

  const { user } = useAuthContext();
  const { pendingCount } = useDailyBriefing();
  const { boards, swimlanes } = useBoards();
  const activeTasks = useActiveTasks();
  const approvalRoutines = useApprovalRequiredRoutines();
  const autoProcessRoutines = useAutoProcessRoutines();
  const routineLogs = useRoutineLogs();
  const activeHabits = useActiveHabits();
  const habitLogs = useHabitLogs();
  const notes = useNotes();
  const activeVisionItems = useActiveVisionItems();
  const activeBookmarks = useActiveBookmarks();

  const [windowOffset, setWindowOffset] = useState(0);

  const today = useMemo(() => normalizeDate(new Date()), []);
  const todayKey = getTodayDateKey();
  const scopedTasks = activeTasks;
  const scopedApprovalRoutines = approvalRoutines;
  const scopedAutoRoutines = autoProcessRoutines;
  const scopedHabits = activeHabits;
  const scopedNotes = useMemo(() => notes.filter((note) => !note.archived), [notes]);
  const scopedVisionItems = activeVisionItems;
  const scopedBookmarks = activeBookmarks;

  const swimlaneMap = useMemo(() => new Map(swimlanes.map((item) => [item.id, item])), [swimlanes]);
  const boardMap = useMemo(() => new Map(boards.map((item) => [item.id, item])), [boards]);

  const windowStartDate = useMemo(() => addDays(today, windowOffset * 7), [today, windowOffset]);
  const windowDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(windowStartDate, index)), [windowStartDate]);
  const windowKeys = useMemo(() => windowDays.map((date) => formatDateKey(date)), [windowDays]);
  const windowKeySet = useMemo(() => new Set(windowKeys), [windowKeys]);

  const previousWeekStart = useMemo(() => addDays(today, -7), [today]);
  const previousWeekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(previousWeekStart, index)), [previousWeekStart]);
  const previousWeekKeys = useMemo(() => previousWeekDays.map((date) => formatDateKey(date)), [previousWeekDays]);
  const previousWeekKeySet = useMemo(() => new Set(previousWeekKeys), [previousWeekKeys]);

  const todayTasks = useMemo(() => scopedTasks.filter((task) => getDateKeyFromIsoLike(task.date ?? null) === todayKey), [scopedTasks, todayKey]);

  const topTasks = useMemo(
    () =>
      [...todayTasks]
        .filter((task) => !task.completedAt)
        .sort((left, right) => {
          const priorityDiff = getTaskPriorityWeight(left.priority) - getTaskPriorityWeight(right.priority);
          if (priorityDiff !== 0) return priorityDiff;
          const timeDiff = parseTimeValue(left.time) - parseTimeValue(right.time);
          if (timeDiff !== 0) return timeDiff;
          return left.title.localeCompare(right.title);
        })
        .slice(0, 3),
    [todayTasks],
  );

  const todayApprovalRoutines = useMemo(() => scopedApprovalRoutines.filter((routine) => routine.nextDueDate && routine.nextDueDate <= todayKey), [scopedApprovalRoutines, todayKey]);
  const todayPaymentRoutines = useMemo(() => scopedAutoRoutines.filter((routine) => routine.nextDueDate && routine.nextDueDate <= todayKey), [scopedAutoRoutines, todayKey]);

  const scheduleItems = useMemo<ScheduleItem[]>(() => {
    const taskItems: ScheduleItem[] = todayTasks.map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      subtitle: `${swimlaneMap.get(task.swimlaneId)?.name ?? "Unknown lane"} · ${boardMap.get(task.boardId)?.name ?? "Board"}`,
      time: task.time ?? null,
      kind: "task",
      status: task.completedAt ? "Done" : task.priority ? `${task.priority} priority` : "Scheduled",
      href: getTaskHref(task),
    }));

    const routineItems: ScheduleItem[] = todayApprovalRoutines.map((routine) => {
      const isToday = routine.nextDueDate === todayKey;
      const isDone = Boolean(getRoutineLogForDate(routineLogs, routine.id, todayKey));
      return {
        id: `routine-${routine.id}`,
        title: routine.title,
        subtitle: `${routine.type} routine · ${swimlaneMap.get(routine.swimlaneId)?.name ?? "Unknown lane"}`,
        time: routine.eventTime ?? null,
        kind: "routine",
        status: isDone ? "Approved" : isToday ? "Due today" : "Overdue",
        statusTitle: !isDone && !isToday ? `Due on ${formatDueDateLabel(routine.nextDueDate)}` : undefined,
        href: getRoutineHref(routine),
      };
    });

    return [...taskItems, ...routineItems].sort((left, right) => {
      const timeDiff = parseTimeValue(left.time) - parseTimeValue(right.time);
      if (timeDiff !== 0) return timeDiff;
      return left.title.localeCompare(right.title);
    });
  }, [boardMap, routineLogs, swimlaneMap, todayApprovalRoutines, todayKey, todayTasks]);

  const todayDayOfWeek = today.getDay();
  const habitsDueToday = useMemo(
    () =>
      scopedHabits.filter((habit) => {
        if (!habit.frequencyDays || habit.frequencyDays.length === 0) return true;
        return habit.frequencyDays.includes(todayDayOfWeek);
      }),
    [scopedHabits, todayDayOfWeek],
  );

  const habitStats = useMemo(
    () => new Map(scopedHabits.map((habit) => [habit.id, calculateHabitStats(habitLogs.filter((log) => log.habitId === habit.id))])),
    [habitLogs, scopedHabits],
  );

  const strongestHabit = useMemo(
    () =>
      habitsDueToday
        .map((habit) => ({
          habit,
          stats: habitStats.get(habit.id) ?? { currentStreak: 0, longestStreak: 0, completedDays: 0, completionRate: 0 },
        }))
        .sort((left, right) => right.stats.currentStreak - left.stats.currentStreak)[0] ?? null,
    [habitStats, habitsDueToday],
  );

  const windowTasks = useMemo(() => scopedTasks.filter((task) => isDateInWindow(task.date ?? null, windowKeySet)), [scopedTasks, windowKeySet]);
  const windowRoutineLogs = useMemo(() => routineLogs.filter((log) => windowKeySet.has(log.date)), [routineLogs, windowKeySet]);
  const windowPositiveHabitLogs = useMemo(() => habitLogs.filter((log) => windowKeySet.has(getDateKeyFromIsoLike(log.date) ?? "") && log.value > 0), [habitLogs, windowKeySet]);
  const windowTransactions = useMemo(
    () => windowTasks.flatMap((task) => (task.transactions ?? []).filter((transaction) => isDateInWindow(transaction.date ?? task.date ?? null, windowKeySet))),
    [windowKeySet, windowTasks],
  );
  const windowMoney = useMemo(() => aggregateTransactions(windowTransactions), [windowTransactions]);
  const windowScheduledPayments = useMemo(() => scopedAutoRoutines.filter((routine) => routine.nextDueDate && windowKeySet.has(routine.nextDueDate)), [scopedAutoRoutines, windowKeySet]);

  const weeklyCompletionCount =
    windowTasks.filter((task) => task.completedAt && windowKeySet.has(getDateKeyFromIsoLike(task.completedAt) ?? "")).length +
    windowRoutineLogs.filter((log) => log.status === "approved" || log.status === "auto-processed").length +
    windowPositiveHabitLogs.length;

  const weekDayDetails = useMemo<WeekDayDetail[]>(() => {
    return windowDays.map((date) => {
      const key = formatDateKey(date);
      const tasks = windowTasks.filter((task) => getDateKeyFromIsoLike(task.date ?? null) === key);
      const routines = scopedApprovalRoutines.filter((routine) => routine.nextDueDate === key);
      const scheduledPayments = scopedAutoRoutines.filter((routine) => routine.nextDueDate === key);
      const habitsDue = scopedHabits.filter((habit) => {
        if (!habit.frequencyDays || habit.frequencyDays.length === 0) return true;
        return habit.frequencyDays.includes(date.getDay());
      });
      const habitsDone = habitsDue.filter((habit) => {
        const log = getHabitLogForDate(habitLogs, habit.id, key);
        return Boolean(log && log.value > 0);
      }).length;
      const money = aggregateTransactions(tasks.flatMap((task) => (task.transactions ?? []).filter((transaction) => getDateKeyFromIsoLike(transaction.date ?? task.date ?? null) === key)));
      return { key, date, tasks, routines, habitsDue, habitsDone, money, scheduledPayments };
    });
  }, [habitLogs, scopedApprovalRoutines, scopedAutoRoutines, scopedHabits, windowDays, windowTasks]);

  const lastWeekActivity = useMemo<ActivitySummary>(() => {
    const notesAdded = countCreatedInWindow(scopedNotes, previousWeekKeySet);
    const tasksAdded = countCreatedInWindow(scopedTasks, previousWeekKeySet);
    const habitsAdded = countCreatedInWindow(scopedHabits, previousWeekKeySet);
    const routinesAdded = countCreatedInWindow(scopedApprovalRoutines, previousWeekKeySet) + countCreatedInWindow(scopedAutoRoutines, previousWeekKeySet);
    const habitChecks = habitLogs.filter((log) => previousWeekKeySet.has(getDateKeyFromIsoLike(log.date) ?? "") && log.value > 0).length;
    const loggedRoutineCount = routineLogs.filter((log) => previousWeekKeySet.has(log.date)).length;
    const transactionsCaptured = scopedTasks.flatMap((task) => task.transactions ?? []).filter((transaction) => previousWeekKeySet.has(getDateKeyFromIsoLike(transaction.date ?? null) ?? "")).length;
    const recentNotes = [...scopedNotes]
      .filter((note) => isDateInWindow(note.createdAt ?? note.updatedAt ?? null, previousWeekKeySet))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 3);
    return { notesAdded, tasksAdded, habitsAdded, routinesAdded, habitChecks, routineLogs: loggedRoutineCount, transactionsCaptured, recentNotes };
  }, [habitLogs, previousWeekKeySet, routineLogs, scopedApprovalRoutines, scopedAutoRoutines, scopedHabits, scopedNotes, scopedTasks]);

  const focusLabel = "All boards";
  const greetingName = getGreetingName(user?.email);
  const strongestStreakLabel = strongestHabit ? `${strongestHabit.stats.currentStreak} day ${strongestHabit.habit.title.toLowerCase()} streak` : "No active streak yet";
  const windowTitle = windowOffset === 0 ? "Today + next 6 days" : windowOffset < 0 ? "Past 7 days" : "Upcoming 7 days";
  const recentNotes = useMemo(
    () => [...scopedNotes].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()).slice(0, 4),
    [scopedNotes],
  );
  const recentWhiteboards = useMemo(
    () => [...scopedVisionItems].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()).slice(0, 4),
    [scopedVisionItems],
  );
  const recentBookmarks = useMemo(
    () => [...scopedBookmarks].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()).slice(0, 4),
    [scopedBookmarks],
  );

  return (
    <div className="min-h-dvh bg-muted/30">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-3 py-4 md:px-5 md:py-5">
        <div className="grid gap-4 xl:grid-cols-[21rem_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <Card className="py-0 border-border/70 bg-background/90">
              <CardHeader className="space-y-2 px-4 py-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    Weekly navigator
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon-sm" onClick={() => setWindowOffset((value) => value - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon-sm" onClick={() => setWindowOffset((value) => value + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{windowTitle} · {formatWindowRange(windowStartDate)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 pt-0">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border/60 bg-background/70 p-2.5"><div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Tasks</div><div className="mt-1.5 text-xl font-semibold">{windowTasks.length}</div></div>
                  <div className="rounded-xl border border-border/60 bg-background/70 p-2.5"><div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Routines</div><div className="mt-1.5 text-xl font-semibold">{scopedApprovalRoutines.filter((routine) => routine.nextDueDate && windowKeySet.has(routine.nextDueDate)).length + windowScheduledPayments.length}</div></div>
                  <div className="rounded-xl border border-border/60 bg-background/70 p-2.5"><div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Habit wins</div><div className="mt-1.5 text-xl font-semibold">{windowPositiveHabitLogs.length}</div></div>
                  <div className="rounded-xl border border-border/60 bg-background/70 p-2.5"><div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Net</div><div className="mt-1.5 text-xl font-semibold">{windowMoney[0] ? formatCurrency(windowMoney[0].net, windowMoney[0].currency) : formatCurrency(0, DEFAULT_CURRENCY)}</div></div>
                </div>

                <div className="space-y-3">
                  {weekDayDetails.map((day) => {
                    const isToday = day.key === todayKey;
                    return (
                      <div key={day.key} className={cn("rounded-xl border p-3 transition-colors", isToday ? "border-foreground/20 bg-foreground/[0.03]" : "border-border/60 bg-background/70")}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-baseline gap-2">
                            <div className="text-sm font-semibold">{shortWeekdayFormatter.format(day.date)}</div>
                            <div className="text-xs text-muted-foreground">{monthDayFormatter.format(day.date)}</div>
                          </div>
                          {isToday && <Badge className="rounded-full">Today</Badge>}
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px] text-muted-foreground">
                          <div className="rounded-xl bg-muted/60 px-2 py-2"><div className="font-semibold text-foreground">{day.tasks.length}</div>tasks</div>
                          <div className="rounded-xl bg-muted/60 px-2 py-2"><div className="font-semibold text-foreground">{day.routines.length + day.scheduledPayments.length}</div>routines</div>
                          <div className="rounded-xl bg-muted/60 px-2 py-2"><div className="font-semibold text-foreground">{day.habitsDone}/{day.habitsDue.length}</div>habits</div>
                          <div className="rounded-xl bg-muted/60 px-2 py-2"><div className="font-semibold text-foreground">{day.money.length > 0 ? formatCurrency(day.money[0].net, day.money[0].currency) : "-"}</div>money</div>
                        </div>
                        <div className="mt-3 space-y-2">
                          {day.tasks.slice(0, 2).map((task) => (
                            <Link key={task.id} href={getTaskHref(task)} className="flex items-center gap-2 text-sm transition-colors hover:text-foreground">
                              {task.completedAt ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                              <span className="truncate">{task.title}</span>
                            </Link>
                          ))}
                          {day.routines.slice(0, 1).map((routine) => (
                            <Link key={routine.id} href={getRoutineHref(routine)} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                              <Repeat className="h-4 w-4" />
                              <span className="truncate">{routine.title}</span>
                            </Link>
                          ))}
                          {day.scheduledPayments.slice(0, 1).map((routine) => (
                            <Link key={routine.id} href={getRoutineHref(routine)} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                              <Wallet className="h-4 w-4" />
                              <span className="truncate">{routine.title} · {formatCurrency(routine.paymentAmount ?? 0, routine.paymentCurrency ?? DEFAULT_CURRENCY)}</span>
                            </Link>
                          ))}
                          {day.tasks.length === 0 && day.routines.length === 0 && day.scheduledPayments.length === 0 && <div className="text-sm text-muted-foreground">No scheduled detail.</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="space-y-6">
            <Card className="py-0 overflow-hidden border-border/70 bg-background/90 backdrop-blur-sm">
              <CardContent className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full border-border/70 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.16em]">{focusLabel}</Badge>
                    <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em]">{windowTitle}</Badge>
                  </div>
                  <div>
                    <div className="text-4xl font-semibold tracking-tight text-foreground md:text-6xl">{weekdayFormatter.format(today)}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{fullDateFormatter.format(today)} · {formatWindowRange(windowStartDate)}</div>
                  </div>
                  <div className="max-w-3xl text-lg leading-8 text-foreground/90 md:text-2xl md:leading-10">{getTimeOfDayGreeting()}, {greetingName}. You have {pendingCount} pending items today, and {strongestStreakLabel} is setting the pace for this week.</div>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <HomeMetric label="Pending Today" value={String(pendingCount)} hint="Tasks, habits, and routines still open" icon={BellDot} />
                  <HomeMetric label="Window completions" value={String(weeklyCompletionCount)} hint="Tasks, routines, and habit logs in the visible 7-day window" icon={CheckCircle2} />
                  <HomeMetric label="Strongest Streak" value={strongestHabit ? `${strongestHabit.stats.currentStreak}d` : "0d"} hint={strongestHabit ? strongestHabit.habit.title : "No streak leader yet"} icon={Flame} />
                  <HomeMetric label="Window Net" value={windowMoney[0] ? formatCurrency(windowMoney[0].net, windowMoney[0].currency) : formatCurrency(0, DEFAULT_CURRENCY)} hint={windowMoney[0] ? `${windowMoney[0].currency} current currency snapshot` : "No cash movement in this window"} icon={Wallet} />
                </div>
              </CardContent>
            </Card>

            <Card className="py-0 border-border/70 bg-background/90">
              <CardHeader className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Last week activity</CardTitle>
                    <CardDescription>{formatWindowRange(previousWeekStart)} retrospective for completed work and creation activity.</CardDescription>
                  </div>
                  <Badge variant="outline" className="rounded-full">Past 7 days</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-5 pb-5 pt-0">
                <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-border/60 bg-background/70 p-3"><div className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-muted-foreground" /> Notes added</div><div className="mt-2 text-2xl font-semibold">{lastWeekActivity.notesAdded}</div><Link href="/notes" className="mt-1.5 inline-flex text-xs text-muted-foreground hover:text-foreground">Open notes</Link></div>
                  <div className="rounded-xl border border-border/60 bg-background/70 p-3"><div className="flex items-center gap-2 text-sm font-semibold"><ListTodo className="h-4 w-4 text-muted-foreground" /> Tasks created</div><div className="mt-2 text-2xl font-semibold">{lastWeekActivity.tasksAdded}</div><div className="mt-1 text-xs text-muted-foreground">Routines logged: {lastWeekActivity.routineLogs}</div></div>
                  <div className="rounded-xl border border-border/60 bg-background/70 p-3"><div className="flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-muted-foreground" /> Habit checks</div><div className="mt-2 text-2xl font-semibold">{lastWeekActivity.habitChecks}</div><div className="mt-1 text-xs text-muted-foreground">Habits added: {lastWeekActivity.habitsAdded}</div></div>
                  <div className="rounded-xl border border-border/60 bg-background/70 p-3"><div className="flex items-center gap-2 text-sm font-semibold"><Route className="h-4 w-4 text-muted-foreground" /> Routines added</div><div className="mt-2 text-2xl font-semibold">{lastWeekActivity.routinesAdded}</div><div className="mt-1 text-xs text-muted-foreground">Transactions captured: {lastWeekActivity.transactionsCaptured}</div></div>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Recent notes from last week</div>
                      <div className="text-xs text-muted-foreground">Deep links into notes are now available from Home.</div>
                    </div>
                    <Link href="/notes" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
                  </div>
                  <div className="space-y-2">
                    {lastWeekActivity.recentNotes.length > 0 ? lastWeekActivity.recentNotes.map((note) => (
                      <Link key={note.id} href={getNoteHref(note)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{note.title || "Untitled note"}</span>
                      </Link>
                    )) : <div className="text-sm text-muted-foreground">No notes were created or updated last week.</div>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="py-0 border-border/70 bg-background/90">
              <CardHeader className="px-5 py-4">
                <CardTitle>Top 3 for today</CardTitle>
                <CardDescription>Priority-sorted tasks scheduled for the current day.</CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <div className="grid gap-2.5 lg:grid-cols-3">
                  {topTasks.length > 0 ? topTasks.map((task, index) => (
                    <Link key={task.id} href={getTaskHref(task)} className="rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm transition-colors hover:border-border hover:bg-background">
                      <div className="text-3xl font-light tracking-tight text-muted-foreground">0{index + 1}</div>
                      <div className="mt-3 flex items-start gap-2 text-base font-semibold"><span className="truncate">{task.title}</span><SquareArrowOutUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /></div>
                      <div className="mt-1 text-sm text-muted-foreground">{task.time ?? "Any time"} · {swimlaneMap.get(task.swimlaneId)?.name ?? "Unknown lane"}</div>
                      <div className="mt-4 flex items-center gap-2"><Badge variant="outline" className="rounded-full">{task.priority ?? "planned"}</Badge>{task.completedAt && <Badge className="rounded-full bg-emerald-600">Done</Badge>}</div>
                    </Link>
                  )) : <div className="col-span-full rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">No scheduled tasks for today yet.</div>}
                </div>
              </CardContent>
            </Card>

            <Card className="py-0 border-border/70 bg-background/90">
              <CardHeader className="px-5 py-4">
                <CardTitle>Schedule</CardTitle>
                <CardDescription>Today&apos;s tasks and due routines in one chronological view.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 px-5 pb-5 pt-0">
                {scheduleItems.length > 0 ? scheduleItems.map((item) => (
                  <ResourceRow key={item.id} href={item.href} title={`${item.time ?? "Any"} · ${item.title}`} meta={item.subtitle} right={<Badge variant="secondary" title={item.statusTitle} className={cn("rounded-full capitalize", statusTone(item.status))}>{item.status}</Badge>} accentClass={kindAccent(item.kind)} />
                )) : <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">Nothing is scheduled for today.</div>}
              </CardContent>
            </Card>

            <Card className="py-0 border-border/70 bg-background/90">
              <CardHeader className="px-5 py-4">
                <CardTitle>Window overview</CardTitle>
                <CardDescription>High-level momentum across focus, consistency, and money in the visible seven-day range.</CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-border/60 bg-background/70 p-3"><div className="flex items-center gap-2 text-sm font-semibold"><ListTodo className="h-4 w-4 text-muted-foreground" /> Tasks in window</div><div className="mt-2 text-2xl font-semibold">{windowTasks.length}</div><div className="mt-1 text-xs text-muted-foreground">{windowTasks.filter((task) => !task.completedAt).length} still open</div></div>
                  <div className="rounded-xl border border-border/60 bg-background/70 p-3"><div className="flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-muted-foreground" /> Habit cadence</div><div className="mt-2 text-2xl font-semibold">{windowPositiveHabitLogs.length}</div><div className="mt-1 text-xs text-muted-foreground">positive habit logs recorded in the visible window</div></div>
                  <div className="rounded-xl border border-border/60 bg-background/70 p-3"><div className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="h-4 w-4 text-muted-foreground" /> Routine flow</div><div className="mt-2 text-2xl font-semibold">{windowRoutineLogs.length}</div><div className="mt-1 text-xs text-muted-foreground">routine logs captured in this window</div></div>
                  <div className="rounded-xl border border-border/60 bg-background/70 p-3"><div className="flex items-center gap-2 text-sm font-semibold"><Wallet className="h-4 w-4 text-muted-foreground" /> Scheduled payments</div><div className="mt-2 text-2xl font-semibold">{windowScheduledPayments.length}</div><div className="mt-1 text-xs text-muted-foreground">auto-pay routines on this seven-day plan</div></div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card className="py-0 border-border/70 bg-background/90 xl:col-span-1">
                <CardHeader className="px-5 py-4">
                  <CardTitle>Habits today</CardTitle>
                  <CardDescription>Daily habits with streak context and completion status.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5 px-5 pb-5 pt-0">
                  {habitsDueToday.length > 0 ? habitsDueToday.map((habit) => {
                    const log = getHabitLogForDate(habitLogs, habit.id, todayKey);
                    const stats = habitStats.get(habit.id);
                    const status = log?.value && log.value > 0 ? "Done" : log?.value === -1 ? "Skipped" : "Due today";
                    return <ResourceRow key={habit.id} href={getHabitHref(habit)} title={habit.title} meta={`${boardMap.get(habit.boardId)?.name ?? "Board"} · ${swimlaneMap.get(habit.swimlaneId)?.name ?? "Lane"} · ${stats?.currentStreak ?? 0} day streak`} right={<Badge variant="secondary" className={cn("rounded-full", statusTone(status))}>{status}</Badge>} accentClass="border-l-emerald-500" />;
                  }) : <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">No habits are due today in the current scope.</div>}
                </CardContent>
              </Card>

              <Card className="py-0 border-border/70 bg-background/90 xl:col-span-1">
                <CardHeader className="px-5 py-4">
                  <CardTitle>Routines today</CardTitle>
                  <CardDescription>Approval-required routines and auto payments that are due now.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5 px-5 pb-5 pt-0">
                  {[...todayApprovalRoutines, ...todayPaymentRoutines].length > 0 ? [...todayApprovalRoutines, ...todayPaymentRoutines].map((routine) => {
                    const log = getRoutineLogForDate(routineLogs, routine.id, todayKey);
                    const isOverdue = !log && routine.nextDueDate !== todayKey;
                    const status = log ? log.status : routine.nextDueDate === todayKey ? "Due today" : "Overdue";
                    const statusTitle = isOverdue ? `Due on ${formatDueDateLabel(routine.nextDueDate)}` : undefined;
                    return <ResourceRow key={routine.id} href={getRoutineHref(routine)} title={routine.title} meta={`${boardMap.get(routine.boardId)?.name ?? "Board"} · ${swimlaneMap.get(routine.swimlaneId)?.name ?? "Lane"} · ${routine.type}${routine.eventTime ? ` · ${routine.eventTime}` : ""}${routine.paymentAmount ? ` · ${formatCurrency(routine.paymentAmount, routine.paymentCurrency ?? DEFAULT_CURRENCY)}` : ""}`} right={<Badge variant="secondary" title={statusTitle} className={cn("rounded-full capitalize", statusTone(status))}>{status}</Badge>} accentClass="border-l-violet-500" />;
                  }) : <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">No routines are due today.</div>}
                </CardContent>
              </Card>

              <Card className="py-0 border-border/70 bg-background/90 xl:col-span-1">
                <CardHeader className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Payments</CardTitle>
                      <CardDescription>Processed window money plus payments scheduled for today.</CardDescription>
                    </div>
                    <Link href="/tasks/cash-flow-view" className="text-xs text-muted-foreground hover:text-foreground">Open cash flow</Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 px-5 pb-5 pt-0">
                  <div className="space-y-2">
                    {windowMoney.length > 0 ? windowMoney.map((money) => (
                      <Link key={money.currency} href="/tasks/cash-flow-view" className="block rounded-xl border border-border/60 bg-background/70 p-3 transition-colors hover:bg-background">
                        <div className="flex items-center justify-between gap-3"><div className="text-sm font-semibold">{money.currency}</div><div className="text-sm font-medium">{formatCurrency(money.net, money.currency)}</div></div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground"><div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">Income · {formatCurrency(money.income, money.currency)}</div><div className="rounded-xl bg-rose-500/10 px-3 py-2 text-rose-700 dark:text-rose-300">Expense · {formatCurrency(money.expense, money.currency)}</div></div>
                      </Link>
                    )) : <div className="rounded-xl border border-dashed border-border/70 p-3 text-sm text-muted-foreground">No processed transactions in this window.</div>}
                  </div>
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Scheduled today</div>
                    <div className="space-y-2">
                      {todayPaymentRoutines.length > 0 ? todayPaymentRoutines.map((routine) => (
                        <ResourceRow key={routine.id} href={getRoutineHref(routine)} title={routine.title} meta={`${boardMap.get(routine.boardId)?.name ?? "Board"} · ${swimlaneMap.get(routine.swimlaneId)?.name ?? "Lane"}`} right={<div className="text-sm font-medium">{formatCurrency(routine.paymentAmount ?? 0, routine.paymentCurrency ?? DEFAULT_CURRENCY)}</div>} accentClass="border-l-amber-500" />
                      )) : <div className="rounded-xl border border-dashed border-border/70 p-3 text-sm text-muted-foreground">No payment routines due today.</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card className="border-border/70 bg-background/90 xl:col-span-1">
                <CardHeader className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Notes</CardTitle>
                      <CardDescription>Latest notes across all boards.</CardDescription>
                    </div>
                    <Link href="/notes" className="text-xs text-muted-foreground hover:text-foreground">Open notes</Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 px-5 pb-5 pt-0">
                  {recentNotes.length > 0 ? recentNotes.map((note) => (
                    <ResourceRow
                      key={note.id}
                      href={getNoteHref(note)}
                      title={note.title || "Untitled note"}
                      meta={`${boardMap.get(note.boardId)?.name ?? "Board"} · ${swimlaneMap.get(note.swimlaneId)?.name ?? "Lane"}`}
                      accentClass="border-l-sky-500"
                      right={<FileText className="h-4 w-4 text-muted-foreground" />}
                    />
                  )) : <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">No active notes yet.</div>}
                </CardContent>
              </Card>

              <Card className="py-0 border-border/70 bg-background/90 xl:col-span-1">
                <CardHeader className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Whiteboards</CardTitle>
                      <CardDescription>Latest whiteboards across all boards.</CardDescription>
                    </div>
                    <Link href="/whiteboards" className="text-xs text-muted-foreground hover:text-foreground">Open whiteboards</Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 px-5 pb-5 pt-0">
                  {recentWhiteboards.length > 0 ? recentWhiteboards.map((item) => (
                    <ResourceRow
                      key={item.id}
                      href={getWhiteboardHref(item)}
                      title={item.title || "Untitled whiteboard"}
                      meta={`${boardMap.get(item.boardId)?.name ?? "Board"} · ${swimlaneMap.get(item.swimlaneId)?.name ?? "Lane"}`}
                      accentClass="border-l-orange-500"
                      right={<PenTool className="h-4 w-4 text-muted-foreground" />}
                    />
                  )) : <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">No active whiteboards yet.</div>}
                </CardContent>
              </Card>

              <Card className="py-0 border-border/70 bg-background/90 xl:col-span-1">
                <CardHeader className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Bookmarks</CardTitle>
                      <CardDescription>Latest bookmarks across all boards.</CardDescription>
                    </div>
                    <Link href="/bookmarks" className="text-xs text-muted-foreground hover:text-foreground">Open bookmarks</Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 px-5 pb-5 pt-0">
                  {recentBookmarks.length > 0 ? recentBookmarks.map((bookmark) => (
                    <ResourceRow
                      key={bookmark.id}
                      href={getBookmarkHref(bookmark)}
                      title={bookmark.title || bookmark.domain || "Untitled bookmark"}
                      meta={`${boardMap.get(bookmark.boardId)?.name ?? "Board"} · ${swimlaneMap.get(bookmark.swimlaneId)?.name ?? "Lane"} · ${bookmark.domain || "Unknown domain"}`}
                      accentClass="border-l-amber-500"
                      right={<Bookmark className="h-4 w-4 text-muted-foreground" />}
                    />
                  )) : <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">No active bookmarks yet.</div>}
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}