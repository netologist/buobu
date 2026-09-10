"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronsUpDown, Plus, Check, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Board } from "@/lib/types";
import { useNaming } from "@/contexts/NamingContext";
import { ReorderBoardsModal } from "@/components/ui/reorder-boards-modal";

export type BoardSwitcherProps = {
  boards: Board[];
  selectedBoardId: string | null;
  onBoardChange: (boardId: string) => void;
  onAddBoard: () => void;
};

export function BoardSwitcher({
  boards,
  selectedBoardId,
  onBoardChange,
  onAddBoard,
}: BoardSwitcherProps) {
  const { labels } = useNaming();
  const [open, setOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedBoard = boards.find((b) => b.id === selectedBoardId);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-3 py-3 text-sm",
          "bg-muted/50 hover:bg-muted transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <div className="flex flex-1 items-center gap-2 truncate">
          {/* <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-semibold">
            {selectedBoard?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div> */}
          <span className="truncate font-xs">
            {selectedBoard?.name ?? `Select ${labels.board}`}
          </span>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover shadow-md">
          <div className="max-h-[300px] overflow-y-auto p-1">
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => {
                  onBoardChange(board.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                  "hover:bg-muted transition-colors",
                  board.id === selectedBoardId && "bg-muted"
                )}
              >
                {/* <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-semibold">
                  {board.name?.charAt(0)?.toUpperCase()}
                </div> */}
                <span className="flex-1 truncate text-left">{board.name}</span>
                {board.id === selectedBoardId && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
          <div className="border-t p-1">
            <button
              onClick={() => {
                onAddBoard();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New {labels.board}</span>
            </button>
            {boards.length > 1 && (
              <button
                onClick={() => {
                  setOpen(false);
                  setReorderOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ArrowUpDown className="h-4 w-4" />
                <span>Reorder {labels.boardPlural ?? `${labels.board}s`}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <ReorderBoardsModal open={reorderOpen} onOpenChange={setReorderOpen} />
    </div>
  );
}
