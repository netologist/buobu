import { CalendarClock, Check, Clock, RotateCcw, SkipForward } from "lucide-react";

import type { Task } from "@/lib/types";

import { BriefingIconButton } from "./BriefingIconButton";

type BriefingTaskSectionProps = {
  tasks: Task[];
  processing: Set<string>;
  onCompleteTask: (task: Task) => void;
  onRevertTask: (task: Task) => void;
  onSkipTask: (task: Task) => void;
  onMoveTask: (task: Task) => void;
};

export function BriefingTaskSection({
  tasks,
  processing,
  onCompleteTask,
  onRevertTask,
  onSkipTask,
  onMoveTask,
}: BriefingTaskSectionProps) {
  if (tasks.length === 0) return null;

  return (
    <>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground py-1">Tasks</p>
      {tasks.map((task) => {
        const busy = processing.has(task.id);
        const done = !!task.completedAt;

        return (
          <div
            key={task.id}
            className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5"
          >
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm ${done ? "line-through text-muted-foreground" : ""}`}>
                {task.title}
              </p>
              {task.time && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {task.time}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {done ? (
                <BriefingIconButton
                  title="Revert"
                  disabled={busy}
                  onClick={() => onRevertTask(task)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </BriefingIconButton>
              ) : (
                <>
                  <BriefingIconButton
                    title="Done"
                    className="text-green-700 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                    disabled={busy}
                    onClick={() => onCompleteTask(task)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </BriefingIconButton>
                  <BriefingIconButton
                    title="Skip (remove from today)"
                    disabled={busy}
                    onClick={() => onSkipTask(task)}
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                  </BriefingIconButton>
                  <BriefingIconButton
                    title="Move to another date"
                    disabled={busy}
                    onClick={() => onMoveTask(task)}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
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
