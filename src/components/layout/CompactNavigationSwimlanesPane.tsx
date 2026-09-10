import type { MutableRefObject } from "react";
import {
  Archive,
  ArrowUpDown,
  Check,
  Eye,
  EyeOff,
  MoveRight,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import type { Swimlane } from "@/lib/types";
import type { Board } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CompactSwimlaneSearchInput } from "@/components/layout/CompactSwimlaneSearchInput";

export function filterAndRankSwimlanes(
  swimlanes: Swimlane[],
  boards: Board[],
  rawQuery: string,
  selectedSwimlaneIds: Set<string>,
): Swimlane[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const boardById = new Map(boards.map((b) => [b.id, b]));

  const matches = swimlanes.filter((sw) => {
    if (!sw.boardId) return false;
    const board = boardById.get(sw.boardId);
    if (!board) return false;
    const haystack = `${sw.name} ${sw.label ?? ""}`.toLowerCase();
    return haystack.includes(query);
  });

  matches.sort((a, b) => {
    const aSelected = selectedSwimlaneIds.has(a.id) ? 0 : 1;
    const bSelected = selectedSwimlaneIds.has(b.id) ? 0 : 1;
    if (aSelected !== bSelected) return aSelected - bSelected;

    const boardA = boardById.get(a.boardId!)?.name ?? "";
    const boardB = boardById.get(b.boardId!)?.name ?? "";
    if (boardA !== boardB) return boardA.localeCompare(boardB);

    return a.name.localeCompare(b.name);
  });

  return matches;
}

type CompactNavigationLabels = {
  swimlane: string;
  swimlanePlural: string;
};

type CompactNavigationSwimlanesPaneProps = {
  labels: CompactNavigationLabels;
  openMenuKey: string | null;
  menuPosition: { top: number; left: number } | null;
  menuRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  filteredSwimlanes: Swimlane[];
  visibleSwimlanes: Swimlane[];
  archivedSwimlanesForBoard: Swimlane[];
  isArchivedBoardSelected: boolean;
  archivedInlineVisible: boolean;
  showArchivedSwimlanes: boolean;
  swimlaneCounts?: Record<string, number>;
  isAllSwimlanesActive: boolean;
  isSwimlaneSelected: (swimlaneId: string) => boolean;
  canShowSwimlaneMenu: boolean;
  onAllSwimlanesSelect: () => void;
  onSwimlaneToggle: (swimlaneId: string) => void;
  onArchivedSwimlaneToggle: (swimlaneId: string) => void;
  onAddSwimlane?: () => void;
  onEditSwimlane?: (swimlane: Swimlane) => void;
  onDeleteSwimlane?: (swimlane: Swimlane) => void;
  onArchiveSwimlane?: (swimlane: Swimlane) => void;
  onUnarchiveSwimlane?: (swimlaneId: string) => void;
  onMoveSwimlane?: (swimlane: Swimlane) => void;
  onToggleMenu: (key: string, trigger?: HTMLElement | null) => void;
  onCloseMenu: () => void;
  onToggleArchivedSwimlanes: () => void;
  onOpenReorderSwimlanes: () => void;
  // Swimlane search (Task 3+)
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  swimlaneBoardMap: Record<string, Board>;
  // Swimlane search (Task 4)
  allSwimlanes: Swimlane[];
  selectedSwimlaneIds: Set<string>;
  // Swimlane search result click — Task 7
  onSearchResultSelect?: (swimlane: Swimlane) => void;
};

