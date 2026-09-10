"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  Repeat,
  Pencil,
  Archive,
  Trash2,
  Play,
  Search,
  Plus,
  CheckCircle2,
  MessageSquare,
  Timer,
  CreditCard,
  SkipForward,
  Zap,
  ArchiveIcon,
} from "lucide-react";
import type { Routine, RoutineLog, Task } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoutineMiniTaskCard } from "@/components/routines/RoutineMiniTaskCard";
import { RoutineTaskDetailModal } from "@/components/routines/RoutineTaskDetailModal";
import { useLogsByRoutine } from "@/stores/hooks/use-routines";
import { useTasks } from "@/stores/hooks/use-tasks";
import { getTodayDateKey } from "@/lib/date";
import { putRoutine, putRoutineLog, putTask } from "@/lib/db";
import { computeNextDueDate } from "@/lib/recurrence";
import { getEffectiveRecurrenceForRoutine, buildTimeblockMap } from "@/lib/timeblocks/effective-recurrence";
import { useAllTimeblocks } from "@/stores/hooks/use-timeblocks";
import { generateId } from "@/lib/uuid";
import { DEFAULT_CURRENCY } from "@/lib/constants";

// ── Types ────────────────────────────────────────────────────────────────────

type Props = {
  routine: Routine;
  boardName?: string;
  swimlaneName?: string;
  swimlaneColor?: string;
  onEdit?: (routine: Routine) => void;
  onArchive?: (routineId: string) => void;
  onDelete?: (routineId: string) => void;
};

type ItemFilter = "all" | "active" | "archived";

type FeedEventType =
  | "task-created"
  | "task-done"
  | "task-archived"
  | "comment"
  | "worklog"
  | "payment"
  | "skipped"
  | "auto-processed";

type FeedEvent = {
  id: string;
  timestamp: string;
  type: FeedEventType;
  taskTitle?: string;
  taskType?: Routine["type"];
  meta?: string;
};

// ── Feed builder ─────────────────────────────────────────────────────────────

function formatFeedTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

