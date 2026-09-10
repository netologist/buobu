"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import type { Task } from "@/lib/types";
import { TaskListRow } from "@/components/kanban/TaskListRow";

export type TasksListDraggableTaskItemProps = {
  task: Task;
  routineTitle?: string;
  onOpen: () => void;
  onStartPomodoro?: () => void;
  onArchive?: () => void;
  isDone: boolean;
  onMove?: () => void;
  boardName?: string | null;
  swimlaneName?: string | null;
  swimlaneColor?: string | null;
};

/**
 * Column-list sortable row — supports both cross-section moves and
 * same-column reordering via @dnd-kit/sortable.
 */
export function TasksListDraggableTaskItem({
  task,
  routineTitle,
  onOpen,
  onStartPomodoro,
  onArchive,
  isDone,
  onMove,
  boardName,
  swimlaneName,
  swimlaneColor,
}: TasksListDraggableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? "relative" : undefined,
  };

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
        dragHandleRef={setActivatorNodeRef}
        onMove={onMove}
        boardName={boardName}
        swimlaneName={swimlaneName}
        swimlaneColor={swimlaneColor}
      />
    </div>
  );
}
