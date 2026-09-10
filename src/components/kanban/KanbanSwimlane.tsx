"use client";

import { memo, type CSSProperties, type RefObject } from "react";

import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { useDeferredMount } from "@/hooks/useDeferredMount";
import type { BoardColumn, Swimlane, Task } from "@/lib/types";

type KanbanSwimlaneProps = {
  lane: Swimlane;
  columns: BoardColumn[];
  tasksByColumn: Record<string, Task[]>;
  columnsStyle: CSSProperties;
  viewportRef?: RefObject<HTMLDivElement | null>;
  swimlaneCurrency: string;
  swimlaneColor?: string;
  onOpenTask: (taskId: string) => void;
  onStartPomodoro: (task: Task) => void;
  onArchiveTask: (task: Task) => void;
  onAddCard: (swimlaneId: string, columnId: string) => void;
};

export const KanbanSwimlane = memo(function KanbanSwimlane({
  lane,
  columns,
  tasksByColumn,
  columnsStyle,
  viewportRef,
  swimlaneCurrency,
  swimlaneColor,
  onOpenTask,
  onStartPomodoro,
  onArchiveTask,
  onAddCard,
}: KanbanSwimlaneProps) {
  const { containerRef, shouldRender } = useDeferredMount({ rootRef: viewportRef });

  return (
    <div
      ref={containerRef}
      data-swimlane-id={lane.id}
      className="grid w-full min-w-full rounded-xl border bg-background/60"
      style={{
        ...columnsStyle,
        contentVisibility: "auto",
        containIntrinsicSize: "360px",
      }}
    >
      {columns.map((column) => {
        const columnTasks = tasksByColumn[column.id] ?? [];

        if (!shouldRender) {
          return (
            <div key={column.id} className="border-r px-3 py-3 last:border-r-0">
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                {column.title} · {columnTasks.length} task
              </div>
            </div>
          );
        }

        return (
          <KanbanColumn
            key={column.id}
            droppableId={`${lane.id}::${column.id}`}
            tasks={columnTasks}
            swimlaneCurrency={swimlaneCurrency}
            swimlaneColor={swimlaneColor}
            onOpenTask={onOpenTask}
            onStartPomodoro={onStartPomodoro}
            onArchiveTask={onArchiveTask}
            onAddCard={() => onAddCard(lane.id, column.id)}
          />
        );
      })}
    </div>
  );
});
