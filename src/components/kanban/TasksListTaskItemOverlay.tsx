import type { Task } from "@/lib/types";

export type TasksListTaskItemOverlayProps = {
  task: Task;
};

export function TasksListTaskItemOverlay({ task }: TasksListTaskItemOverlayProps) {
  return (
    <div className="rounded-lg border-b bg-background px-3 py-2.5 opacity-90 shadow-lg">
      <p className="line-clamp-2 text-sm font-medium">{task.title}</p>
    </div>
  );
}
