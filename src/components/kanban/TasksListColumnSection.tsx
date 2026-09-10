"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TasksListDraggableTaskItem } from "@/components/kanban/TasksListDraggableTaskItem";
import { useBoardConfig } from "@/contexts/BoardConfigContext";
import type { ListSectionTask } from "@/lib/kanban/listSections";
import type { Task } from "@/lib/types";

export type TasksListColumnSectionProps = {
  columnId: string;
  title: string;
  items: ListSectionTask[];
  isCollapsed: boolean;
  canAddTask: boolean;
  onToggle: () => void;
  onAddTask: () => void;
  onOpenTask: (taskId: string) => void;
  onStartPomodoro: (task: Task) => void;
  onArchiveTask: (taskId: string) => void;
  onMoveTask: (task: Task) => void;
};

export function TasksListColumnSection({
  columnId,
  title,
  items,
  isCollapsed,
  canAddTask,
  onToggle,
  onAddTask,
  onOpenTask,
  onStartPomodoro,
  onArchiveTask,
  onMoveTask,
}: TasksListColumnSectionProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column::${columnId}` });
  const { archiveColumnId, routineTitleById } = useBoardConfig();

  return (
    <div
      ref={setNodeRef}
      className={`overflow-hidden rounded-xl border bg-background ${isOver ? "ring-2 ring-primary/30" : ""}`}
    >
      <div className="flex items-center justify-between bg-muted/30 px-3 py-2">
        <button type="button" onClick={onToggle} className="flex items-center gap-2 text-left">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {items.length}
          </Badge>
        </button>
      </div>
      {!isCollapsed && (
        <div>
          <SortableContext items={items.map(({ task }) => task.id)} strategy={verticalListSortingStrategy}>
          {items.map(({ task, board, swimlane }) => (
            <TasksListDraggableTaskItem
              key={task.id}
              task={task}
              routineTitle={task.routineId ? routineTitleById[task.routineId] : undefined}
              onOpen={() => onOpenTask(task.id)}
              onStartPomodoro={() => onStartPomodoro(task)}
              onArchive={() => onArchiveTask(task.id)}
              isDone={task.columnId === archiveColumnId && !task.archived}
              onMove={() => onMoveTask(task)}
              boardName={board?.name ?? null}
              swimlaneName={swimlane?.name ?? null}
              swimlaneColor={swimlane?.color ?? null}
            />
          ))}
          </SortableContext>
          {canAddTask && (
            <div className="px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
                onClick={onAddTask}
              >
                + Add task
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
