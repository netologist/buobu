"use client";

import type { CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/lib/types";
import { TaskListRow } from "@/components/kanban/TaskListRow";

export type TasksListSortableTaskItemProps = {
  task: Task;
  routineTitle?: string;
  onOpen: () => void;
  onStartPomodoro?: () => void;
  onArchive?: () => void;
  isDone: boolean;
  onMove?: () => void;
};

export function TasksListSortableTaskItem({
  task,
  routineTitle,
  onOpen,
  onStartPomodoro,
  onArchive,
  isDone,
  onMove,
}: TasksListSortableTaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as CSSProperties;

  return (
    <div ref={setNodeRef} style={style}>
      <TaskListRow
        task={task}
        routineTitle={routineTitle}
        onOpen={onOpen}
        onStartPomodoro={onStartPomodoro}
        onArchive={onArchive}
        isDone={isDone}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        onMove={onMove}
      />
    </div>
  );
}
