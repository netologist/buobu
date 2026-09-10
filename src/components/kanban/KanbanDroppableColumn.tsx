"use client";

import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";

export type KanbanDroppableColumnProps = {
  id: string;
  children: ReactNode;
};

export function KanbanDroppableColumn({ id, children }: KanbanDroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      data-kanban-dropzone={id}
      className={[
        "flex h-full w-full flex-col rounded-lg transition-colors",
        isOver ? "bg-muted/50 ring-1 ring-border" : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
