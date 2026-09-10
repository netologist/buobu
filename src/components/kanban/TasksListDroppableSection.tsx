"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Task } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TasksListSortableTaskItem } from "@/components/kanban/TasksListSortableTaskItem";
import { useBoardConfig } from "@/contexts/BoardConfigContext";

export type TasksListDroppableSectionProps = {
  id: string;
  columnTitle: string;
  tasks: Task[];
  isCollapsed: boolean;
  onToggle: () => void;
  onAddTask: () => void;
  onOpenTask: (taskId: string) => void;
  onStartPomodoro: (task: Task) => void;
  onArchive: (taskId: string) => void;
  onMoveTask?: (task: Task) => void;
};

export function TasksListDroppableSection({
  id,
  columnTitle,
  tasks,
  isCollapsed,
  onToggle,
  onAddTask,
  onOpenTask,
  onStartPomodoro,
  onArchive,
  onMoveTask,
}: TasksListDroppableSectionProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const { archiveColumnId, routineTitleById } = useBoardConfig();
  const sortableTaskIds = useMemo(() => tasks.map((task) => task.id), [tasks]);

  return (
    <div ref={setNodeRef} className={isOver ? "bg-muted/30" : ""}>
      <div className="flex items-center justify-between bg-muted/30 px-3 py-2">
        <button type="button" onClick={onToggle} className="flex items-center gap-2 text-left">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {columnTitle}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {tasks.length}
          </Badge>
        </button>
      </div>
      {!isCollapsed && (
        <div>
          <SortableContext items={sortableTaskIds} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TasksListSortableTaskItem
                key={task.id}
                task={task}
                routineTitle={task.routineId ? routineTitleById[task.routineId] : undefined}
                onOpen={() => onOpenTask(task.id)}
                onStartPomodoro={() => onStartPomodoro(task)}
                onArchive={() => onArchive(task.id)}
                isDone={task.columnId === archiveColumnId && !task.archived}
                onMove={onMoveTask ? () => onMoveTask(task) : undefined}
              />
            ))}
          </SortableContext>
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
        </div>
      )}
    </div>
  );
}
