"use client";

import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardColumn } from "@/lib/types";
import { ReorderModal } from "@/components/ui/ReorderModal";
import { useBoardStore } from "@/stores/board-store";

// ── Sortable column row ───────────────────────────────────────────────────────

function SortableColumnRow({ column }: { column: BoardColumn }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 select-none",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm font-medium truncate">{column.title}</span>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export type ReorderColumnsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string | null | undefined;
};

export function ReorderColumnsModal({
  open,
  onOpenChange,
  boardId,
}: ReorderColumnsModalProps) {
  const boards = useBoardStore((s) => s.boards);
  const reorderColumns = useBoardStore((s) => s.reorderColumns);

  const board = boards.find((b) => b.id === boardId);
  const columns = board?.columns ?? [];

  const [orderedColumns, setOrderedColumns] = useState<BoardColumn[]>([]);

  useEffect(() => {
    if (!open) return;
    setOrderedColumns(columns);
  }, [open, columns]);

  async function handleSave(items: BoardColumn[]) {
    if (!boardId) return;
    setOrderedColumns(items);
    await reorderColumns(boardId, items.map((c) => c.id));
  }

  return (
    <ReorderModal
      open={open}
      onOpenChange={onOpenChange}
      title="Reorder Columns"
      items={orderedColumns}
      getItemId={(item) => item.id}
      renderItem={(item) => <SortableColumnRow key={item.id} column={item} />}
      onSave={handleSave}
      emptyMessage="No columns to reorder."
      singleItemHint="Add more columns to drag and reorder them."
      minItemsToEnableSave={2}
    />
  );
}
