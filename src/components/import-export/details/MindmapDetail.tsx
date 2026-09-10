"use client";

import type { Mindmap, MindmapNode, Board, Swimlane } from "@/lib/types";
import { cn } from "@/lib/utils";

type MindmapDetailProps = {
  mindmap: Mindmap;
  board?: Board;
  swimlane?: Swimlane;
};

function formatDate(d?: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return d; }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</h3>
      {children}
    </div>
  );
}

// Always-expanded recursive tree node renderer
function TreeNode({
  node,
  allNodes,
  depth,
}: {
  node: MindmapNode;
  allNodes: MindmapNode[];
  depth: number;
}) {
  const children = allNodes
    .filter((n) => n.parentId === node.id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className={cn("select-none", depth > 0 && "ml-4 border-l border-border/50 pl-3")}>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md py-1 px-1.5 text-sm",
          "cursor-default",
          depth === 0 && "font-semibold text-foreground"
        )}
      >
        <span className="size-4 shrink-0" />

        {node.color && (
          <span
            className="size-2.5 rounded-full shrink-0"
            style={{ backgroundColor: node.color }}
          />
        )}

        <span className={cn("leading-snug", depth === 0 ? "text-foreground" : "text-sm text-foreground/90")}>
          {node.label}
        </span>
      </div>

      {children.length > 0 && (
        <div>
          {children.map((child) => (
            <TreeNode key={child.id} node={child} allNodes={allNodes} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MindmapDetail({ mindmap, board, swimlane }: MindmapDetailProps) {
  const rootNodes = mindmap.nodes
    .filter((n) => n.parentId == null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const totalNodes = mindmap.nodes.length;
  const maxDepth = (() => {
    const childrenMap = new Map<string | null, MindmapNode[]>();
    for (const node of mindmap.nodes) {
      const pid = node.parentId ?? null;
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid)!.push(node);
    }
    function depth(id: string | null): number {
      const kids = childrenMap.get(id) ?? [];
      if (!kids.length) return 0;
      return 1 + Math.max(...kids.map((k) => depth(k.id)));
    }
    return depth(null);
  })();

  return (
    <div className="space-y-5 text-sm">
      {/* Meta */}
      <div className="flex flex-wrap gap-2 items-center">
        {board && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{board.name}</span>}
        {swimlane && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{swimlane.name}</span>}
        {mindmap.archived && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Archived</span>
        )}
      </div>

      {/* Stats */}
      <Section title="Statistics">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold text-foreground mb-1">{totalNodes}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Nodes</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold text-foreground mb-1">{rootNodes.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Root nodes</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold text-foreground mb-1">{maxDepth}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Depth</p>
          </div>
        </div>
      </Section>

      {/* Tree view */}
      <Section title="Tree View">
        {rootNodes.length === 0 ? (
          <p className="text-muted-foreground italic text-xs">No nodes</p>
        ) : (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-0.5">
            {rootNodes.map((node) => (
              <TreeNode key={node.id} node={node} allNodes={mindmap.nodes} depth={0} />
            ))}
          </div>
        )}
      </Section>

      {/* Dates */}
      <Section title="Dates">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Created</p>
            <p className="text-xs">{formatDate(mindmap.createdAt)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Updated</p>
            <p className="text-xs">{formatDate(mindmap.updatedAt)}</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
