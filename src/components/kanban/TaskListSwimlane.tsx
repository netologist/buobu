"use client";

import { memo, type CSSProperties, type RefObject } from "react";

import { TasksListDroppableSection } from "@/components/kanban/TasksListDroppableSection";
import { useDeferredMount } from "@/hooks/useDeferredMount";
import type { BoardColumn, Swimlane, Task } from "@/lib/types";

type TaskListSwimlaneProps = {
  swimlane: Swimlane;
  columns: BoardColumn[];
  tasksByColumn: Record<string, Task[]>;
  collapsedSections: Record<string, boolean>;
  viewportRef?: RefObject<HTMLDivElement | null>;
  shouldRenderContent?: boolean;
  onToggleSection: (sectionId: string) => void;
  onAddTask: (swimlaneId: string, columnId: string) => void;
  onOpenTask: (taskId: string) => void;
  onStartPomodoro: (task: Task) => void;
  onArchiveTask: (taskId: string) => void;
  onMoveTask?: (task: Task) => void;
};

export const TaskListSwimlane = memo(function TaskListSwimlane({
  swimlane,
  columns,
  tasksByColumn,
  collapsedSections,
  viewportRef,
  shouldRenderContent,
  onToggleSection,
  onAddTask,
  onOpenTask,
  onStartPomodoro,
  onArchiveTask,
  onMoveTask,
}: TaskListSwimlaneProps) {
  const { containerRef, shouldRender: shouldDeferredRender } = useDeferredMount({ rootRef: viewportRef });
  const shouldRender = shouldRenderContent ?? shouldDeferredRender;

  const swimlaneStyle = {
    borderLeftColor: `${swimlane.color ?? "#888"}BB`,
    borderLeftWidth: 4,
    contentVisibility: "auto",
    containIntrinsicSize: "420px",
  } as CSSProperties;

  return (
    <div
      ref={containerRef}
      data-swimlane-id={swimlane.id}
      className="overflow-hidden rounded-xl border bg-background"
      style={swimlaneStyle}
    >
      {!shouldRender ? (
        <div className="flex items-center justify-between bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
          <span className="font-medium">{swimlane.name}</span>
          <span>
            {columns.reduce((total, column) => total + (tasksByColumn[column.id]?.length ?? 0), 0)} task
          </span>
        </div>
      ) : (
        <div className="divide-y">
          {columns.map((column) => {
            const sectionId = `${swimlane.id}::${column.id}`;
            const sectionTasks = tasksByColumn[column.id] ?? [];
            const isCollapsed = collapsedSections[sectionId] ?? true;

            return (
              <TasksListDroppableSection
                key={column.id}
                id={sectionId}
                columnTitle={column.title}
                tasks={sectionTasks}
                isCollapsed={isCollapsed}
                onToggle={() => onToggleSection(sectionId)}
                onAddTask={() => onAddTask(swimlane.id, column.id)}
                onOpenTask={onOpenTask}
                onStartPomodoro={onStartPomodoro}
                onArchive={onArchiveTask}
                 onMoveTask={onMoveTask}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});
