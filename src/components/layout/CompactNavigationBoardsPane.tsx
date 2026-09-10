import type { MutableRefObject } from "react";
import {
  Archive,
  ArrowUpDown,
  Check,
  ChevronLeft,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";

import type { Board } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEntitlements } from "@/stores/entitlements-store";
import { PLAN_LIMITS } from "@/lib/subscriptions";

type CompactNavigationLabels = {
  board: string;
  boardPlural: string;
};

type CompactNavigationBoardsPaneProps = {
  labels: CompactNavigationLabels;
  showArchivedBoards: boolean;
  archivedBoards: Board[];
  boards: Board[];
  visibleBoards: Board[];
  selectedBoard: Board | null;
  totalSwimlaneCount: number;
  openMenuKey: string | null;
  menuPosition: { top: number; left: number } | null;
  menuRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  canShowBoardMenu: boolean;
  onBoardSelect: (boardId: string) => void;
  showAllBoardsOption?: boolean;
  isAllBoardsSelected?: boolean;
  onAllBoardsSelect?: () => void;
  onAddBoard?: () => void;
  onEditBoard?: (board: Board) => void;
  onDeleteBoard?: (board: Board) => void;
  onArchiveBoard?: (board: Board) => void;
  onUnarchiveBoard?: (boardId: string) => void;
  onShowArchivedBoards: () => void;
  onHideArchivedBoards: () => void;
  onToggleMenu: (key: string, trigger?: HTMLElement | null) => void;
  onCloseMenu: () => void;
  onOpenReorderBoards: () => void;
};

export function CompactNavigationBoardsPane({
  labels,
  showArchivedBoards,
  archivedBoards,
  boards,
  visibleBoards,
  selectedBoard,
  totalSwimlaneCount,
  openMenuKey,
  menuPosition,
  menuRefs,
  canShowBoardMenu,
  onBoardSelect,
  showAllBoardsOption,
  isAllBoardsSelected,
  onAllBoardsSelect,
  onAddBoard,
  onEditBoard,
  onDeleteBoard,
  onArchiveBoard,
  onUnarchiveBoard,
  onShowArchivedBoards,
  onHideArchivedBoards,
  onToggleMenu,
  onCloseMenu,
  onOpenReorderBoards,
}: CompactNavigationBoardsPaneProps) {
  const { isPlus } = useEntitlements();
  return (
    <div className="flex min-h-0 w-1/2 flex-col border-r">
      <div className="flex items-center justify-between border-b px-2 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {labels.boardPlural}
        </span>
        {!isPlus && (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {boards.length} / {PLAN_LIMITS.boards}
          </span>
        )}
        <div className="flex items-center gap-0.5">
          {!showArchivedBoards && boards.length >= 1 && (
            <button
              type="button"
              onClick={onOpenReorderBoards}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              title={`Reorder ${labels.boardPlural}`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          )}
          {onAddBoard && (
            <button
              type="button"
              onClick={onAddBoard}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              title={`New ${labels.board}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-3 pt-1" data-compact-scroll="true">
        {showArchivedBoards && archivedBoards.length > 0 && (
          <button
            type="button"
            onClick={onHideArchivedBoards}
            className="mb-1 flex w-full items-center gap-1.5 rounded-sm border-b border-border/40 px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-accent/50"
          >
            <ChevronLeft className="h-3 w-3" />
            <span>BACK TO ACTIVE</span>
          </button>
        )}

        {showAllBoardsOption && onAllBoardsSelect && (
          <button
            type="button"
            onClick={onAllBoardsSelect}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs",
              isAllBoardsSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            )}
          >
            <Check className={cn("h-3.5 w-3.5 shrink-0", isAllBoardsSelected ? "opacity-100" : "opacity-0")} />
            <span className="truncate font-medium">All</span>
          </button>
        )}

        {visibleBoards.map((board) => {
          const isSelected = !isAllBoardsSelected && selectedBoard?.id === board.id;
          const menuKey = `board:${board.id}`;
          const count = board.id === selectedBoard?.id ? totalSwimlaneCount : undefined;
          const isArchivedBoard = board.archived === true;

          return (
            <div key={board.id} className="group relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs">
              <button
                type="button"
                onClick={() => onBoardSelect(board.id)}
                title={board.description || undefined}
                className={cn(
                  "flex flex-1 items-center gap-2 rounded-sm text-left",
                  isSelected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Check className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                <span className="truncate text-sm">{board.name}</span>
              </button>

              <span className="relative ml-auto inline-flex h-5 w-5 items-center justify-end">
                {count !== undefined && count > 0 && (
                  <span
                    className={cn(
                      "text-[10px] tabular-nums",
                      openMenuKey === menuKey ? "hidden" : "group-hover:hidden",
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                )}

                {!isArchivedBoard && canShowBoardMenu && (
                  <button
                    className={cn(
                      "absolute inset-0 h-5 w-5 items-center justify-center rounded transition-opacity hover:bg-accent",
                      openMenuKey === menuKey
                        ? "inline-flex opacity-100"
                        : "opacity-0 group-hover:inline-flex group-hover:opacity-100"
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleMenu(menuKey, event.currentTarget);
                    }}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}

                {!isArchivedBoard && canShowBoardMenu && openMenuKey === menuKey && menuPosition && (
                  <div
                    ref={(element) => {
                      menuRefs.current[menuKey] = element;
                    }}
                    style={{ position: "fixed", top: menuPosition.top, left: menuPosition.left, zIndex: 10000 }}
                    className="min-w-32 rounded-md border bg-popover p-1 shadow-md"
                  >
                    {onEditBoard && (
                      <button
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditBoard(board);
                          onCloseMenu();
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                    )}
                    {onArchiveBoard && (
                      <button
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-amber-700 hover:bg-accent dark:text-amber-300"
                        onClick={(event) => {
                          event.stopPropagation();
                          onArchiveBoard(board);
                          onCloseMenu();
                        }}
                      >
                        <Archive className="h-3 w-3" />
                        <span>Archive</span>
                      </button>
                    )}
                    {onDeleteBoard && (
                      <button
                        className={cn(
                          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs",
                          boards.length <= 1 ? "cursor-not-allowed text-muted-foreground" : "text-destructive hover:bg-accent"
                        )}
                        disabled={boards.length <= 1}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (boards.length <= 1) return;
                          onDeleteBoard(board);
                          onCloseMenu();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}

                {isArchivedBoard && onUnarchiveBoard && (
                  <button
                    className="absolute inset-0 h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity hover:bg-accent group-hover:inline-flex group-hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      onUnarchiveBoard(board.id);
                    }}
                    title="Restore"
                  >
                    <RotateCcw className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </span>
            </div>
          );
        })}

        {!showArchivedBoards && archivedBoards.length > 0 && (
          <button
            type="button"
            onClick={onShowArchivedBoards}
            className="mt-1 flex w-full items-center gap-1.5 rounded-sm border-t border-border/40 px-2 py-1.5 pt-2 text-[10px] text-muted-foreground hover:bg-accent/50"
          >
            <Archive className="h-3 w-3" />
            <span>{`SHOW ARCHIVED (${archivedBoards.length})`}</span>
          </button>
        )}
      </div>
    </div>
  );
}