function buildFeed(
  routineLogs: RoutineLog[],
  tasks: Task[],
  routineType: Routine["type"],
): FeedEvent[] {
  const events: FeedEvent[] = [];
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  for (const log of routineLogs) {
    const task = log.taskId ? taskById.get(log.taskId) : undefined;
    if (log.status === "auto-processed") {
      events.push({
        id: `log-auto-${log.id}`,
        timestamp: log.createdAt,
        type: "auto-processed",
        taskTitle: task?.title,
        taskType: routineType,
      });
    } else if (log.status === "skipped") {
      events.push({
        id: `log-skip-${log.id}`,
        timestamp: log.createdAt,
        type: "skipped",
        taskType: routineType,
      });
    }
  }

  for (const task of tasks) {
    events.push({
      id: `task-created-${task.id}`,
      timestamp: task.createdAt,
      type: "task-created",
      taskTitle: task.title,
      taskType: routineType,
    });
    if (task.completedAt) {
      events.push({
        id: `task-done-${task.id}`,
        timestamp: task.completedAt,
        type: "task-done",
        taskTitle: task.title,
        taskType: routineType,
      });
    }
    if (task.archived && task.archivedAt) {
      events.push({
        id: `task-archived-${task.id}`,
        timestamp: task.archivedAt,
        type: "task-archived",
        taskTitle: task.title,
        taskType: routineType,
      });
    }
    for (const c of task.comments ?? []) {
      events.push({
        id: `comment-${c.id}`,
        timestamp: c.createdAt,
        type: "comment",
        taskTitle: task.title,
        taskType: routineType,
        meta: c.text.length > 60 ? c.text.slice(0, 60) + "…" : c.text,
      });
    }
    for (const w of task.worklogs ?? []) {
      events.push({
        id: `worklog-${w.id}`,
        timestamp: w.endedAt,
        type: "worklog",
        taskTitle: task.title,
        taskType: routineType,
        meta: `${w.durationMinutes} min`,
      });
    }
    for (const tx of task.transactions ?? []) {
      events.push({
        id: `payment-${tx.id}`,
        timestamp: task.createdAt,
        type: "payment",
        taskTitle: task.title,
        taskType: routineType,
        meta: `${tx.type === "expense" ? "-" : "+"}${tx.amount} ${tx.currency}`,
      });
    }
  }

  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

const FEED_CONFIG: Record<
  FeedEventType,
  { icon: React.ElementType; label: string; iconClass: string }
> = {
  "task-created": { icon: Plus, label: "Created", iconClass: "text-blue-500" },
  "task-done": { icon: CheckCircle2, label: "Marked done", iconClass: "text-green-500" },
  "task-archived": { icon: ArchiveIcon, label: "Archived", iconClass: "text-muted-foreground" },
  comment: { icon: MessageSquare, label: "Comment added", iconClass: "text-violet-500" },
  worklog: { icon: Timer, label: "Pomodoro", iconClass: "text-orange-500" },
  payment: { icon: CreditCard, label: "Payment recorded", iconClass: "text-emerald-500" },
  skipped: { icon: SkipForward, label: "Skipped", iconClass: "text-muted-foreground" },
  "auto-processed": { icon: Zap, label: "Auto-processed", iconClass: "text-blue-400" },
};

const TYPE_BADGE: Record<Routine["type"], string> = {
  task: "border-blue-500/40 text-blue-700 dark:text-blue-300",
  event: "border-violet-500/40 text-violet-700 dark:text-violet-300",
  payment: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
};

function recurrenceSummary(r: Routine["recurrence"]): string {
  const { type, interval, daysOfWeek, dayOfMonth } = r;
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  switch (type) {
    case "daily":
      return interval === 1 ? "Every day" : `Every ${interval} days`;
    case "weekly": {
      const days =
        daysOfWeek && daysOfWeek.length > 0
          ? daysOfWeek.map((d) => DAY_NAMES[d]).join(", ")
          : "week";
      return interval === 1 ? `Every ${days}` : `Every ${interval} weeks on ${days}`;
    }
    case "monthly":
      return dayOfMonth ? `Monthly on day ${dayOfMonth}` : `Every ${interval} month(s)`;
    case "yearly":
      return "Yearly";
    case "custom":
      return `Every ${interval} days`;
    default:
      return "Recurring";
  }
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RoutineDetailView({
  routine,
  boardName,
  swimlaneName,
  swimlaneColor,
  onEdit,
  onArchive,
  onDelete,
}: Props) {
  const logsByRoutine = useLogsByRoutine();
  const routineLogs = useMemo(() => logsByRoutine[routine.id] ?? [], [logsByRoutine, routine.id]);
  const allTasks = useTasks();
  const today = getTodayDateKey();
  const allTimeblocks = useAllTimeblocks();
  const timeblockMap = useMemo(() => buildTimeblockMap(allTimeblocks), [allTimeblocks]);

  const [runOpen, setRunOpen] = useState(false);
  const [runDate, setRunDate] = useState(today);
  const [runTitle, setRunTitle] = useState(routine.title);
  const [running, setRunning] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [itemFilter, setItemFilter] = useState<ItemFilter>("all");

  const relatedTasks = useMemo(() => {
    return allTasks
      .filter((t) => t.routineId === routine.id)
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allTasks, routine.id]);

  const taskStats = useMemo(() => {
    const total = relatedTasks.length;
    const done = relatedTasks.filter((t) => !!t.completedAt && !t.archived).length;
    const archived = relatedTasks.filter((t) => !!t.archived).length;
    return { total, done, archived };
  }, [relatedTasks]);

  const visibleItems = useMemo(() => {
    let list = relatedTasks;
    if (itemFilter === "active") list = list.filter((t) => !t.archived);
    else if (itemFilter === "archived") list = list.filter((t) => !!t.archived);
    const q = itemSearch.trim().toLowerCase();
    if (q) list = list.filter((t) => t.title.toLowerCase().includes(q));
    return list;
  }, [relatedTasks, itemFilter, itemSearch]);

  const feedEvents = useMemo(
    () => buildFeed(routineLogs, relatedTasks, routine.type),
    [routineLogs, relatedTasks, routine.type],
  );

  async function handleRun() {
    const title = runTitle.trim();
    if (!title || running) return;
    setRunning(true);
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
                date: runDate,
              },
            ]
          : [];

      await putTask({
        id: taskId,
        boardId: routine.boardId,
        swimlaneId: routine.swimlaneId,
        columnId: routine.columnId,
        title,
        description: "",
        labels: [],
        comments: [],
        checklists: [],
        transactions,
        worklogs: [],
        routineId: routine.id,
        ...(routine.type === "event"
          ? { date: runDate, time: routine.eventTime ?? null }
          : routine.type === "task"
            ? { date: runDate }
            : {}),
        createdAt: nowIso,
        updatedAt: nowIso,
      } as Task);

      await putRoutineLog({
        routineId: routine.id,
        date: runDate,
        status: "approved",
        taskId,
        createdAt: nowIso,
      });

      const nextDueDate = computeNextDueDate(getEffectiveRecurrenceForRoutine(routine, timeblockMap), runDate);
      await putRoutine({ id: routine.id, nextDueDate, lastGeneratedAt: runDate });

      setRunOpen(false);
    } finally {
      setRunning(false);
    }
  }

  function openRun() {
    setRunDate(today);
    setRunTitle(routine.title);
    setRunOpen(true);
  }

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b px-4 py-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="flex-1 truncate text-base font-semibold">{routine.title}</h2>
                <Badge
                  variant="outline"
                  className={`shrink-0 text-[10px] ${TYPE_BADGE[routine.type]}`}
                >
                  {routine.type}
                </Badge>
              </div>
              {routine.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {routine.description}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {/* Grey badge — same style as NotesBoard */}
              {swimlaneName && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {swimlaneName}
                  {boardName && <span className="opacity-70"> · {boardName}</span>}
                </span>
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Edit"
                  onClick={() => onEdit(routine)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-green-700 hover:bg-green-50 hover:text-green-800 dark:text-green-400 dark:hover:bg-green-950"
                title="Run now"
                onClick={openRun}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
              {onArchive && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Archive"
                  onClick={() => onArchive(routine.id)}
                >
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  title="Delete"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="border-b px-4 py-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Repeat className="h-3.5 w-3.5 shrink-0" />
              <span>{recurrenceSummary(routine.recurrence)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>
                Next due:{" "}
                <span className="font-medium text-foreground">
                  {routine.nextDueDate ?? "\u2014"}
                </span>
              </span>
            </div>
            {routine.type === "event" && routine.eventTime && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Time:{" "}
                  <span className="font-medium text-foreground">{routine.eventTime}</span>
                </span>
              </div>
            )}
            {routine.type === "payment" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {routine.paymentAmount != null ? routine.paymentAmount : "\u2014"}{" "}
                  {routine.paymentCurrency ?? ""}
                </span>
                {routine.paymentType && (
                  <Badge
                    variant="outline"
                    className={
                      routine.paymentType === "income"
                        ? "border-green-500/40 text-[10px] text-green-700 dark:text-green-400"
                        : "border-red-500/40 text-[10px] text-red-700 dark:text-red-400"
                    }
                  >
                    {routine.paymentType}
                  </Badge>
                )}
                {routine.paymentNote && <span className="truncate">{routine.paymentNote}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="activity" className="flex min-h-0 flex-1 flex-col">
          <div className="border-b px-4 pt-2">
            <TabsList variant="line" className="h-8">
              <TabsTrigger value="activity" className="text-xs">
                Activity
              </TabsTrigger>
              <TabsTrigger value="items" className="text-xs">
                Tasks
                {taskStats.total > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {taskStats.total}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Activity tab */}
          <TabsContent value="activity" className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <div className="p-4">
                {feedEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No activity yet.</p>
                ) : (
                  <div className="relative space-y-0">
                    <div className="absolute bottom-2 left-3.25 top-2 w-px bg-border" />
                    {feedEvents.map((event) => {
                      const cfg = FEED_CONFIG[event.type];
                      const Icon = cfg.icon;
                      return (
                        <div key={event.id} className="relative flex gap-3 py-2.5">
                          <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background">
                            <Icon className={`h-3.5 w-3.5 ${cfg.iconClass}`} />
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                              <span className="text-xs font-medium">{cfg.label}</span>
                              {event.taskTitle && (
                                <span className="truncate text-xs text-muted-foreground">
                                  &ldquo;{event.taskTitle}&rdquo;
                                </span>
                              )}
                              {event.taskType && (
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] ${TYPE_BADGE[event.taskType]}`}
                                >
                                  {event.taskType}
                                </Badge>
                              )}
                            </div>
                            {event.meta && (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {event.meta}
                              </p>
                            )}
                            <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                              {formatFeedTime(event.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tasks tab */}
          <TabsContent value="items" className="flex min-h-0 flex-1 flex-col">
            <div className="border-b px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search…"
                    className="h-7 pl-7 text-xs"
                  />
                </div>
                <div className="flex rounded-md border text-[10px]">
                  {(["all", "active", "archived"] as ItemFilter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setItemFilter(f)}
                      className={`px-2 py-1 capitalize transition-colors first:rounded-l-md last:rounded-r-md ${
                        itemFilter === f
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2 px-6 py-3">
                {visibleItems.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    {relatedTasks.length === 0
                      ? "No tasks generated yet."
                      : "No tasks match the filter."}
                  </p>
                ) : (
                  visibleItems.map((task) => (
                    <RoutineMiniTaskCard
                      key={task.id}
                      task={task}
                      swimlaneColor={swimlaneColor}
                      onClick={() => setSelectedTask(task)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <RoutineTaskDetailModal
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Run dialog */}
      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Run Routine</DialogTitle>
            <DialogDescription>
              Manually trigger this routine. A task will be created and the schedule advanced.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="run-title">Task title</Label>
              <Input
                id="run-title"
                value={runTitle}
                onChange={(e) => setRunTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleRun(); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="run-date">Date</Label>
              <Input
                id="run-date"
                type="date"
                value={runDate}
                onChange={(e) => setRunDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRun} disabled={running || !runTitle.trim() || !runDate}>
              {running ? "Running…" : "Run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete routine?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{routine.title}&rdquo;. Generated tasks and
              activity logs will remain but will no longer be linked.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete?.(routine.id);
                setDeleteOpen(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
