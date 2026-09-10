import type { KanbanSwimlanePanelRow } from "@/components/kanban/KanbanSwimlanePanel";
import {
  formatSwimlaneDeadlineHover,
  formatSwimlaneDeadlineLabel,
} from "@/lib/formatters/deadlineFormatter";
import { isFutureDate } from "@/lib/kanban/dateUtils";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import type { Habit, Swimlane, Task } from "@/lib/types";

type LaneAggregate = {
  taskCount: number;
  doneCount: number;
  archivedCount: number;
  pomodoroCount: number;
  habitCount: number;
  currentTotal: number;
  scheduledTotal: number;
  scheduledCount: number;
};

function createEmptyLaneAggregate(): LaneAggregate {
  return {
    taskCount: 0,
    doneCount: 0,
    archivedCount: 0,
    pomodoroCount: 0,
    habitCount: 0,
    currentTotal: 0,
    scheduledTotal: 0,
    scheduledCount: 0,
  };
}

function getLaneAggregate(store: Record<string, LaneAggregate>, laneId: string) {
  return (store[laneId] ??= createEmptyLaneAggregate());
}

export function countTasksBySwimlane(tasks: Task[], archivedSwimlaneIdSet: Set<string>) {
  const map: Record<string, number> = {};

  for (const task of tasks) {
    if (archivedSwimlaneIdSet.has(task.swimlaneId) ? task.archived : !task.archived) {
      map[task.swimlaneId] = (map[task.swimlaneId] || 0) + 1;
    }
  }

  return map;
}

type BuildTaskBoardPanelRowsArgs = {
  filteredSwimlanes: Swimlane[];
  boardVisibleTasks: Task[];
  tasks: Task[];
  habits: Habit[];
  backlogCounts: Record<string, number>;
  archiveColumnId: string;
};

export function buildTaskBoardPanelRows({
  filteredSwimlanes,
  boardVisibleTasks,
  tasks,
  habits,
  backlogCounts,
  archiveColumnId,
}: BuildTaskBoardPanelRowsArgs): KanbanSwimlanePanelRow[] {
  const aggregateByLane: Record<string, LaneAggregate> = {};

  for (const task of boardVisibleTasks) {
    const laneAggregate = getLaneAggregate(aggregateByLane, task.swimlaneId);
    laneAggregate.taskCount += 1;

    if (task.columnId === archiveColumnId) {
      laneAggregate.doneCount += 1;
    }
  }

  for (const task of tasks) {
    const laneAggregate = getLaneAggregate(aggregateByLane, task.swimlaneId);

    if (task.archived) {
      laneAggregate.archivedCount += 1;
    }

    laneAggregate.pomodoroCount += task.pomodoros ?? 0;

    for (const tx of task.transactions ?? []) {
      const amount = Number(tx.amount) || 0;
      const signedAmount = tx.type === "income" ? amount : -amount;

      if (isFutureDate(tx.date)) {
        laneAggregate.scheduledTotal += signedAmount;
        laneAggregate.scheduledCount += 1;
      } else {
        laneAggregate.currentTotal += signedAmount;
      }
    }
  }

  for (const habit of habits) {
    const laneAggregate = getLaneAggregate(aggregateByLane, habit.swimlaneId);
    laneAggregate.habitCount += 1;
  }

  return filteredSwimlanes.map((lane) => {
    const stats = aggregateByLane[lane.id] ?? createEmptyLaneAggregate();

    return {
      laneId: lane.id,
      laneName: lane.name,
      laneLabel: lane.label ?? null,
      laneColor: lane.color ?? null,
      laneDeadline: lane.deadline ?? null,
      laneDeadlineLabel: lane.deadline ? formatSwimlaneDeadlineLabel(lane.deadline) : null,
      laneDeadlineHover: lane.deadline ? formatSwimlaneDeadlineHover(lane.deadline) : null,
      taskCount: stats.taskCount,
      doneCount: stats.doneCount,
      pomodoroCount: stats.pomodoroCount,
      habitCount: stats.habitCount,
      backlogCount: backlogCounts[lane.id] ?? 0,
      archivedCount: stats.archivedCount,
      currentTotal: stats.currentTotal,
      scheduledTotal: stats.scheduledTotal,
      scheduledCount: stats.scheduledCount,
      currency: lane.currency ?? DEFAULT_CURRENCY,
    };
  });
}
