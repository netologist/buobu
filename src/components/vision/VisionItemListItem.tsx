import { Sparkles } from "lucide-react";

import type { VisionBoardItem } from "@/lib/types";

type VisionItemListItemProps = {
  item: VisionBoardItem;
  swimlaneColor?: string;
  isActive: boolean;
  onClick: () => void;
};

export function VisionItemListItem({
  item,
  swimlaneColor,
  isActive,
  onClick,
}: VisionItemListItemProps) {
  const elementCount = (() => {
    if (!item.excalidrawData) return 0;
    try {
      const parsed = JSON.parse(item.excalidrawData);
      return parsed.elements?.length ?? 0;
    } catch {
      return 0;
    }
  })();

  return (
    <button
      onClick={onClick}
      className={`flex w-full flex-col gap-0.5 border-b border-l-[3px] px-4 py-2.5 text-left transition-colors ${
        isActive ? "bg-primary/10" : "hover:bg-muted/50"
      }`}
      style={swimlaneColor ? { borderLeft: `3px solid ${swimlaneColor}` } : undefined}
    >
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-300" />
        <span className="truncate text-sm font-medium leading-tight">
          {item.title || "Untitled"}
        </span>
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        <span className="text-[10px] text-muted-foreground">
          {new Date(item.updatedAt).toLocaleDateString()}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {elementCount} element{elementCount !== 1 ? "s" : ""}
        </span>
      </div>
    </button>
  );
}
