import { Calendar } from "lucide-react";
import type { Habit } from "@/lib/types";
import type { HabitChainData } from "@/lib/habits/stats";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCellColor, hexToRgb } from "@/lib/habits/colorUtils";
import { formatDateKey } from "@/lib/habits/dateUtils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit: Habit | null;
  chainData: HabitChainData | null;
};

export function HabitChainDialog({ open, onOpenChange, habit, chainData }: Props) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? null : onOpenChange(false))}>
      <DialogContent className="!max-w-[95vw] sm:!max-w-[980px] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-lg uppercase tracking-[0.1em] text-emerald-600 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Yearly Chain - {habit?.title}
          </DialogTitle>
        </DialogHeader>

        {chainData && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex flex-col justify-center gap-[3px] pt-6">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => (
                  <div
                    key={day}
                    className="text-[10px] text-muted-foreground w-8 h-[14px] flex items-center"
                    style={{ visibility: idx % 2 === 0 ? "visible" : "hidden", height: "14px" }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1 overflow-x-auto">
                <div className="flex gap-[3px] h-5">
                  {Array.from({ length: chainData.weeks }).map((_, weekIdx) => {
                    const monthLabel = chainData.monthLabels.find((m) => m.col === weekIdx);
                    return (
                      <div
                        key={weekIdx}
                        className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[14px] text-center"
                      >
                        {monthLabel?.label || ""}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-[3px]">
                  {Array.from({ length: chainData.weeks }).map((_, weekIdx) => (
                    <div key={weekIdx} className="flex flex-col gap-[3px]">
                      {Array.from({ length: 7 }).map((_, dayIdx) => {
                        const cell = chainData.cells.find((c) => c.col === weekIdx && c.row === dayIdx);
                        if (!cell) return <div key={dayIdx} className="w-[14px] h-[14px]" />;

                        const color = getCellColor(cell.value, habit?.color);
                        const baseColor = "oklch(0.95 0 0)";
                        const rgb = hexToRgb(habit?.color) ?? "34, 197, 94";
                        const skipGradient = `linear-gradient(135deg, ${baseColor} 50%, rgba(${rgb}, 0.25) 50%)`;

                        return (
                          <div
                            key={`${weekIdx}-${dayIdx}`}
                            className="w-[14px] h-[14px] rounded-sm"
                            style={{
                              background: cell.isFuture
                                ? "transparent"
                                : cell.value < 0
                                  ? skipGradient
                                  : color || baseColor,
                              border: cell.isFuture ? "1px solid oklch(0.9 0 0)" : "none",
                            }}
                            title={`${formatDateKey(cell.date)}${cell.value < 0 ? " (skipped)" : ""}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t">
              <span className="text-xs text-muted-foreground">Less</span>
              <div className="flex gap-1">
                {[0, 0.25, 0.5, 0.8].map((opacity, i) => (
                  <div
                    key={i}
                    className="w-[14px] h-[14px] rounded-sm"
                    style={{
                      backgroundColor:
                        opacity === 0
                          ? "oklch(0.95 0 0)"
                          : `rgba(${hexToRgb(habit?.color) ?? "34, 197, 94"}, ${opacity})`,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">More</span>
              <div className="flex items-center gap-2 ml-4">
                <div
                  className="w-[14px] h-[14px] rounded-sm relative overflow-hidden"
                  style={{ backgroundColor: "oklch(0.95 0 0)" }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, transparent 50%, rgba(${hexToRgb(habit?.color) ?? "34, 197, 94"}, 0.25) 50%)`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">Skip</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 pt-4 border-t">
              {[
                { value: chainData.currentStreak, label: "current streak" },
                { value: chainData.longestStreak, label: "longest streak" },
                { value: chainData.totalCount, label: "total count" },
                { value: `${chainData.completionRate}%`, label: "completion rate" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{value}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
