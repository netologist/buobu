"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardColumn } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";

export type ColumnListItemProps = {
  column: BoardColumn;
  isArchiveColumn: boolean;
  onEdit: (column: BoardColumn) => void;
  onDelete: (columnId: string) => void;
};

export function ColumnListItem({ column, isArchiveColumn, onEdit, onDelete }: ColumnListItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!showMenu) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setShowMenu(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowMenu(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showMenu]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-md border bg-card px-3 py-2",
        isDragging && "opacity-50 shadow-lg",
        isArchiveColumn && "border-dashed border-muted-foreground/50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="flex-1 text-sm font-medium truncate">
        {column.title}
        {isArchiveColumn && (
          <span className="ml-2 text-xs text-muted-foreground">(Archive)</span>
        )}
      </span>

      <div className="relative">
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setShowMenu(!showMenu)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {showMenu && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full z-20 mt-1 min-w-[120px] rounded-md border bg-popover p-1 shadow-md"
          >
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => {
                onEdit(column);
                setShowMenu(false);
              }}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
              onClick={() => {
                onDelete(column.id);
                setShowMenu(false);
              }}
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