export function CompactNavigationSwimlanesPane({
  labels,
  openMenuKey,
  menuPosition,
  menuRefs,
  filteredSwimlanes,
  visibleSwimlanes,
  archivedSwimlanesForBoard,
  isArchivedBoardSelected,
  archivedInlineVisible,
  showArchivedSwimlanes,
  swimlaneCounts,
  isAllSwimlanesActive,
  isSwimlaneSelected,
  canShowSwimlaneMenu,
  onAllSwimlanesSelect,
  onSwimlaneToggle,
  onArchivedSwimlaneToggle,
  onAddSwimlane,
  onEditSwimlane,
  onDeleteSwimlane,
  onArchiveSwimlane,
  onUnarchiveSwimlane,
  onMoveSwimlane,
  onToggleMenu,
  onCloseMenu,
  onToggleArchivedSwimlanes,
  onOpenReorderSwimlanes,
  searchOpen,
  onSearchOpenChange,
  searchQuery,
  onSearchQueryChange,
  swimlaneBoardMap,
  allSwimlanes,
  selectedSwimlaneIds,
  onSearchResultSelect,
}: CompactNavigationSwimlanesPaneProps) {
  const trimmedQuery = searchQuery.trim();
  const isSearching = searchOpen && trimmedQuery.length > 0;
  const searchResults = isSearching
    ? filterAndRankSwimlanes(
        allSwimlanes,
        Object.values(swimlaneBoardMap),
        trimmedQuery,
        selectedSwimlaneIds,
      )
    : [];

  return (
    <div className="flex min-h-0 w-1/2 flex-col">
      <div className="flex items-center justify-between border-b px-2 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {labels.swimlanePlural}
        </span>
        <div className="flex items-center gap-0.5">
          {searchOpen ? (
            <button
              type="button"
              onClick={() => onSearchOpenChange(false)}
              aria-label="Close swimlane search"
              title="Close search"
              className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSearchOpenChange(true)}
              aria-label="Open swimlane search"
              title="Search swimlanes"
              className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          )}
          {!showArchivedSwimlanes &&
            filteredSwimlanes.filter((swimlane) => !swimlane.archived).length >=
              2 && (
              <button
                type="button"
                onClick={onOpenReorderSwimlanes}
                className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                title={`Reorder ${labels.swimlanePlural}`}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
            )}
          {onAddSwimlane && (
            <button
              type="button"
              onClick={onAddSwimlane}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              title={`New ${labels.swimlane}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {searchOpen && (
        <CompactSwimlaneSearchInput
          open={searchOpen}
          query={searchQuery}
          onQueryChange={onSearchQueryChange}
          onClose={() => onSearchOpenChange(false)}
          placeholder={`Search ${labels.swimlanePlural.toLowerCase()}...`}
        />
      )}
      {isSearching ? (
        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-3 pt-1"
          data-compact-scroll="true"
        >
          {searchResults.length === 0 ? (
            <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
              No swimlanes match &ldquo;{trimmedQuery}&rdquo;
            </p>
          ) : (
            searchResults.map((sw) => {
              const parentBoard = sw.boardId
                ? swimlaneBoardMap[sw.boardId]
                : undefined;
              return (
                <div key={sw.id} className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSearchResultSelect) onSearchResultSelect(sw);
                      else onSwimlaneToggle(sw.id);
                    }}
                    className="flex w-full flex-col items-start gap-0.5 rounded-sm text-left text-foreground hover:bg-accent/50"
                  >
                    <div className="flex w-full items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: sw.color ?? "#6B7280" }}
                      />
                      <span className="flex-1 truncate text-sm font-medium">
                        {sw.name}
                      </span>
                      {sw.archived === true && (
                        <span title="Archived">
                          <Archive
                            className="h-3 w-3 shrink-0 text-muted-foreground"
                            aria-label="Archived"
                          />
                        </span>
                      )}
                    </div>
                    {parentBoard && (
                      <span className="pl-4 text-[10px] text-muted-foreground">
                        {parentBoard.name}
                      </span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-3 pt-1"
          data-compact-scroll="true"
        >
          <button
            type="button"
            onClick={onAllSwimlanesSelect}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs",
              isAllSwimlanesActive
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50",
            )}
          >
            <div
              className={cn(
                "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                isAllSwimlanesActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input",
              )}
            >
              {isAllSwimlanesActive && <Check className="h-2.5 w-2.5" />}
            </div>
            <span className="truncate font-medium">All</span>
          </button>

          {visibleSwimlanes.map((swimlane) => {
            const isSelected = isSwimlaneSelected(swimlane.id);
            const count = swimlaneCounts?.[swimlane.id] ?? 0;
            const menuKey = `swimlane:${swimlane.id}`;
            const isArchivedSwimlane = swimlane.archived === true;

            return (
              <div
                key={swimlane.id}
                className="group relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs"
              >
                <button
                  type="button"
                  onClick={() => onSwimlaneToggle(swimlane.id)}
                  title={swimlane.description || undefined}
                  className={cn(
                    "flex flex-1 items-center gap-2 rounded-sm text-left",
                    isSelected
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input",
                    )}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5" />}
                  </div>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: swimlane.color ?? "#6B7280" }}
                  />
                  <span className="flex-1 truncate text-sm">
                    {swimlane.name}
                  </span>
                </button>

                <span className="relative ml-auto inline-flex h-5 w-5 items-center justify-end">
                  {count > 0 && (
                    <span
                      className={cn(
                        "text-[10px] tabular-nums",
                        openMenuKey === menuKey
                          ? "hidden"
                          : "group-hover:hidden",
                        isSelected
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  )}

                  {!isArchivedSwimlane && canShowSwimlaneMenu && (
                    <button
                      className={cn(
                        "absolute inset-0 h-5 w-5 items-center justify-center rounded transition-opacity hover:bg-accent",
                        openMenuKey === menuKey
                          ? "inline-flex opacity-100"
                          : "opacity-0 group-hover:inline-flex group-hover:opacity-100",
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleMenu(menuKey, event.currentTarget);
                      }}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}

                  {!isArchivedSwimlane &&
                    canShowSwimlaneMenu &&
                    openMenuKey === menuKey &&
                    menuPosition && (
                      <div
                        ref={(element) => {
                          menuRefs.current[menuKey] = element;
                        }}
                        style={{
                          position: "fixed",
                          top: menuPosition.top,
                          left: menuPosition.left,
                          zIndex: 10000,
                        }}
                        className="min-w-32 rounded-md border bg-popover p-1 shadow-md"
                      >
                        {onEditSwimlane && (
                          <button
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEditSwimlane(swimlane);
                              onCloseMenu();
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                        )}
                        {onMoveSwimlane && (
                          <button
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                            onClick={(event) => {
                              event.stopPropagation();
                              onMoveSwimlane(swimlane);
                              onCloseMenu();
                            }}
                          >
                            <MoveRight className="h-3 w-3" />
                            <span>Move to board</span>
                          </button>
                        )}
                        {onArchiveSwimlane && (
                          <button
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-amber-700 hover:bg-accent dark:text-amber-300"
                            onClick={(event) => {
                              event.stopPropagation();
                              onArchiveSwimlane(swimlane);
                              onCloseMenu();
                            }}
                          >
                            <Archive className="h-3 w-3" />
                            <span>Archive</span>
                          </button>
                        )}
                        {onDeleteSwimlane && (
                          <button
                            className={cn(
                              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs",
                              visibleSwimlanes.length <= 1
                                ? "cursor-not-allowed text-muted-foreground"
                                : "text-destructive hover:bg-accent",
                            )}
                            disabled={visibleSwimlanes.length <= 1}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (visibleSwimlanes.length <= 1) return;
                              onDeleteSwimlane(swimlane);
                              onCloseMenu();
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}

                  {isArchivedSwimlane && onUnarchiveSwimlane && (
                    <button
                      className="absolute inset-0 h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity hover:bg-accent group-hover:inline-flex group-hover:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        onUnarchiveSwimlane(swimlane.id);
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

          {!isArchivedBoardSelected &&
            !archivedInlineVisible &&
            archivedSwimlanesForBoard.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={onToggleArchivedSwimlanes}
                  className="mt-1 flex w-full items-center gap-1.5 rounded-sm border-t border-border/40 px-2 py-1.5 pt-2 text-[10px] text-muted-foreground hover:bg-accent/50"
                >
                  {showArchivedSwimlanes ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                  <span>
                    {showArchivedSwimlanes
                      ? "HIDE ARCHIVED"
                      : `SHOW ARCHIVED (${archivedSwimlanesForBoard.length})`}
                  </span>
                </button>
                {showArchivedSwimlanes &&
                  archivedSwimlanesForBoard.map((swimlane) => {
                    const isSelected = isSwimlaneSelected(swimlane.id);
                    const count = swimlaneCounts?.[swimlane.id] ?? 0;

                    return (
                      <div
                        key={swimlane.id}
                        className="group relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => onArchivedSwimlaneToggle(swimlane.id)}
                          className={cn(
                            "flex flex-1 items-center gap-2 rounded-sm text-left",
                            isSelected
                              ? "text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input",
                            )}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5" />}
                          </div>
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor: swimlane.color ?? "#6B7280",
                            }}
                          />
                          <span className="flex-1 truncate text-sm">
                            {swimlane.name}
                          </span>
                        </button>
                        <span className="relative ml-auto inline-flex h-5 w-5 items-center justify-end">
                          {count > 0 && (
                            <span
                              className={cn(
                                "text-[10px] tabular-nums group-hover:hidden",
                                isSelected
                                  ? "text-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              {count}
                            </span>
                          )}
                          {onUnarchiveSwimlane && (
                            <button
                              className="absolute inset-0 h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity hover:bg-accent group-hover:inline-flex group-hover:opacity-100"
                              onClick={(event) => {
                                event.stopPropagation();
                                onUnarchiveSwimlane(swimlane.id);
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
              </>
            )}
        </div>
      )}
    </div>
  );
}
