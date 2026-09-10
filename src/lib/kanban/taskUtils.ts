import { nanoid } from "nanoid";

import type { BacklogItem, Task } from "@/lib/types";

import { getWeekStart, isFutureDate, parseLocalDate } from "./dateUtils";

export function normalizeTask(task: Task): Task {
  return {
    ...task,
    labels: task.labels ?? [],
    comments: task.comments ?? [],
    checklists: task.checklists ?? [],
    transactions: task.transactions ?? [],
    worklogs: task.worklogs ?? [],
    pomodoros: task.pomodoros ?? 0,
    order: task.order ?? 0,
    date: task.date ?? null,
    deadline: task.deadline ?? null,
    priority: task.priority ?? "low",
    archived: task.archived ?? false,
    archivedAt: task.archivedAt ?? null,
    completedAt: task.completedAt ?? null,
  };
}

export function buildTask(params: {
  boardId: string;
  swimlaneId: string;
  columnId: string;
}): Task {
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    boardId: params.boardId,
    swimlaneId: params.swimlaneId,
    columnId: params.columnId,
    title: "New task",
    description: "",
    labels: [],
    comments: [],
    checklists: [],
    transactions: [],
    worklogs: [],
    pomodoros: 0,
    order: 0,
    date: null,
    deadline: null,
    priority: "low",
    archived: false,
    archivedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildBacklogItem(swimlaneId: string, text: string): BacklogItem {
  return {
    id: nanoid(),
    swimlaneId,
    text,
    createdAt: new Date().toISOString(),
  };
}

export function getColumnTasks(tasks: Task[], swimlaneId: string, columnId: string) {
  return tasks
    .filter((task) => task.swimlaneId === swimlaneId && task.columnId === columnId)
    .sort((a, b) => {
      const aOrder = a.order ?? 0;
      const bOrder = b.order ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.createdAt.localeCompare(b.createdAt);
    });
}

export function buildTasksBySwimlaneAndColumn({
  tasks,
  swimlaneIds,
  columnIds,
}: {
  tasks: Task[];
  swimlaneIds: string[];
  columnIds: string[];
}) {
  const grouped: Record<string, Record<string, Task[]>> = {};

  for (const swimlaneId of swimlaneIds) {
    grouped[swimlaneId] = Object.fromEntries(columnIds.map((columnId) => [columnId, [] as Task[]]));
  }

  for (const task of tasks) {
    const laneBuckets = grouped[task.swimlaneId] ??
      (grouped[task.swimlaneId] = Object.fromEntries(columnIds.map((columnId) => [columnId, [] as Task[]])));
    const columnBucket = laneBuckets[task.columnId] ?? (laneBuckets[task.columnId] = []);
    columnBucket.push(task);
  }

  // Sort each column bucket by order (mirrors getColumnTasks sort logic)
  for (const laneBuckets of Object.values(grouped)) {
    for (const bucket of Object.values(laneBuckets)) {
      bucket.sort((a, b) => {
        const aOrder = a.order ?? 0;
        const bOrder = b.order ?? 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.createdAt.localeCompare(b.createdAt);
      });
    }
  }

  return grouped;
}

export function areTaskCollectionsEqual(previousTasks: Task[], nextTasks: Task[]) {
  if (previousTasks === nextTasks) return true;
  if (previousTasks.length !== nextTasks.length) return false;

  for (let index = 0; index < previousTasks.length; index += 1) {
    const previous = previousTasks[index];
    const next = nextTasks[index];

    if (
      previous.id !== next.id ||
      previous.updatedAt !== next.updatedAt ||
      previous.order !== next.order ||
      previous.columnId !== next.columnId ||
      previous.swimlaneId !== next.swimlaneId ||
      previous.archived !== next.archived ||
      previous.archivedAt !== next.archivedAt ||
      previous.completedAt !== next.completedAt
    ) {
      return false;
    }
  }

  return true;
}

export type TaskBoardFilterState = {
  searchText: string;
  date: string;
  deadline: string;
  priorities: string[];
  labels: string[];
};

function matchesTaskDateFilter(value: string | null | undefined, filter: string) {
  if (filter === "all") return true;
  if (filter === "none") return !value;

  if (!value) return false;
  const date = parseLocalDate(value);
  if (!date) return false;

  switch (filter) {
    case "today": {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setDate(end.getDate() + 1);
      return date >= today && date < end;
    }
    case "week": {
      const start = getWeekStart(new Date());
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return date >= start && date < end;
    }
    case "next-7": {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return date >= start && date < end;
    }
    case "month": {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return date >= start && date < end;
    }
    case "next-30": {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 30);
      return date >= start && date < end;
    }
    default:
      return true;
  }
}

