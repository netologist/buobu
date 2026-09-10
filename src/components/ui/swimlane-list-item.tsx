"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Swimlane } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SwimlaneListItemProps = {
  swimlane: Swimlane;
  onEdit: (swimlane: Swimlane) => void;
};

export function SwimlaneListItem({ swimlane, onEdit }: SwimlaneListItemProps) {
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
        "group flex items-center gap-2 rounded-md border bg-card px-3 py-2",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div
        className="h-3 w-3 rounded-full shrink-0"
        style={{ backgroundColor: swimlane.color || "#888" }}
      />

      <span className="flex-1 text-sm font-medium truncate">
        {swimlane.name}
      </span>

      {swimlane.archived && (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 h-4 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700"
        >
          Archived
        </Badge>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(swimlane)}>
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Edit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
