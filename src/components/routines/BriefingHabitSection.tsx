import { Badge } from "@/components/ui/badge";
import type { Habit, HabitLog } from "@/lib/types";
import { Check, RotateCcw, SkipForward } from "lucide-react";

import { BriefingIconButton } from "./BriefingIconButton";

type BriefingHabitSectionProps = {
  habits: Habit[];
  getHabitLogToday: (habitId: string) => HabitLog | undefined;
  onMarkHabitDone: (habit: Habit) => void;
  onSkipHabit: (habit: Habit) => void;
  onRevertHabit: (habit: Habit) => void;
};

export function BriefingHabitSection({
  habits,
  getHabitLogToday,
  onMarkHabitDone,
  onSkipHabit,
  onRevertHabit,
}: BriefingHabitSectionProps) {
  if (habits.length === 0) return null;

  return (
    <>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground py-1">Habits</p>
      {habits.map((habit) => {
        const log = getHabitLogToday(habit.id);
        const done = log && log.value > 0;
        const skipped = log && log.value === 0;

        return (
          <div
            key={habit.id}
            className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5"
          >
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm ${log ? "text-muted-foreground" : ""}`}>
                {habit.title}
              </p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {log ? (
                <>
                  <Badge
                    variant="outline"
                    className={`text-[9px] ${
                      done
                        ? "border-green-500/40 text-green-700 dark:text-green-400"
                        : skipped
                          ? "border-muted-foreground/40 text-muted-foreground"
                          : ""
                    }`}
                  >
                    {done ? "Done" : "Skipped"}
                  </Badge>
                  <BriefingIconButton title="Revert" onClick={() => onRevertHabit(habit)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </BriefingIconButton>
                </>
              ) : (
                <>
                  <BriefingIconButton
                    title="Done"
                    className="text-green-700 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                    onClick={() => onMarkHabitDone(habit)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </BriefingIconButton>
                  <BriefingIconButton title="Skip" onClick={() => onSkipHabit(habit)}>
                    <SkipForward className="h-3.5 w-3.5" />
                  </BriefingIconButton>
                </>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