export function filterTasksByBoardFilters(tasks: Task[], filters: TaskBoardFilterState) {
  const searchQuery = filters.searchText.trim().toLowerCase();

  return tasks.filter((task) => {
    if (searchQuery) {
      const titleMatch = task.title.toLowerCase().includes(searchQuery);
      const descMatch = task.description?.toLowerCase().includes(searchQuery) ?? false;
      if (!titleMatch && !descMatch) return false;
    }

    if (!filters.priorities.includes("all") && !filters.priorities.includes(task.priority ?? "low")) {
      return false;
    }

    if (filters.labels.length > 0) {
      const taskLabels = task.labels ?? [];
      if (!filters.labels.some((label) => taskLabels.includes(label))) {
        return false;
      }
    }

    if (!matchesTaskDateFilter(task.date ?? null, filters.date)) {
      return false;
    }

    if (!matchesTaskDateFilter(task.deadline ?? null, filters.deadline)) {
      return false;
    }

    return true;
  });
}

export type TaskDropResult = {
  updatedTasks: Task[];
  updatedMap: Map<string, Task>;
  movedTask: Task;
  previousLaneId: string;
  previousColumnId: string;
  nextLaneId: string;
  nextColumnId: string;
};

export function applyTaskDrop({
  tasks,
  taskId,
  target,
}: {
  tasks: Task[];
  taskId: string;
  target: string;
}): TaskDropResult | null {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return null;

  let nextLaneId = task.swimlaneId;
  let nextColumnId = task.columnId;
  let insertIndex: number | null = null;

  if (target.startsWith("column::")) {
    // Column-only drop target (Todoist-style list view): keep swimlane.
    nextColumnId = target.slice("column::".length);
  } else if (target.includes("::")) {
    const parts = target.split("::");
    nextLaneId = parts[0];
    nextColumnId = parts[1];
  } else {
    const overTask = tasks.find((item) => item.id === target);
    if (!overTask) return null;
    nextLaneId = overTask.swimlaneId;
    nextColumnId = overTask.columnId;
    const destTasks = getColumnTasks(tasks, nextLaneId, nextColumnId);
    insertIndex = Math.max(
      0,
      destTasks.findIndex((item) => item.id === overTask.id),
    );
  }

  const previousLaneId = task.swimlaneId;
  const previousColumnId = task.columnId;
  const sameColumn = previousLaneId === nextLaneId && previousColumnId === nextColumnId;

  const sourceTasks = getColumnTasks(tasks, previousLaneId, previousColumnId).filter(
    (item) => item.id !== task.id,
  );
  const destinationTasks = sameColumn
    ? sourceTasks
    : getColumnTasks(tasks, nextLaneId, nextColumnId);

  const nextTasks = [...destinationTasks];
  const targetIndex = insertIndex ?? nextTasks.length;
  nextTasks.splice(targetIndex, 0, {
    ...task,
    swimlaneId: nextLaneId,
    columnId: nextColumnId,
  });

  const updatedTasks = [...tasks];
  const updatedMap = new Map<string, Task>();

  sourceTasks.forEach((item, index) => {
    updatedMap.set(item.id, { ...item, order: index });
  });
  nextTasks.forEach((item, index) => {
    updatedMap.set(item.id, { ...item, order: index });
  });

  updatedMap.forEach((value, key) => {
    const idx = updatedTasks.findIndex((item) => item.id === key);
    if (idx >= 0) updatedTasks[idx] = value;
  });

  return {
    updatedTasks,
    updatedMap,
    movedTask: task,
    previousLaneId,
    previousColumnId,
    nextLaneId,
    nextColumnId,
  };
}

export function getSwimlaneTransactions(tasks: Task[], swimlaneId: string | null, scheduled: boolean) {
  const pool = swimlaneId ? tasks.filter((task) => task.swimlaneId === swimlaneId) : tasks;
  const rows = pool.flatMap((task) =>
    (task.transactions ?? [])
      .filter((tx) => (scheduled ? isFutureDate(tx.date) : !isFutureDate(tx.date)))
      .map((tx) => ({ task, tx })),
  );

  rows.sort((a, b) => {
    const aDate = parseLocalDate(a.tx.date ?? "")?.getTime() ?? Number.POSITIVE_INFINITY;
    const bDate = parseLocalDate(b.tx.date ?? "")?.getTime() ?? Number.POSITIVE_INFINITY;
    if (aDate !== bDate) return aDate - bDate;
    return a.task.title.localeCompare(b.task.title);
  });

  return rows;
}

export function getPomodoroSummaryRows(tasks: Task[], swimlaneId: string | null) {
  return (swimlaneId ? tasks.filter((task) => task.swimlaneId === swimlaneId) : tasks)
    .map((task) => ({ task, pomodoros: task.pomodoros ?? 0 }))
    .filter((item) => item.pomodoros > 0);
}

export function getSwimlaneTotal(tasks: Task[], swimlaneId: string) {
  return tasks.filter((task) => task.swimlaneId === swimlaneId).length;
}
