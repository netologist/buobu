"use client";

import type { Habit, HabitLog, Board, Swimlane } from "@/lib/types";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type HabitDetailProps = {
  habit: Habit;
  logs: HabitLog[];
  board?: Board;
  swimlane?: Swimlane;
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(d?: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return d; }
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</h3>
      {children}
    </div>
  );
}

export function HabitDetail({ habit, logs, board, swimlane }: HabitDetailProps) {
  // Build full log map by date
  const logMap = new Map(logs.map((l) => [l.date, l.value]));
  const activeLogs = logs.filter((l) => l.value > 0);
  const totalCompletions = activeLogs.length;

  // Calculate streak
  const sortedDates = [...logMap.entries()]
    .filter(([, v]) => v > 0)
    .map(([d]) => d)
    .sort((a, b) => b.localeCompare(a));

  let streak = 0;
  let cursor = getDateKey(new Date());
  for (const d of sortedDates) {
    if (d === cursor) {
      streak++;
      const next = new Date(cursor);
      next.setDate(next.getDate() - 1);
      cursor = getDateKey(next);
    } else if (d < cursor) break;
  }

  // Build a 12-week (84-day) grid aligned to week start
  const today = new Date();
  const gridDays = 84;
  const cells: { date: string; value: number; month: string; dayOfMonth: number }[] = [];
  for (let i = gridDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    cells.push({
      date: getDateKey(d),
      value: logMap.get(getDateKey(d)) ?? 0,
      month: d.toLocaleDateString(undefined, { month: "short" }),
      dayOfMonth: d.getDate(),
    });
  }

  // Group into weeks (7 columns)
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  // Monthly breakdown
  const byMonth = new Map<string, { total: number; completed: number }>();
  for (const cell of cells) {
    if (!byMonth.has(cell.month)) byMonth.set(cell.month, { total: 0, completed: 0 });
    const m = byMonth.get(cell.month)!;
    m.total++;
    if (cell.value > 0) m.completed++;
  }

  return (
    <div className="space-y-5 text-sm">
      {/* Meta */}
      <div className="flex flex-wrap gap-2 items-center">
        {habit.color && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs"
          >
            <span className="size-2.5 rounded-full" style={{ backgroundColor: habit.color }} />
            Color
          </span>
        )}
        {board && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{board.name}</span>}
        {swimlane && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{swimlane.name}</span>}
        {habit.breakHabit && (
          <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs">Break habit</span>
        )}
        {habit.archived && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Archived</span>
        )}
      </div>

      {/* Stats */}
      <Section title="Statistics">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-orange-500 dark:text-orange-400 mb-1">
              <Flame className="size-4" />
              <span className="text-lg font-bold">{streak}</span>
            </div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Streak</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold text-foreground mb-1">{totalCompletions}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Completions</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold text-foreground mb-1">{logs.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total logs</p>
          </div>
        </div>
      </Section>

      {/* Frequency schedule */}
      {habit.frequencyDays && habit.frequencyDays.length > 0 && (
        <Section title="Schedule">
          <div className="flex gap-1.5">
            {DAYS_OF_WEEK.map((day, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded py-1 text-center text-[10px] font-medium",
                  habit.frequencyDays!.includes(i)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {day}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 12-week activity grid */}
      <Section title="Activity (last 12 weeks)">
        <div className="space-y-1">
          {/* Day labels */}
          <div className="flex gap-1 pl-8">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground">{d}</div>
            ))}
          </div>
          {weeks.map((week, wi) => {
            const monthLabel = wi === 0 || week[0]?.month !== weeks[wi - 1]?.[0]?.month
              ? week[0]?.month
              : "";
            return (
              <div key={wi} className="flex items-center gap-1">
                <span className="w-7 text-[9px] text-muted-foreground text-right shrink-0">{monthLabel}</span>
                {week.map((cell, di) => (
                  <div
                    key={di}
                    className={cn(
                      "flex-1 aspect-square rounded-sm",
                      cell.value === 0
                        ? "bg-muted"
                        : cell.value >= 3
                        ? "bg-primary"
                        : cell.value >= 2
                        ? "bg-primary/70"
                        : "bg-primary/40"
                    )}
                    title={`${cell.date}: ${cell.value > 0 ? `value ${cell.value}` : "no log"}`}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Monthly breakdown */}
      <Section title="Monthly Breakdown">
        <div className="space-y-1.5">
          {Array.from(byMonth.entries()).reverse().map(([month, data]) => {
            const pct = data.total > 0 ? (data.completed / data.total) * 100 : 0;
            return (
              <div key={month} className="flex items-center gap-3">
                <span className="w-8 text-xs text-muted-foreground">{month}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {data.completed}/{data.total}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Recent log entries */}
      {logs.length > 0 && (
        <Section title="Log History">
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {[...logs]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 50)
              .map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-xs"
                >
                  <span className="text-muted-foreground">{log.date}</span>
                  <span
                    className={cn(
                      "font-medium",
                      log.value > 0 ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {log.value > 0 ? `✓ ${log.value}` : "—"}
                  </span>
                </div>
              ))}
          </div>
        </Section>
      )}

      {/* Dates */}
      <Section title="Dates">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Created</p>
            <p>{formatDate(habit.createdAt)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Updated</p>
            <p>{formatDate(habit.updatedAt)}</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
