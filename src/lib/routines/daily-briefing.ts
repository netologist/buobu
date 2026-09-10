import type { Board, Habit, Routine, Swimlane, Task } from "@/lib/types";

export type SwimlaneGroup = {
  boardId: string;
  boardName: string;
  swimlaneId: string;
  swimlaneName: string;
  swimlaneColor?: string;
  tasks: Task[];
  routines: Routine[];
  habits: Habit[];
};

export function buildDailyBriefingGroups({
  boards,
  swimlanes,
  tasks,
  routines,
  habits,
}: {
  boards: Board[];
  swimlanes: Swimlane[];
  tasks: Task[];
  routines: Routine[];
  habits: Habit[];
}): SwimlaneGroup[] {
  const map = new Map<string, SwimlaneGroup>();

  const getOrCreate = (boardId: string, swimlaneId: string): SwimlaneGroup => {
    const key = `${boardId}:${swimlaneId}`;
    if (!map.has(key)) {
      const board = boards.find((item) => item.id === boardId);
      const swimlane = swimlanes.find((item) => item.id === swimlaneId);
      map.set(key, {
        boardId,
        boardName: board?.name ?? "Unknown Board",
        swimlaneId,
        swimlaneName: swimlane?.name ?? "Unknown Lane",
        swimlaneColor: swimlane?.color ?? undefined,
        tasks: [],
        routines: [],
        habits: [],
      });
    }
    return map.get(key)!;
  };

  for (const task of tasks) {
    getOrCreate(task.boardId, task.swimlaneId).tasks.push(task);
  }
  for (const routine of routines) {
    getOrCreate(routine.boardId, routine.swimlaneId).routines.push(routine);
  }
  for (const habit of habits) {
    getOrCreate(habit.boardId, habit.swimlaneId).habits.push(habit);
  }

  return Array.from(map.values()).sort((a, b) => {
    const boardCmp = a.boardName.localeCompare(b.boardName);
    return boardCmp !== 0 ? boardCmp : a.swimlaneName.localeCompare(b.swimlaneName);
  });
}

export function filterDailyBriefingGroups(groups: SwimlaneGroup[], searchQuery: string) {
  if (!searchQuery.trim()) return groups;

  const query = searchQuery.toLowerCase();
  return groups
    .map((group) => ({
      ...group,
      tasks: group.tasks.filter((task) => task.title.toLowerCase().includes(query)),
      routines: group.routines.filter((routine) => routine.title.toLowerCase().includes(query)),
      habits: group.habits.filter((habit) => habit.title.toLowerCase().includes(query)),
    }))
    .filter((group) => group.tasks.length + group.routines.length + group.habits.length > 0);
}

export function countCompletedDailyBriefingItems({
  tasks,
  routines,
  habits,
  getRoutineLogToday,
  getHabitLogToday,
}: {
  tasks: Task[];
  routines: Routine[];
  habits: Habit[];
  getRoutineLogToday: (routineId: string) => unknown;
  getHabitLogToday: (habitId: string) => { value: number } | undefined;
}) {
  return (
    tasks.filter((task) => task.completedAt).length +
    routines.filter((routine) => getRoutineLogToday(routine.id)).length +
    habits.filter((habit) => {
      const log = getHabitLogToday(habit.id);
      return Boolean(log && log.value > 0);
    }).length
  );
}
