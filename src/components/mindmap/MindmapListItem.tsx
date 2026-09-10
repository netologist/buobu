import { Brain } from "lucide-react";
import type { Mindmap } from "@/lib/types";

export type MindmapListItemProps = {
  mindmap: Mindmap;
  swimlaneColor?: string;
  isActive: boolean;
  onClick: () => void;
};

export function MindmapListItem({
  mindmap,
  swimlaneColor,
  isActive,
  onClick,
}: MindmapListItemProps) {
  const nodeCount = mindmap.nodes?.length ?? 0;

  return (
    <button
      onClick={onClick}
      className={`flex w-full flex-col gap-0.5 border-b border-l-[3px] px-4 py-2.5 text-left transition-colors ${
        isActive ? "bg-primary/10" : "hover:bg-muted/50"
      }`}
      style={swimlaneColor ? { borderLeft: `3px solid ${swimlaneColor}` } : undefined}
    >
      <div className="flex items-center gap-1.5">
        <Brain className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-300" />
        <span className="truncate text-sm font-medium leading-tight">{mindmap.title || "Untitled"}</span>
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        <span className="text-[10px] text-muted-foreground">
          {new Date(mindmap.updatedAt).toLocaleDateString()}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {nodeCount} node{nodeCount !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-0.5">
          {[
            ...new Set(
              mindmap.nodes
                ?.filter((node) => node.parentId === null || node.parentId === mindmap.nodes?.[0]?.id)
                .map((node) => node.color),
            ),
          ]
            .slice(0, 4)
            .map((color, index) => (
              <div key={index} className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            ))}
        </div>
      </div>
    </button>
  );
}
