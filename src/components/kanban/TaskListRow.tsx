import Link from "next/link";
import {
  Archive,
  Calendar,
  CalendarClock,
  CheckSquare,
  Flag,
  ArrowRightLeft,
  GripVertical,
  MessageCircle,
  Play,
  Timer,
} from "lucide-react";
import type { Task } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { formatCardDate } from "@/components/kanban/taskCardUtils";

export type TaskListRowProps = {
  task: Task;
  routineTitle?: string;
  onOpen: () => void;
  onStartPomodoro?: () => void;
  onArchive?: () => void;
  isDone: boolean;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  dragHandleRef?: React.Ref<HTMLDivElement>;
  onMove?: () => void;
  /** Optional board name shown as a context chip. */
  boardName?: string | null;
  /** Optional swimlane name shown as a context chip. */
  swimlaneName?: string | null;
  /** Swimlane color (hex) used to tint the context chip. */
  swimlaneColor?: string | null;
};

export function TaskListRow({
  task,
  routineTitle,
  onOpen,
  onStartPomodoro,
  onArchive,
  isDone,
  isDragging = false,
  dragHandleProps,
  dragHandleRef,
  onMove,
  boardName,
  swimlaneName,
  swimlaneColor,
}: TaskListRowProps) {
  const checklistDone = (task.checklists ?? []).reduce(
    (acc, list) => acc + list.items.filter((item) => item.done).length,
    0,
  );
  const checklistTotal = (task.checklists ?? []).reduce(
    (acc, list) => acc + list.items.length,
    0,
  );

  return (
    <div
      className={`group border-b last:border-b-0 transition-colors hover:bg-muted/30 ${
        isDragging ? "bg-muted/50 opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        <div
          ref={dragHandleRef}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          style={{ touchAction: "none" }}
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 cursor-pointer" onClick={onOpen}>
          <p
            className={`line-clamp-2 text-sm font-medium ${
              isDone ? "text-muted-foreground line-through" : ""
            }`}
          >
            {task.title}
          </p>
          {task.routineId && routineTitle && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              created from{" "}
              <Link
                href="/routines"
                className="underline-offset-2 hover:underline"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                {routineTitle}
              </Link>
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {(swimlaneName || boardName) && (
              <span
                className="inline-flex max-w-[14rem] items-center gap-1 truncate rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  borderColor: swimlaneColor ? `${swimlaneColor}66` : undefined,
                  background: swimlaneColor ? `${swimlaneColor}1A` : undefined,
                  color: swimlaneColor ?? undefined,
                }}
                title={[boardName, swimlaneName].filter(Boolean).join(" \u00b7 ")}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: swimlaneColor ?? "currentColor" }}
                />
                <span className="truncate">
                  {boardName && swimlaneName
                    ? `${boardName} \u00b7 ${swimlaneName}`
                    : swimlaneName ?? boardName}
                </span>
              </span>
            )}
            {task.date && (
              <span className="inline-flex items-center gap-0.5">
                <Calendar className="h-3 w-3" />
                {formatCardDate(task.date)}
              </span>
            )}
            {task.deadline && (
              <span className="inline-flex items-center gap-0.5">
                <CalendarClock className="h-3 w-3" />
                {formatCardDate(task.deadline)}
              </span>
            )}
            {(task.comments ?? []).length > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <MessageCircle className="h-3 w-3" />
                {task.comments?.length ?? 0}
              </span>
            )}
            {checklistTotal > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <CheckSquare className="h-3 w-3" />
                {checklistDone}/{checklistTotal}
              </span>
            )}
            {(task.pomodoros ?? 0) > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Timer className="h-3 w-3" />
                {task.pomodoros}
              </span>
            )}
            {task.priority !== "low" && (
              <span
                className={`inline-flex items-center gap-0.5 ${
                  task.priority === "high"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-amber-500 dark:text-amber-400"
                }`}
              >
                <Flag className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {/* Move button: always available on mobile, on hover on desktop */}
          {onMove && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-6 w-6 p-0 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                onMove();
              }}
              title="Move to…"
            >
              <ArrowRightLeft className="h-3 w-3" />
            </Button>
          )}
          {isDone ? (
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-6 w-6 p-0 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                onArchive?.();
              }}
            >
              <Archive className="h-3 w-3" />
            </Button>
          ) : onStartPomodoro ? (
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-6 w-6 p-0 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                onStartPomodoro();
              }}
            >
              <Play className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
