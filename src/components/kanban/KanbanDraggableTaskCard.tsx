"use client";

import { memo, useCallback, type CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { KanbanTaskCardContent } from "@/components/kanban/KanbanTaskCardContent";

export type KanbanDraggableTaskCardProps = {
  task: Task;
  routineTitle?: string;
  onOpenTask: (taskId: string) => void;
  currency: string;
  swimlaneColor?: string;
  onStartPomodoro: (task: Task) => void;
  onArchiveTask: (task: Task) => void;
};

function KanbanDraggableTaskCardComponent({
  task,
  routineTitle,
  onOpenTask,
  currency,
  swimlaneColor,
  onStartPomodoro,
  onArchiveTask,
}: KanbanDraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const handleOpen = useCallback(() => {
    onOpenTask(task.id);
  }, [onOpenTask, task.id]);

  const handleStartPomodoro = useCallback(() => {
    onStartPomodoro(task);
  }, [onStartPomodoro, task]);

  const handleArchive = useCallback(() => {
    onArchiveTask(task);
  }, [onArchiveTask, task]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeftColor: swimlaneColor ?? undefined,
  } as CSSProperties;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`group cursor-pointer border-l-4 p-3 shadow-sm ${isDragging ? "opacity-60" : ""}`}
      onClick={handleOpen}
      {...listeners}
      {...attributes}
    >
      <KanbanTaskCardContent
        task={task}
        routineTitle={routineTitle}
        currency={currency}
        onStartPomodoro={handleStartPomodoro}
        onArchive={handleArchive}
      />
    </Card>
  );
}

export const KanbanDraggableTaskCard = memo(KanbanDraggableTaskCardComponent);
KanbanDraggableTaskCard.displayName = "KanbanDraggableTaskCard";
