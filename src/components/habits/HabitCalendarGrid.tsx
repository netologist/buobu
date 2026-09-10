import { memo, useMemo, type CSSProperties } from "react";
import { Timer } from "lucide-react";

import type { Habit, HabitLog, Swimlane } from "@/lib/types";
import { calculateHabitStats } from "@/lib/habits/stats";

import { HabitCell } from "./HabitCell";

type HoveredCell = { habitId: string; dateKey: string } | null;

type HabitCalendarGridProps = {
  lane: Swimlane;
  laneHabits: Habit[];
  allDays: number[];
  dateColumns: Date[];
  dateKeys: string[];
  habitGridCols: string;
  showStats: boolean;
  habitLogs: Record<string, HabitLog[]>;
  habitLogMap: Record<string, Record<string, HabitLog>>;
  hoveredCell: HoveredCell;
  clickedPreview: Record<string, number>;
  disablePreview: string | null;
  onToggleHabitValue: (habit: Habit, dateKey: string, date: Date) => Promise<void> | void;
  onHandleMouseDown: (habit: Habit, dateKey: string, date: Date) => void;
  onHandleMouseUp: () => void;
  onHandleMouseLeave: () => void;
  onSetHoveredCell: (value: HoveredCell) => void;
};

export const HabitCalendarGrid = memo(function HabitCalendarGrid({
  lane,
  laneHabits,
  allDays,
  dateColumns,
  dateKeys,
  habitGridCols,
  showStats,
  habitLogs,
  habitLogMap,
  hoveredCell,
  clickedPreview,
  disablePreview,
  onToggleHabitValue,
  onHandleMouseDown,
  onHandleMouseUp,
  onHandleMouseLeave,
  onSetHoveredCell,
}: HabitCalendarGridProps) {
  const habitStatsById = useMemo(() => {
    const entries = laneHabits.map((habit) => [habit.id, calculateHabitStats(habitLogs[habit.id] ?? [])] as const);
    return Object.fromEntries(entries);
  }, [laneHabits, habitLogs]);

  return (
    <div data-swimlane-id={lane.id}>
      <div className="space-y-2 mt-12 border-muted rounded-md border bg-background p-2">
        {laneHabits.length === 0 && (
          <div className="text-xs text-muted-foreground py-0 text-center">Add your first habit</div>
        )}

        {laneHabits.map((habit) => {
          const frequencyDays = habit.frequencyDays ?? allDays;
          const { currentStreak, longestStreak, completedDays } = habitStatsById[habit.id] ?? {
            currentStreak: 0,
            longestStreak: 0,
            completedDays: 0,
          };

          return (
            <div key={habit.id}>
              {/* Habit name — shown only on mobile above each row */}
              <div className="block sm:hidden truncate px-1 pt-1 text-[11px] font-medium text-foreground/80">
                <span className="inline-flex items-center gap-1.5">
                  {habit.sourceType === "timeblock" ? <Timer className="h-3 w-3 shrink-0 text-blue-500" /> : null}
                  <span className="truncate">{habit.title}</span>
                </span>
              </div>
              <div
                className="grid grid-cols-(--habit-grid-cols) items-center gap-0"
                style={{ "--habit-grid-cols": habitGridCols } as CSSProperties}
              >
              <div className="border-l border-muted" />
              {dateKeys.map((key, index) => {
                const date = dateColumns[index];
                const scheduled = frequencyDays.includes(date.getDay());
                const logged = habitLogMap[habit.id]?.[key]?.value;
                const value = logged !== undefined ? logged : scheduled ? 0 : -1;
                const cellKey = `${habit.id}-${key}`;

                return (
                  <HabitCell
                    key={key}
                    habit={habit}
                    date={date}
                    dateKey={key}
                    value={value}
                    clickedPreview={clickedPreview[cellKey]}
                    isHovered={hoveredCell?.habitId === habit.id && hoveredCell?.dateKey === key}
                    isPreviewDisabled={disablePreview === cellKey}
                    onClick={() => void onToggleHabitValue(habit, key, date)}
                    onMouseDown={() => onHandleMouseDown(habit, key, date)}
                    onMouseUp={onHandleMouseUp}
                    onMouseLeave={() => {
                      onHandleMouseLeave();
                      onSetHoveredCell(null);
                    }}
                    onMouseEnter={() => onSetHoveredCell({ habitId: habit.id, dateKey: key })}
                  />
                );
              })}
              {showStats && (
                <>
                  <div className="border-l border-muted" />
                  <div className="flex items-center justify-center h-8 text-sm font-semibold">{currentStreak}</div>
                  <div className="flex items-center justify-center h-8 text-sm font-semibold">{longestStreak}</div>
                  <div className="flex items-center justify-center h-8 text-sm font-semibold">{completedDays}</div>
                </>
              )}
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
