"use client";

import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Board } from "@/lib/types";
import { ReorderModal } from "@/components/ui/reorder-modal";
import { useBoardStore } from "@/stores/board-store";

// ── Sortable board row ────────────────────────────────────────────────────────

function SortableBoardRow({ board }: { board: Board }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: board.id });

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
      <span className="flex-1 text-sm font-medium truncate">{board.name}</span>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export type ReorderBoardsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReorderBoardsModal({
  open,
  onOpenChange,
}: ReorderBoardsModalProps) {
  const storeBoards = useBoardStore((s) => s.boards);
  const reorderBoards = useBoardStore((s) => s.reorderBoards);

  // useMemo keeps the reference stable — only changes when the underlying data
  // actually changes, preventing useEffect from firing on every render.
  const activeBoards = useMemo(
    () => storeBoards.filter((b) => !b.archived),
    [storeBoards],
  );
  async function handleSave(items: Board[]) {
    await reorderBoards(items.map((b) => b.id));
  }

  return (
    <ReorderModal
      open={open}
      onOpenChange={onOpenChange}
      title="Reorder Boards"
      items={activeBoards}
      getItemId={(item) => item.id}
      renderItem={(item) => <SortableBoardRow key={item.id} board={item} />}
      onSave={handleSave}
      emptyMessage="No boards to reorder."
      singleItemHint="Add more boards to drag and reorder them."
    />
  );
}
