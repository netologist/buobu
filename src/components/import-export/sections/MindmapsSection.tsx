"use client";

import type { Mindmap, Board, Swimlane } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GitFork, ChevronRight } from "lucide-react";

type MindmapsSectionProps = {
  mindmaps: Mindmap[];
  boardMap: Map<string, Board>;
  swimlaneMap: Map<string, Swimlane>;
  onSelect?: (mindmap: Mindmap) => void;
};

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function getDepth(mindmap: Mindmap): number {
  if (!mindmap.nodes.length) return 0;
  const childrenMap = new Map<string | null, typeof mindmap.nodes>();
  for (const node of mindmap.nodes) {
    const pid = node.parentId ?? null;
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)!.push(node);
  }

  function depthOf(nodeId: string | null): number {
    const children = childrenMap.get(nodeId) ?? [];
    if (!children.length) return 0;
    return 1 + Math.max(...children.map((c) => depthOf(c.id)));
  }

  return depthOf(null);
}

export function MindmapsSection({ mindmaps, boardMap, swimlaneMap, onSelect }: MindmapsSectionProps) {
  if (mindmaps.length === 0) {
    return (
      <EmptyState
        icon={<GitFork className="size-8 text-muted-foreground/40" />}
        message="No mindmaps match the current filter"
      />
    );
  }

  // Group by board → swimlane
  const grouped = new Map<string, Map<string, Mindmap[]>>();
  for (const mm of mindmaps) {
    const bid = mm.boardId ?? "__unknown__";
    const sid = mm.swimlaneId ?? "__unknown__";
    if (!grouped.has(bid)) grouped.set(bid, new Map());
    const byBoard = grouped.get(bid)!;
    if (!byBoard.has(sid)) byBoard.set(sid, []);
    byBoard.get(sid)!.push(mm);
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([boardId, bySwimlane]) => {
        const board = boardMap.get(boardId);
        return (
          <div key={boardId}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="inline-block size-2 rounded-full bg-primary" />
              {board?.name ?? "Unknown Board"}
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {Array.from(bySwimlane.values()).flat().length} mindmaps
              </span>
            </h3>

            <div className="space-y-4 pl-4 border-l border-border/60">
              {Array.from(bySwimlane.entries()).map(([swimlaneId, swimlaneMaps]) => {
                const swimlane = swimlaneMap.get(swimlaneId);
                return (
                  <div key={swimlaneId}>
                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <ChevronRight className="size-3" />
                      {swimlane?.name ?? "Unknown Swimlane"}
                      <span className="ml-1 font-normal normal-case">
                        ({swimlaneMaps.length})
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {swimlaneMaps.map((mm) => (
                        <MindmapCard key={mm.id} mindmap={mm} onSelect={onSelect} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MindmapCard({ mindmap, onSelect }: { mindmap: Mindmap; onSelect?: (mindmap: Mindmap) => void }) {
  const nodeCount = mindmap.nodes.length;
  const rootNodes = mindmap.nodes.filter((n) => n.parentId == null);
  const depth = getDepth(mindmap);
  const updated = formatDate(mindmap.updatedAt);

  // Preview: first 4 root-level node labels
  const previewLabels = rootNodes.slice(0, 4).map((n) => n.label);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 text-sm shadow-xs transition-colors",
        "hover:border-primary/30 hover:bg-card/80",
        mindmap.archived && "opacity-60",
        onSelect && "cursor-pointer"
      )}
      onClick={onSelect ? () => onSelect(mindmap) : undefined}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-900/30">
          <GitFork className="size-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium line-clamp-1 text-foreground">
            {mindmap.title || "Untitled Mindmap"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {nodeCount} node{nodeCount !== 1 ? "s" : ""}
            {depth > 0 && ` · ${depth} level${depth !== 1 ? "s" : ""} deep`}
          </p>
        </div>
        {mindmap.archived && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Archived
          </span>
        )}
      </div>

      {previewLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {previewLabels.map((label, i) => (
            <span
              key={i}
              className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground"
            >
              {label}
            </span>
          ))}
          {rootNodes.length > 4 && (
            <span className="text-[11px] text-muted-foreground self-center">
              +{rootNodes.length - 4} more
            </span>
          )}
        </div>
      )}

      {updated && (
        <p className="text-[11px] text-muted-foreground">{updated}</p>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {icon}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
