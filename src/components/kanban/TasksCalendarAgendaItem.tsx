import { Calendar } from "lucide-react";

import type { Task } from "@/lib/types";

type TasksCalendarAgendaItemProps = {
  task: Task;
  isActive: boolean;
  onClick: () => void;
  swimlaneColor?: string;
  swimlaneName?: string;
};

export function TasksCalendarAgendaItem({
  task,
  isActive,
  onClick,
  swimlaneColor,
  swimlaneName,
}: TasksCalendarAgendaItemProps) {
  const taskDate = task.date ? new Date(task.date) : null;
  const dateLabel = taskDate
    ? taskDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <button
      onClick={onClick}
      className={`flex w-full flex-col gap-0.5 border-b px-4 py-2.5 text-left transition-colors ${
        isActive ? "bg-primary/10" : "hover:bg-muted/50"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate text-sm font-medium leading-tight">
          {task.title || "Untitled"}
        </span>
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        <span className="text-[10px] text-muted-foreground">{dateLabel}</span>
        {swimlaneName && (
          <div className="flex items-center gap-1">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: swimlaneColor ?? "var(--muted-foreground)" }}
            />
            <span className="text-[10px] text-muted-foreground">{swimlaneName}</span>
          </div>
        )}
      </div>
    </button>
  );
}
