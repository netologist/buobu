import { describe, expect, it } from "vitest";

import { formatAmountWithSymbol } from "@/lib/formatters/amountFormatter";
import {
  formatSwimlaneDeadlineHover,
  formatSwimlaneDeadlineLabel,
} from "@/lib/formatters/deadlineFormatter";
import { getSyncSummary } from "@/lib/formatters/syncFormatter";
import { formatTimer } from "@/lib/formatters/timerFormatter";
import {
  getCellColor,
  getSkipBackground,
  getWeekendBackground,
  hexToRgb,
} from "@/lib/habits/colorUtils";
import { addDays, formatDateKey, getWeekStart } from "@/lib/habits/dateUtils";
import {
  buildBacklogItem,
  buildTask,
  buildTasksBySwimlaneAndColumn,
  getColumnTasks,
  getSwimlaneTotal,
  normalizeTask,
} from "@/lib/kanban/taskUtils";
import { buildTaskBoardPanelRows } from "@/components/kanban/task-board-panel-utils";
import { buildKanbanPerformanceFixture, makeSwimlane, makeTask } from "@/test/factories";

describe("refactor utilities", () => {
  it("formats pomodoro time consistently", () => {
    expect(formatTimer(61_000)).toBe("01:01");
    expect(formatTimer(-500)).toBe("00:00");
  });

  it("formats swimlane deadline labels and hover text", () => {
    const reference = new Date("2026-04-08T09:00:00.000Z");

    expect(formatSwimlaneDeadlineLabel("2026-04-10", reference)).toBe("2 days left");
    expect(formatSwimlaneDeadlineHover("2026-04-09", reference)).toBe("Thursday");
  });

  it("formats sync summary labels", () => {
    expect(getSyncSummary("pending", null, null)).toBe("Unsaved changes");
    expect(getSyncSummary("error", null, "Boom")).toBe("Boom");
    expect(getSyncSummary("idle", new Date("2026-04-08T12:34:00.000Z"), null)).toContain("Saved ·");
  });

  it("formats amounts with the currency symbol after the number", () => {
    expect(formatAmountWithSymbol(12.5, "USD")).toBe("12.50$");
  });

  it("provides reusable habit date helpers", () => {
    const date = new Date("2026-04-08T10:00:00.000Z");

    expect(formatDateKey(date)).toBe("2026-04-08");
    expect(formatDateKey(addDays(date, 2))).toBe("2026-04-10");
    expect(formatDateKey(getWeekStart(date, 1))).toBe("2026-04-06");
  });

  it("provides reusable habit color helpers", () => {
    const saturday = new Date("2026-04-11T10:00:00.000Z");

    expect(hexToRgb("#22c55e")).toBe("34, 197, 94");
    expect(getCellColor(2, "#22c55e")).toBe("rgba(34, 197, 94, 0.5)");
    expect(getWeekendBackground(saturday)).toContain("oklch");
    expect(getSkipBackground(saturday, "#22c55e")).toContain("linear-gradient");
  });

  it("normalizes and builds kanban domain objects", () => {
    const normalized = normalizeTask({
      ...makeTask(),
      labels: undefined as never,
      comments: undefined as never,
      checklists: undefined as never,
      transactions: undefined as never,
      worklogs: undefined as never,
      pomodoros: undefined,
      order: undefined,
      date: undefined,
      deadline: undefined,
      priority: undefined,
      archived: undefined,
      archivedAt: undefined,
      completedAt: undefined,
    });

    expect(normalized.labels).toEqual([]);
    expect(normalized.comments).toEqual([]);
    expect(normalized.priority).toBe("low");

    const builtTask = buildTask({
      boardId: "board-1",
      swimlaneId: "lane-1",
      columnId: "todo",
    });
    const builtBacklogItem = buildBacklogItem("lane-1", "Refactor me");

    expect(builtTask.boardId).toBe("board-1");
    expect(builtBacklogItem.text).toBe("Refactor me");
  });

  it("sorts tasks per column and sums swimlane totals", () => {
    const taskA = makeTask({ id: "a", swimlaneId: "lane-1", columnId: "todo", order: 2, createdAt: "2026-04-08T12:00:00.000Z" });
    const taskB = makeTask({ id: "b", swimlaneId: "lane-1", columnId: "todo", order: 1, createdAt: "2026-04-08T11:00:00.000Z" });
    const taskC = makeTask({ id: "c", swimlaneId: "lane-1", columnId: "done", order: 0 });

    expect(getColumnTasks([taskA, taskB, taskC], "lane-1", "todo").map((task) => task.id)).toEqual(["b", "a"]);
    expect(getSwimlaneTotal([taskA, taskB, taskC], "lane-1")).toBe(3);
  });

  it("builds reusable large-board performance fixtures", () => {
    const fixture = buildKanbanPerformanceFixture({ swimlaneCount: 4, tasksPerSwimlane: 9 });

    expect(fixture.swimlanes).toHaveLength(4);
    expect(fixture.tasks).toHaveLength(36);
    expect(new Set(fixture.tasks.map((task) => task.boardId))).toEqual(new Set([fixture.board.id]));
  });

  it("builds lane-column indexes and panel stats in one pass-friendly shape", () => {
    const laneA = makeSwimlane({ id: "lane-a", name: "Lane A", currency: "USD", deadline: "2026-04-20" });
    const laneB = makeSwimlane({ id: "lane-b", name: "Lane B", currency: "EUR" });
    const visibleTodo = makeTask({
      id: "todo-1",
      swimlaneId: laneA.id,
      columnId: "todo",
      pomodoros: 2,
      transactions: [{ id: "tx-1", type: "income", amount: 50, currency: "USD", date: "2026-04-08" }],
    });
    const visibleDone = makeTask({
      id: "done-1",
      swimlaneId: laneA.id,
      columnId: "done",
      pomodoros: 1,
      transactions: [{ id: "tx-2", type: "expense", amount: 10, currency: "USD", date: "2026-04-15" }],
    });
    const archivedTask = makeTask({ id: "arch-1", swimlaneId: laneA.id, columnId: "todo", archived: true, pomodoros: 3 });
    const laneBTask = makeTask({ id: "lane-b-1", swimlaneId: laneB.id, columnId: "todo" });

    const tasksByLaneAndColumn = buildTasksBySwimlaneAndColumn({
      tasks: [visibleTodo, visibleDone, archivedTask, laneBTask],
      swimlaneIds: [laneA.id, laneB.id],
      columnIds: ["todo", "done"],
    });

    expect(tasksByLaneAndColumn[laneA.id].todo.map((task) => task.id)).toEqual(["todo-1", "arch-1"]);
    expect(tasksByLaneAndColumn[laneA.id].done.map((task) => task.id)).toEqual(["done-1"]);
    expect(tasksByLaneAndColumn[laneB.id].todo.map((task) => task.id)).toEqual(["lane-b-1"]);

    const rows = buildTaskBoardPanelRows({
      filteredSwimlanes: [laneA, laneB],
      boardVisibleTasks: [visibleTodo, visibleDone, laneBTask],
      tasks: [visibleTodo, visibleDone, archivedTask, laneBTask],
      habits: [{ id: "habit-1", swimlaneId: laneA.id } as never],
      backlogCounts: { [laneA.id]: 4 },
      archiveColumnId: "done",
    });

    expect(rows[0]).toMatchObject({
      laneId: laneA.id,
      taskCount: 2,
      doneCount: 1,
      archivedCount: 1,
      pomodoroCount: 6,
      habitCount: 1,
      backlogCount: 4,
      currentTotal: 40,
      scheduledTotal: 0,
      scheduledCount: 0,
      currency: "USD",
    });
    expect(rows[1]).toMatchObject({
      laneId: laneB.id,
      taskCount: 1,
      doneCount: 0,
      archivedCount: 0,
    });
  });
});
