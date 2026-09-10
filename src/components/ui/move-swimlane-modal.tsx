"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import type { Board, Swimlane } from "@/lib/types";
import { useBoardStore, type SwimlaneResources } from "@/stores/board-store";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MoveSwimlaneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swimlane: Swimlane | null;
  /** Active (non-archived) boards, current board excluded */
  targetBoards: Board[];
}

type ResourceGroup = {
  label: string;
  items: Array<{ id: string; title: string; archived: boolean }>;
};

function buildResourceGroups(resources: SwimlaneResources): ResourceGroup[] {
  const groups: ResourceGroup[] = [
    {
      label: "Tasks",
      items: resources.tasks.map((t) => ({ id: t.id, title: t.title, archived: !!t.archived })),
    },
    {
      label: "Habits",
      items: resources.habits.map((h) => ({ id: h.id, title: h.title, archived: !!h.archived })),
    },
    {
      label: "Routines",
      items: resources.routines.map((r) => ({ id: r.id, title: r.title, archived: !!r.archived })),
    },
    {
      label: "Notes",
      items: resources.notes.map((n) => ({ id: n.id, title: n.title, archived: !!n.archived })),
    },
    {
      label: "Bookmarks",
      items: resources.bookmarks.map((b) => ({ id: b.id, title: b.title, archived: !!b.archived })),
    },
    {
      label: "Mindmaps",
      items: resources.mindmaps.map((m) => ({ id: m.id, title: m.title, archived: !!m.archived })),
    },
    {
      label: "Vision Board",
      items: resources.visionItems.map((v) => ({ id: v.id, title: v.title ?? "Untitled", archived: !!v.archived })),
    },
  ];
  return groups.filter((g) => g.items.length > 0);
}

export function MoveSwimlaneModal({
  open,
  onOpenChange,
  swimlane,
  targetBoards,
}: MoveSwimlaneModalProps) {
  const { moveSwimlane, getSwimlaneResources } = useBoardStore();

  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [resources, setResources] = useState<SwimlaneResources | null>(null);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  // Reset + fetch resources when opening
  useEffect(() => {
    if (!open || !swimlane) {
      setSelectedBoardId(null);
      setResources(null);
      return;
    }
    setIsLoadingResources(true);
    getSwimlaneResources(swimlane.id)
      .then((res) => setResources(res))
      .finally(() => setIsLoadingResources(false));
  }, [open, swimlane, getSwimlaneResources]);

  const handleMove = async () => {
    if (!swimlane || !selectedBoardId) return;
    setIsMoving(true);
    try {
      await moveSwimlane(swimlane.id, selectedBoardId);
      onOpenChange(false);
    } finally {
      setIsMoving(false);
    }
  };

  const resourceGroups = resources ? buildResourceGroups(resources) : [];
  const totalCount = resourceGroups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0" showCloseButton={false}>
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-sm font-semibold">
            Move &ldquo;{swimlane?.name}&rdquo; to another board
          </DialogTitle>
        </DialogHeader>

        {/* Board selector */}
        <div className="border-b px-4 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Select target board</p>
          <div className="flex flex-col gap-1">
            {targetBoards.length === 0 ? (
              <p className="text-xs text-muted-foreground">No other boards available.</p>
            ) : (
              targetBoards.map((board) => (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => setSelectedBoardId(board.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    selectedBoardId === board.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="flex-1 truncate font-medium">{board.name}</span>
                  {selectedBoardId === board.id && <ArrowRight className="h-3.5 w-3.5 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Resource preview */}
        <div className="px-4 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {isLoadingResources
              ? "Loading resources…"
              : totalCount === 0
              ? "No resources in this swimlane"
              : `Resources to move (${totalCount})`}
          </p>

          {isLoadingResources ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-48">
              <div className="flex flex-col gap-3 pr-2">
                {resourceGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label} ({group.items.length})
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 rounded-sm px-2 py-1 text-xs"
                        >
                          <span className="flex-1 truncate text-foreground/80">{item.title}</span>
                          {item.archived && (
                            <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                              archived
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {resourceGroups.length === 0 && (
                  <p className="py-2 text-center text-xs text-muted-foreground">Empty swimlane</p>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="border-t px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleMove}
            disabled={!selectedBoardId || isMoving || targetBoards.length === 0}
          >
            {isMoving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Moving…
              </>
            ) : (
              "Move"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
