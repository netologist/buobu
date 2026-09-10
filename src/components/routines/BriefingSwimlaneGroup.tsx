import { ChevronDown, ChevronRight } from "lucide-react";

import type { Habit, HabitLog, Routine, RoutineLog, Task } from "@/lib/types";
import type { SwimlaneGroup } from "@/lib/routines/daily-briefing";

import { BriefingHabitSection } from "./BriefingHabitSection";
import { BriefingRoutineSection } from "./BriefingRoutineSection";
import { BriefingTaskSection } from "./BriefingTaskSection";

type BriefingSwimlaneGroupProps = {
  group: SwimlaneGroup;
  isCollapsed: boolean;
  processing: Set<string>;
  getRoutineLogToday: (routineId: string) => RoutineLog | undefined;
  getHabitLogToday: (habitId: string) => HabitLog | undefined;
  onToggleCollapse: (key: string) => void;
  onCompleteTask: (task: Task) => void;
  onRevertTask: (task: Task) => void;
  onSkipTask: (task: Task) => void;
  onMoveTask: (task: Task) => void;
  onOpenApproveDialog: (routine: Routine) => void;
  onSkipRoutine: (routine: Routine) => void;
  onRevertRoutine: (routine: Routine) => void;
  onMarkHabitDone: (habit: Habit) => void;
  onSkipHabit: (habit: Habit) => void;
  onRevertHabit: (habit: Habit) => void;
};

export function BriefingSwimlaneGroup({
  group,
  isCollapsed,
  processing,
  getRoutineLogToday,
  getHabitLogToday,
  onToggleCollapse,
  onCompleteTask,
  onRevertTask,
  onSkipTask,
  onMoveTask,
  onOpenApproveDialog,
  onSkipRoutine,
  onRevertRoutine,
  onMarkHabitDone,
  onSkipHabit,
  onRevertHabit,
}: BriefingSwimlaneGroupProps) {
  const key = `${group.boardId}:${group.swimlaneId}`;

  return (
    <section>
      <button
        type="button"
        onClick={() => onToggleCollapse(key)}
        className="group mb-2 flex w-full items-center gap-2"
      >
        <span
          className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
          style={
            group.swimlaneColor
              ? { backgroundColor: group.swimlaneColor }
              : { backgroundColor: "hsl(var(--muted-foreground))" }
          }
        />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-xs font-semibold leading-tight text-foreground">
            {group.swimlaneName}
          </p>
          <p className="truncate text-[10px] leading-tight text-muted-foreground">
            {group.boardName}
          </p>
        </div>
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {!isCollapsed && (
        <div
          className="space-y-1 border-l-2 pl-4"
          style={
            group.swimlaneColor
              ? { borderLeftColor: group.swimlaneColor }
              : { borderLeftColor: "hsl(var(--border))" }
          }
        >
          <BriefingTaskSection
            tasks={group.tasks}
            processing={processing}
            onCompleteTask={onCompleteTask}
            onRevertTask={onRevertTask}
            onSkipTask={onSkipTask}
            onMoveTask={onMoveTask}
          />

          <BriefingRoutineSection
            routines={group.routines}
            processing={processing}
            getRoutineLogToday={getRoutineLogToday}
            onOpenApproveDialog={onOpenApproveDialog}
            onSkipRoutine={onSkipRoutine}
            onRevertRoutine={onRevertRoutine}
          />

          <BriefingHabitSection
            habits={group.habits}
            getHabitLogToday={getHabitLogToday}
            onMarkHabitDone={onMarkHabitDone}
            onSkipHabit={onSkipHabit}
            onRevertHabit={onRevertHabit}
          />
        </div>
      )}
    </section>
  );
}
