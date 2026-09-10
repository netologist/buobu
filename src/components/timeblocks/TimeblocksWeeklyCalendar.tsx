"use client";

import { useMemo, useEffect, useRef } from "react";
import type { Timeblock } from "@/lib/types";
import { recurrenceSummary } from "@/lib/timeblocks/formatters";
import { computeOccurrencesInRange } from "@/lib/timeblocks/effective-recurrence";
import { useActiveHabits } from "@/stores/hooks/use-habits";
import { useActiveRoutines } from "@/stores/hooks/use-routines";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23

type Props = {
  timeblocks: Timeblock[];
  weekStart: Date;
  selectedTimeblockId: string | null;
  onSelect: (id: string) => void;
  onEdit: (tb: Timeblock) => void;
    /** When provided, show only these days instead of the full week */
    displayDays?: Date[];
};

/** Convert "HH:MM" to fractional hours */
function toHours(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h + m / 60;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function TimeblocksWeeklyCalendar({
  timeblocks,
  weekStart,
  selectedTimeblockId,
  onSelect,
  onEdit,
    displayDays,
}: Props) {
  const allHabits = useActiveHabits();
  const allRoutines = useActiveRoutines();

  const pixelsPerHour = 48; // height of each hour row in px
  const labelWidth = 44;    // left gutter for time labels

  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to 06:00 on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 6 * pixelsPerHour;
    }
  }, []);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

    const visibleDays = displayDays ?? weekDays;

  const weekEnd = addDays(weekStart, 6);

  /** Map: dateKey → list of timeblocks occurring on that day */
  const occurrenceMap = useMemo(() => {
    const map = new Map<string, Timeblock[]>();
    for (const tb of timeblocks) {
      const dates = computeOccurrencesInRange(
        tb.recurrence,
        dateKey(weekStart),
        dateKey(weekEnd),
      );
      for (const dk of dates) {
        if (!map.has(dk)) map.set(dk, []);
        map.get(dk)!.push(tb);
      }
    }
    return map;
  }, [timeblocks, weekStart, weekEnd]);

  const today = dateKey(new Date());

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Day headers */}
      <div className="flex shrink-0 border-b" style={{ paddingLeft: labelWidth }}>
          {visibleDays.map((day, i) => {
          const dk = dateKey(day);
          const isToday = dk === today;
          return (
            <div
              key={i}
              className="flex-1 border-l px-1 py-2 text-center"
            >
              <p className={cn("text-[11px] font-medium", isToday ? "text-primary" : "text-muted-foreground")}>
                {new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day)}
              </p>
              <p className={cn(
                "mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                isToday ? "bg-primary text-primary-foreground" : "text-foreground",
              )}>
                {day.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative flex" style={{ minHeight: pixelsPerHour * 24 }}>
          {/* Time labels */}
          <div className="shrink-0" style={{ width: labelWidth }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex items-start justify-end pr-2 text-[10px] text-muted-foreground"
                style={{ height: pixelsPerHour }}
              >
                {h === 0 ? null : `${String(h).padStart(2, "0")}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {visibleDays.map((day, colIdx) => {
            const dk = dateKey(day);
            const dayTbs = occurrenceMap.get(dk) ?? [];

            return (
              <div key={colIdx} className="relative flex-1 border-l">
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-border/40"
                    style={{ top: h * pixelsPerHour }}
                  />
                ))}

                {/* Timeblock events */}
                {dayTbs.map((tb) => {
                  const top = toHours(tb.startTime) * pixelsPerHour;
                  const height = Math.max(
                    (toHours(tb.endTime) - toHours(tb.startTime)) * pixelsPerHour,
                    20,
                  );
                  const isSelected = selectedTimeblockId === tb.id;
                  const habits = allHabits.filter((h) => h.timeblockId === tb.id);
                  const routines = allRoutines.filter((r) => r.timeblockId === tb.id);

                  return (
                    <div
                      key={tb.id}
                      className={cn(
                        "absolute left-0.5 right-0.5 cursor-pointer rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm transition-all overflow-hidden",
                        isSelected && "ring-2 ring-white ring-offset-1",
                      )}
                      style={{
                        top,
                        height,
                        backgroundColor: tb.color ?? "#3b82f6",
                        opacity: isSelected ? 1 : 0.85,
                      }}
                      onClick={() => onSelect(tb.id)}
                      onDoubleClick={() => onEdit(tb)}
                      title={`${tb.title}\n${tb.startTime}–${tb.endTime}\n${recurrenceSummary(tb.recurrence)}`}
                    >
                      <p className="truncate leading-tight">{tb.title}</p>
                      {height >= 32 && (
                        <p className="truncate leading-tight opacity-80">
                          {tb.startTime}–{tb.endTime}
                        </p>
                      )}
                      {height >= 48 && (habits.length > 0 || routines.length > 0) && (
                        <div className="mt-0.5 space-y-0.5">
                          {habits.map((h) => (
                            <p key={h.id} className="truncate text-[9px] leading-tight opacity-90">
                              🔥 {h.title}
                            </p>
                          ))}
                          {routines.map((r) => (
                            <p key={r.id} className="truncate text-[9px] leading-tight opacity-90">
                              🔁 {r.title}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
