import { Button } from "@/components/ui/button";
import { getWeekendBackground } from "@/lib/habits/colorUtils";
import { formatDateKey } from "@/lib/habits/dateUtils";

type Props = {
  dateColumns: Date[];
  todayKey: string;
  gridTemplateColumns: string;
  showStats: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export function HabitCalendarHeader({
  dateColumns,
  todayKey,
  gridTemplateColumns,
  showStats,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
}: Props) {
  return (
    <div className="shrink-0 border-b bg-background px-5 pt-0 pb-0 min-h-14">
      <div
        className="grid items-center gap-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
        style={{ gridTemplateColumns }}
      >
        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!canGoPrev}
            onClick={onPrev}
          >
            ‹
          </Button>
        </div>

        {dateColumns.map((date) => {
          const dayLabel = new Intl.DateTimeFormat("en", { weekday: "short" }).format(date);
          const monthLabel = new Intl.DateTimeFormat("en", { month: "short" }).format(date);
          const dayNumber = new Intl.DateTimeFormat("en", { day: "numeric" }).format(date);
          const isToday = formatDateKey(date) === todayKey;
          const weekendBg = getWeekendBackground(date);

          return (
            <div
              key={date.toISOString()}
              className="flex flex-col items-center justify-center border-l border-muted px-1 pt-1.5 pb-1"
              style={
                isToday
                  ? { backgroundColor: "lab(66.9756% -58.27 19.5419)" }
                  : weekendBg
                    ? { backgroundColor: weekendBg }
                    : undefined
              }
            >
              <div
                className={
                  isToday
                    ? "flex flex-col items-center gap-0.5 rounded-md bg-emerald-500 text-white"
                    : "flex flex-col items-center gap-0.5"
                }
              >
                <span className={isToday ? "text-[8px] text-white" : "text-[8px] text-gray-400"}>
                  {monthLabel}
                </span>
                <span className="text-[14px] font-bold">{dayNumber}</span>
                <span className="text-[10px]">{dayLabel}</span>
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-center border-l border-muted">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!canGoNext}
            onClick={onNext}
          >
            ›
          </Button>
        </div>

        {showStats && (
          <>
            <div className="self-center flex items-center justify-center px-2 text-center text-[9px] font-medium normal-case tracking-[0.1em]">
              current streak
            </div>
            <div className="self-center flex items-center justify-center px-2 text-center text-[9px] font-medium normal-case tracking-[0.1em]">
              longest streak
            </div>
            <div className="self-center flex items-center justify-center px-2 text-center text-[9px] font-medium normal-case tracking-[0.1em]">
              total count
            </div>
          </>
        )}
      </div>
    </div>
  );
}
