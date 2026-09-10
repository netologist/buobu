"use client";

import type { VisionBoardItem, Board, Swimlane } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ChevronRight } from "lucide-react";

type WhiteboardsSectionProps = {
  whiteboards: VisionBoardItem[];
  boardMap: Map<string, Board>;
  swimlaneMap: Map<string, Swimlane>;
  onSelect?: (wb: VisionBoardItem) => void;
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

function countElements(excalidrawData?: string): number {
  if (!excalidrawData) return 0;
  try {
    const parsed = JSON.parse(excalidrawData);
    return Array.isArray(parsed?.elements) ? parsed.elements.length : 0;
  } catch {
    return 0;
  }
}

export function WhiteboardsSection({
  whiteboards,
  boardMap,
  swimlaneMap,
  onSelect,
}: WhiteboardsSectionProps) {
  if (whiteboards.length === 0) {
    return (
      <EmptyState
        icon={<LayoutDashboard className="size-8 text-muted-foreground/40" />}
        message="No whiteboards match the current filter"
      />
    );
  }

  // Group by board → swimlane
  const grouped = new Map<string, Map<string, VisionBoardItem[]>>();
  for (const wb of whiteboards) {
    const bid = wb.boardId ?? "__unknown__";
    const sid = wb.swimlaneId ?? "__unknown__";
    if (!grouped.has(bid)) grouped.set(bid, new Map());
    const byBoard = grouped.get(bid)!;
    if (!byBoard.has(sid)) byBoard.set(sid, []);
    byBoard.get(sid)!.push(wb);
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
                {Array.from(bySwimlane.values()).flat().length} boards
              </span>
            </h3>

            <div className="space-y-4 pl-4 border-l border-border/60">
              {Array.from(bySwimlane.entries()).map(([swimlaneId, swimlaneBoards]) => {
                const swimlane = swimlaneMap.get(swimlaneId);
                return (
                  <div key={swimlaneId}>
                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <ChevronRight className="size-3" />
                      {swimlane?.name ?? "Unknown Swimlane"}
                      <span className="ml-1 font-normal normal-case">
                        ({swimlaneBoards.length})
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {swimlaneBoards.map((wb) => (
                        <WhiteboardCard key={wb.id} wb={wb} onSelect={onSelect} />
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

function WhiteboardCard({ wb, onSelect }: { wb: VisionBoardItem; onSelect?: (wb: VisionBoardItem) => void }) {
  const elementCount = countElements(wb.excalidrawData);
  const updated = formatDate(wb.updatedAt);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 text-sm shadow-xs transition-colors",
        "hover:border-primary/30 hover:bg-card/80",
        onSelect && "cursor-pointer"
      )}
      onClick={onSelect ? () => onSelect(wb) : undefined}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <LayoutDashboard className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium line-clamp-1 text-foreground">
            {wb.title || "Untitled Whiteboard"}
          </p>
        </div>
      </div>

      {wb.content && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {wb.content}
        </p>
      )}

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {elementCount > 0
            ? `${elementCount} element${elementCount !== 1 ? "s" : ""}`
            : "Empty canvas"}
        </span>
        {updated && <span>{updated}</span>}
      </div>
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
