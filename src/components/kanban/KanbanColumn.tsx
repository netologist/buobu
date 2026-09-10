"use client";

import { useMemo } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { KanbanDraggableTaskCard } from "@/components/kanban/KanbanDraggableTaskCard";
import { KanbanDroppableColumn } from "@/components/kanban/KanbanDroppableColumn";
import { useBoardConfig } from "@/contexts/BoardConfigContext";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/types";

type KanbanColumnProps = {
  droppableId: string;
  tasks: Task[];
  swimlaneCurrency: string;
  swimlaneColor?: string;
  onOpenTask: (taskId: string) => void;
  onStartPomodoro: (task: Task) => void;
  onArchiveTask: (task: Task) => void;
  onAddCard: () => void;
};

export function KanbanColumn({
  droppableId,
  tasks,
  swimlaneCurrency,
  swimlaneColor,
  onOpenTask,
  onStartPomodoro,
  onArchiveTask,
  onAddCard,
}: KanbanColumnProps) {
  const { routineTitleById, archiveColumnId } = useBoardConfig();
  const sortableTaskIds = useMemo(() => tasks.map((item) => item.id), [tasks]);
  const columnId = useMemo(() => droppableId.split("::")[1] ?? "", [droppableId]);
  const showAddCard = columnId !== archiveColumnId;
  const columnToneClass = columnId === archiveColumnId ? "bg-amber-50/70 dark:bg-amber-950/15" : "";

  return (
    <div className={`flex h-full border-r px-3 py-3 last:border-r-0 ${columnToneClass}`}>
      <KanbanDroppableColumn id={droppableId}>
        <SortableContext items={sortableTaskIds} strategy={verticalListSortingStrategy}>
          <div className="flex min-h-40 flex-1 flex-col gap-3">
            {tasks.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
                No tasks yet
              </div>
            )}
            {tasks.map((task) => (
              <KanbanDraggableTaskCard
                key={task.id}
                task={task}
                routineTitle={task.routineId ? routineTitleById[task.routineId] : undefined}
                onOpenTask={onOpenTask}
                currency={swimlaneCurrency}
                swimlaneColor={swimlaneColor}
                onStartPomodoro={onStartPomodoro}
                onArchiveTask={onArchiveTask}
              />
            ))}
            {showAddCard && (
              <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onAddCard}>
                + Add card
              </Button>
            )}
          </div>
        </SortableContext>
      </KanbanDroppableColumn>
    </div>
  );
}
