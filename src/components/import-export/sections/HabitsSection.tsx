"use client";

import type { Habit, HabitLog, Board, Swimlane } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Activity, Flame, ChevronRight } from "lucide-react";

type HabitsSectionProps = {
  habits: Habit[];
  habitLogsByHabit: Map<string, HabitLog[]>;
  boardMap: Map<string, Board>;
  swimlaneMap: Map<string, Swimlane>;
  onSelect?: (habit: Habit) => void;
};

// Last N days mini-grid cell count
const GRID_DAYS = 28;

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildLast28DaysMap(logs: HabitLog[]): Map<string, number> {
  const map = new Map<string, number>();
  const today = new Date();
  for (let i = 0; i < GRID_DAYS; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (GRID_DAYS - 1 - i));
    map.set(getDateKey(d), 0);
  }
  for (const log of logs) {
    if (map.has(log.date)) {
      map.set(log.date, log.value);
    }
  }
  return map;
}

function calcStreak(logs: HabitLog[]): number {
  if (!logs.length) return 0;
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const today = getDateKey(new Date());
  let streak = 0;
  let cursor = today;

  for (const log of sorted) {
    if (log.date === cursor && log.value > 0) {
      streak++;
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = getDateKey(d);
    } else if (log.date < cursor) {
      break;
    }
  }
  return streak;
}

function DayCell({ value }: { value: number }) {
  return (
    <div
      className={cn(
        "size-3 rounded-sm",
        value === 0
          ? "bg-muted"
          : value >= 3
          ? "bg-primary"
          : value >= 2
          ? "bg-primary/70"
          : "bg-primary/40"
      )}
      title={value > 0 ? `Value: ${value}` : "No log"}
    />
  );
}

export function HabitsSection({
  habits,
  habitLogsByHabit,
  boardMap,
  swimlaneMap,
  onSelect,
}: HabitsSectionProps) {
  if (habits.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="size-8 text-muted-foreground/40" />}
        message="No habits match the current filter"
      />
    );
  }

  // Group by board → swimlane
  const grouped = new Map<string, Map<string, Habit[]>>();
  for (const habit of habits) {
    const bid = habit.boardId ?? "__unknown__";
    const sid = habit.swimlaneId ?? "__unknown__";
    if (!grouped.has(bid)) grouped.set(bid, new Map());
    const byBoard = grouped.get(bid)!;
    if (!byBoard.has(sid)) byBoard.set(sid, []);
    byBoard.get(sid)!.push(habit);
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([boardId, bySwimlane]) => {
        const board = boardMap.get(boardId);
        return (
          <div key={boardId}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="inline-block size-2 rounded-full bg-primary" />
              {board?.name ?? "Unknown Board"}
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {Array.from(bySwimlane.values()).flat().length} habits
              </span>
            </h3>

            <div className="space-y-4 pl-4 border-l border-border/60">
              {Array.from(bySwimlane.entries()).map(([swimlaneId, swimlaneHabits]) => {
                const swimlane = swimlaneMap.get(swimlaneId);
                return (
                  <div key={swimlaneId}>
                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <ChevronRight className="size-3" />
                      {swimlane?.name ?? "Unknown Swimlane"}
                      <span className="ml-1 font-normal normal-case">({swimlaneHabits.length})</span>
                    </h4>
                    <div className="space-y-2">
                      {swimlaneHabits.map((habit) => {
                        const logs = habitLogsByHabit.get(habit.id) ?? [];
                        const streak = calcStreak(logs);
                        const gridMap = buildLast28DaysMap(logs);
                        const totalLogs = logs.filter((l) => l.value > 0).length;

                        return (
                          <div
                            key={habit.id}
                            className={cn(
                              "rounded-lg border bg-card p-3 text-sm",
                              "hover:border-primary/30 transition-colors",
                              habit.archived && "opacity-60",
                              onSelect && "cursor-pointer"
                            )}
                            onClick={onSelect ? () => onSelect(habit) : undefined}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {habit.color && (
                                <span
                                  className="inline-block size-3 rounded-full shrink-0"
                                  style={{ backgroundColor: habit.color }}
                                />
                              )}
                              <span className="font-medium text-foreground line-clamp-1">
                                {habit.title}
                              </span>
                              {habit.breakHabit && (
                                <span className="ml-1 text-[10px] rounded-full bg-destructive/10 text-destructive px-1.5 py-0.5">
                                  Break
                                </span>
                              )}
                              {habit.archived && (
                                <span className="ml-1 text-[10px] rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
                                  Archived
                                </span>
                              )}
                              <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                                {streak > 0 && (
                                  <span className="flex items-center gap-0.5 text-orange-500 dark:text-orange-400 font-medium">
                                    <Flame className="size-3" />
                                    {streak}
                                  </span>
                                )}
                                <span>{totalLogs} logs</span>
                              </div>
                            </div>

                            {/* 28-day mini activity grid */}
                            <div className="flex flex-wrap gap-0.5">
                              {Array.from(gridMap.values()).map((value, i) => (
                                <DayCell key={i} value={value} />
                              ))}
                            </div>
                            <p className="mt-1.5 text-[11px] text-muted-foreground">
                              Last 28 days
                              {habit.frequencyDays && habit.frequencyDays.length > 0 && (
                                <span className="ml-2">
                                  · {habit.frequencyDays.length}d/week schedule
                                </span>
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {icon}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
