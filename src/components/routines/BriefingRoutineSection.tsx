import { Badge } from "@/components/ui/badge";
import type { Routine, RoutineLog } from "@/lib/types";
import { Check, Clock, RotateCcw, SkipForward } from "lucide-react";

import { BriefingIconButton } from "./BriefingIconButton";

type BriefingRoutineSectionProps = {
  routines: Routine[];
  processing: Set<string>;
  getRoutineLogToday: (routineId: string) => RoutineLog | undefined;
  onOpenApproveDialog: (routine: Routine) => void;
  onSkipRoutine: (routine: Routine) => void;
  onRevertRoutine: (routine: Routine) => void;
};

export function BriefingRoutineSection({
  routines,
  processing,
  getRoutineLogToday,
  onOpenApproveDialog,
  onSkipRoutine,
  onRevertRoutine,
}: BriefingRoutineSectionProps) {
  if (routines.length === 0) return null;

  return (
    <>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground py-1">Routines</p>
      {routines.map((routine) => {
        const log = getRoutineLogToday(routine.id);
        const busy = processing.has(routine.id);

        return (
          <div
            key={routine.id}
            className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className={`truncate text-sm ${log ? "text-muted-foreground" : ""}`}>
                  {routine.title}
                </p>
                <Badge
                  variant="outline"
                  className={`shrink-0 rounded-full px-1.5 py-0 text-[9px] ${
                    routine.type === "task"
                      ? "border-blue-500/40 text-blue-700 dark:text-blue-300"
                      : routine.type === "event"
                        ? "border-violet-500/40 text-violet-700 dark:text-violet-300"
                        : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {routine.type}
                </Badge>
              </div>
              {routine.type === "event" && routine.eventTime && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {routine.eventTime}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {log ? (
                <>
                  <Badge
                    variant="outline"
                    className={`text-[9px] ${
                      log.status === "approved"
                        ? "border-green-500/40 text-green-700 dark:text-green-400"
                        : log.status === "auto-processed"
                          ? "border-blue-500/40 text-blue-700 dark:text-blue-400"
                          : "border-muted-foreground/40 text-muted-foreground"
                    }`}
                  >
                    {log.status}
                  </Badge>
                  <BriefingIconButton
                    title="Revert"
                    disabled={busy}
                    onClick={() => onRevertRoutine(routine)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </BriefingIconButton>
                </>
              ) : (
                <>
                  <BriefingIconButton
                    title="Approve"
                    className="text-green-700 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                    disabled={busy}
                    onClick={() => onOpenApproveDialog(routine)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </BriefingIconButton>
                  <BriefingIconButton
                    title="Skip"
                    disabled={busy}
                    onClick={() => onSkipRoutine(routine)}
                  >
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
