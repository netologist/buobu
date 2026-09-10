import { getSwimlanesByBoard, getTasksByBoard } from "@/lib/db";
import type { Task } from "@/lib/types";

export type TaskSummary = { id: string; title: string };
export type ColumnTaskGroup = {
  swimlaneId: string;
  swimlaneName: string;
  tasks: TaskSummary[];
};

export async function analyzeColumnTasksForBoard(boardId: string, columnId: string) {
  const [tasks, swimlanes] = await Promise.all([getTasksByBoard(boardId), getSwimlanesByBoard(boardId)]);
  const activeColumnTasks = tasks.filter(
    (task: Task) => task.columnId === columnId && task.archived !== true,
  );

  const swimlaneMap = new Map(swimlanes.map((lane) => [lane.id, lane.name] as const));
  const grouped = new Map<string, ColumnTaskGroup>();

  for (const task of activeColumnTasks) {
    const existing = grouped.get(task.swimlaneId) ?? {
      swimlaneId: task.swimlaneId,
      swimlaneName: swimlaneMap.get(task.swimlaneId) ?? "Unknown swimlane",
      tasks: [],
    };
    existing.tasks.push({ id: task.id, title: task.title });
    grouped.set(task.swimlaneId, existing);
  }

  return {
    taskGroups: Array.from(grouped.values()),
    taskIds: activeColumnTasks.map((task) => task.id),
  };
}
