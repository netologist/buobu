"use client";

import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Swimlane } from "@/lib/types";
import { ReorderModal } from "@/components/ui/reorder-modal";
import { useBoardStore } from "@/stores/board-store";
import { useSwimlaneSelectionDerived } from "@/stores/swimlane-selection-store";

// ── Sortable swimlane row ─────────────────────────────────────────────────────

function SortableSwimlaneRow({ swimlane }: { swimlane: Swimlane }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: swimlane.id });

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
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: swimlane.color ?? "#6B7280" }}
      />
      <span className="flex-1 text-sm font-medium truncate">{swimlane.name}</span>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export type ReorderSwimlanesModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Board whose swimlanes to reorder. Falls back to the currently selected board. */
  boardId?: string | null;
};

export function ReorderSwimlanesModal({
  open,
  onOpenChange,
  boardId: boardIdProp,
}: ReorderSwimlanesModalProps) {
  const allSwimlanes = useBoardStore((s) => s.swimlanes);
  const reorderSwimlanes = useBoardStore((s) => s.reorderSwimlanes);
  const { primaryBoardId } = useSwimlaneSelectionDerived();

  const boardId = boardIdProp ?? primaryBoardId;

  // useMemo keeps the reference stable — only changes when the underlying data
  // actually changes, preventing useEffect from firing on every render.
  const boardSwimlanes = useMemo(
    () => allSwimlanes.filter((s) => s.boardId === boardId && !s.archived),
    [allSwimlanes, boardId],
  );

  async function handleSave(items: Swimlane[]) {
    await reorderSwimlanes(items.map((s) => s.id));
  }

  return (
    <ReorderModal
      open={open}
      onOpenChange={onOpenChange}
      title="Reorder Swimlanes"
      items={boardSwimlanes}
      getItemId={(item) => item.id}
      renderItem={(item) => <SortableSwimlaneRow key={item.id} swimlane={item} />}
      onSave={handleSave}
      emptyMessage="No swimlanes to reorder."
      singleItemHint="Add more swimlanes to drag and reorder them."
    />
  );
}
