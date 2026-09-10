"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Board, Swimlane } from "@/lib/types";
import {
  useSwimlaneSelectionDerived,
  useSwimlaneSelectionStore,
} from "@/stores/swimlane-selection-store";
import { useArchiveFilterStore } from "@/stores/archive-filter-store";
import { ReorderBoardsModal } from "@/components/ui/reorder-boards-modal";
import { ReorderSwimlanesModal } from "@/components/ui/reorder-swimlanes-modal";
import { MoveSwimlaneModal } from "@/components/ui/move-swimlane-modal";

import { CompactNavigationDropdown } from "@/components/layout/CompactNavigationDropdown";

type CompactNavigationProps = {
  boards: Board[];
  swimlanes: Swimlane[];
  /** All boards including archived ones (for show/hide archived toggle) */
  allBoards?: Board[];
  /** All swimlanes including archived ones (for show/hide archived toggle) */
  allSwimlanes?: Swimlane[];
  swimlaneCounts?: Record<string, number>;
  labels: {
    board: string;
    boardPlural: string;
    swimlane: string;
    swimlanePlural: string;
  };
  onAddBoard?: () => void;
  onAddSwimlane?: () => void;
  onEditBoard?: (board: Board) => void;
  onEditSwimlane?: (swimlane: Swimlane) => void;
  onDeleteBoard?: (board: Board) => void;
  onDeleteSwimlane?: (swimlane: Swimlane) => void;
  onArchiveBoard?: (board: Board) => void;
  onArchiveSwimlane?: (swimlane: Swimlane) => void;
  onUnarchiveBoard?: (boardId: string) => void;
  onUnarchiveSwimlane?: (swimlaneId: string) => void;
  showAllBoardsOption?: boolean;
};

export function CompactNavigation({
  boards,
  swimlanes,
  allBoards,
  allSwimlanes,
  swimlaneCounts,
  labels,
  onAddBoard,
  onAddSwimlane,
  onEditBoard,
  onEditSwimlane,
  onDeleteBoard,
  onDeleteSwimlane,
  onArchiveBoard,
  onArchiveSwimlane,
  onUnarchiveBoard,
  onUnarchiveSwimlane,
  showAllBoardsOption = true,
}: CompactNavigationProps) {
  const { selectBoard, toggleSwimlane, selectAll } =
    useSwimlaneSelectionStore();
  const {
    primaryBoardId,
    selectedSwimlaneIds,
    isSwimlaneSelected,
    isAllSelected,
  } = useSwimlaneSelectionDerived();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number | null>(
    null,
  );
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [reorderSwimlanesOpen, setReorderSwimlanesOpen] = useState(false);
  const [movingSwimlane, setMovingSwimlane] = useState<Swimlane | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [showArchivedBoards, setShowArchivedBoards] = useState(false);
  const [showArchivedSwimlanes, setShowArchivedSwimlanes] = useState(false);
  // Swimlane search (Task 6)
  const [swimSearchOpen, setSwimSearchOpen] = useState(false);
  const [swimSearchQuery, setSwimSearchQuery] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Also check archived boards/swimlanes to find selected board there
  const allBoardsList = allBoards ?? boards;
  const allSwimlanesList = allSwimlanes ?? swimlanes;

  const selectedBoard = useMemo(() => {
    // First look in active boards, then in all boards (including archived)
    return (
      boards.find((b) => b.id === primaryBoardId) ??
      allBoardsList.find((b) => b.id === primaryBoardId) ??
      boards[0] ??
      null
    );
  }, [boards, allBoardsList, primaryBoardId]);

  const archivedBoards = useMemo(() => {
    return allBoardsList.filter((b) => b.archived === true);
  }, [allBoardsList]);

  const isArchivedBoardSelected = selectedBoard?.archived === true;

  const filteredSwimlanes = useMemo(() => {
    if (!selectedBoard) return [];
    return swimlanes.filter((sw) => sw.boardId === selectedBoard.id);
  }, [swimlanes, selectedBoard]);

  const archivedSwimlanesForBoard = useMemo(() => {
    if (!selectedBoard) return [];
    return allSwimlanesList.filter(
      (sw) => sw.boardId === selectedBoard.id && sw.archived === true,
    );
  }, [allSwimlanesList, selectedBoard]);

  const effectiveShowArchivedBoards =
    showArchivedBoards || isArchivedBoardSelected;
  const visibleBoards = effectiveShowArchivedBoards ? archivedBoards : boards;

  const showArchivedItems = useArchiveFilterStore((s) => s.showArchivedItems);

  // Compute isAllSwimlanesActive without depending on visibleSwimlanes to avoid circularity.
  const hasArchivedSwimlaneSelected = useMemo(
    () =>
      archivedSwimlanesForBoard.some((sw) => selectedSwimlaneIds.has(sw.id)),
    [archivedSwimlanesForBoard, selectedSwimlaneIds],
  );
  const hasActiveSwimlaneSelected = useMemo(
    () => filteredSwimlanes.some((sw) => selectedSwimlaneIds.has(sw.id)),
    [filteredSwimlanes, selectedSwimlaneIds],
  );
  const isAllSwimlanesActive =
    !hasActiveSwimlaneSelected && !hasArchivedSwimlaneSelected;

  // When archive filter is active and "All" swimlanes is selected, merge archived
  // swimlanes into the main list so they're visible and filterable inline.
  const archivedInlineVisible =
    showArchivedItems && isAllSwimlanesActive && !isArchivedBoardSelected;
  const visibleSwimlanes = useMemo<Swimlane[]>(() => {
    if (isArchivedBoardSelected) {
      return archivedSwimlanesForBoard;
    }

    if (archivedInlineVisible) {
      return [...filteredSwimlanes, ...archivedSwimlanesForBoard];
    }

    return filteredSwimlanes;
  }, [
    archivedInlineVisible,
    archivedSwimlanesForBoard,
    filteredSwimlanes,
    isArchivedBoardSelected,
  ]);

  const selectedSwimlanesList = useMemo(() => {
    return visibleSwimlanes.filter((sw) => selectedSwimlaneIds.has(sw.id));
  }, [visibleSwimlanes, selectedSwimlaneIds]);

  const visibleSelectedSwimlaneBadges = useMemo(() => {
    return selectedSwimlanesList.slice(0, 2);
  }, [selectedSwimlanesList]);

  const hiddenSelectedSwimlaneCount =
    selectedSwimlanesList.length - visibleSelectedSwimlaneBadges.length;

  const totalSwimlaneCount = useMemo(() => {
    return visibleSwimlanes.reduce(
      (sum, sw) => sum + (swimlaneCounts?.[sw.id] ?? 0),
      0,
    );
  }, [visibleSwimlanes, swimlaneCounts]);

  const handleBoardSelect = (boardId: string) => {
    selectBoard(boardId);
  };

  const handleAllSwimlanesSelect = () => {
    if (!selectedBoard) return;
    // Deselect any individually-selected archived swimlanes first
    for (const sw of archivedSwimlanesForBoard) {
      if (selectedSwimlaneIds.has(sw.id)) {
        toggleSwimlane(selectedBoard.id, sw.id);
      }
    }
    selectBoard(selectedBoard.id);
  };

  const handleSwimlaneToggle = (swimlaneId: string) => {
    if (!selectedBoard) return;
    // When adding an active swimlane, deselect any individually-selected archived swimlanes.
    if (!isSwimlaneSelected(swimlaneId)) {
      for (const sw of archivedSwimlanesForBoard) {
        if (selectedSwimlaneIds.has(sw.id)) {
          toggleSwimlane(selectedBoard.id, sw.id);
        }
      }
    }
    toggleSwimlane(selectedBoard.id, swimlaneId);
  };

  const handleArchivedSwimlaneToggle = (swimlaneId: string) => {
    if (!selectedBoard) return;
    // When adding an archived swimlane, deselect all active swimlanes
    // (both individually-selected ones and the board-level "All" wildcard).
    if (!isSwimlaneSelected(swimlaneId)) {
      for (const sw of filteredSwimlanes) {
        if (selectedSwimlaneIds.has(sw.id)) {
          toggleSwimlane(selectedBoard.id, sw.id);
        }
      }
      // If "All" (boardId:*) was selected, selectBoard re-evaluates but toggleSwimlane
      // below will strip the wildcard automatically when adding an explicit id.
    }
    toggleSwimlane(selectedBoard.id, swimlaneId);
  };

  const handleAddBoard = () => {
    onAddBoard?.();
    closeDropdown();
  };

  const handleAddSwimlane = () => {
    onAddSwimlane?.();
    closeDropdown();
  };

  const handleShowArchivedBoards = () => {
    if (archivedBoards.length === 0) return;

    setShowArchivedBoards(true);
    closeMenu();

    if (!selectedBoard?.archived) {
      selectBoard(archivedBoards[0].id);
    }
  };

  const handleHideArchivedBoards = () => {
    setShowArchivedBoards(false);
    closeMenu();

    if (selectedBoard?.archived && boards[0]) {
      selectBoard(boards[0].id);
    }
  };

  const toggleMenu = (key: string, trigger?: HTMLElement | null) => {
    // Toggle off if same key clicked again
    if (openMenuKey === key) {
      setOpenMenuKey(null);
      setMenuPosition(null);
      return;
    }

    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      const estimatedMenuHeight = 112;
      const gap = 4;
      const menuWidth = 128; // min-w-32

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUp =
        spaceBelow < estimatedMenuHeight + gap && spaceAbove > spaceBelow;

      setMenuPosition({
        top: openUp ? rect.top - estimatedMenuHeight - gap : rect.bottom + gap,
        left: Math.max(0, rect.right - menuWidth),
      });
    }

    setOpenMenuKey(key);
  };

  const closeMenu = () => {
    setOpenMenuKey(null);
    setMenuPosition(null);
  };

  // Single helper that closes the dropdown AND resets the swimlane search state.
  // Used by every place that closes the dropdown (outside click, item selection, etc).
  const closeDropdown = () => {
    setDropdownOpen(false);
    setSwimSearchOpen(false);
    setSwimSearchQuery("");
  };

  useEffect(() => {
    if (dropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const headerHeight = 41;
      const bottomPadding = 16;
      const availableHeight =
        viewportHeight - rect.bottom - headerHeight - bottomPadding;
      const minDropdownHeight = 120;
      const maxDropdownHeight = Math.max(minDropdownHeight, availableHeight);

      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
      });
      setDropdownMaxHeight(maxDropdownHeight);
    }
  }, [dropdownOpen]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      const clickedTrigger = !!dropdownRef.current?.contains(target);
      const clickedPortal = !!portalRef.current?.contains(target);

      if (!clickedTrigger && !clickedPortal) {
        closeDropdown();
        setOpenMenuKey(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    function handleScroll() {
      if (dropdownOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const headerHeight = 41;
        const bottomPadding = 16;
        const availableHeight =
          viewportHeight - rect.bottom - headerHeight - bottomPadding;
        const minDropdownHeight = 120;
        const maxDropdownHeight = Math.max(minDropdownHeight, availableHeight);

        setDropdownPosition({
          top: rect.bottom,
          left: rect.left,
        });
        setDropdownMaxHeight(maxDropdownHeight);
      }
    }
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll, true);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll, true);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    function handleMenuClickOutside(event: MouseEvent) {
      if (openMenuKey) {
        const menuRef = menuRefs.current[openMenuKey];
        if (menuRef && !menuRef.contains(event.target as Node)) {
          setOpenMenuKey(null);
        }
      }
    }
    document.addEventListener("mousedown", handleMenuClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleMenuClickOutside);
    };
  }, [openMenuKey]);

  useEffect(() => {
    if (
      effectiveShowArchivedBoards &&
      archivedBoards.length === 0 &&
      boards[0]
    ) {
      selectBoard(boards[0].id);
    }
  }, [archivedBoards.length, boards, effectiveShowArchivedBoards, selectBoard]);

  const canShowBoardMenu = !!(onEditBoard || onDeleteBoard);
  const canShowSwimlaneMenu = !!(onEditSwimlane || onDeleteSwimlane);

  // Active boards excluding the selected board (for move target picker)
  const moveTargetBoards = useMemo(
    () =>
      boards.filter(
        (b) => !b.archived && b.id !== (movingSwimlane?.boardId ?? ""),
      ),
    [boards, movingSwimlane?.boardId],
  );

  const closeMenuAndDropdown = () => {
    closeMenu();
    closeDropdown();
  };

  const dropdownContent = (
    <CompactNavigationDropdown
      dropdownMaxHeight={dropdownMaxHeight}
      labels={labels}
      showArchivedBoards={effectiveShowArchivedBoards}
      archivedBoards={archivedBoards}
      boards={boards}
      visibleBoards={visibleBoards}
      selectedBoard={selectedBoard}
      totalSwimlaneCount={totalSwimlaneCount}
      openMenuKey={openMenuKey}
      menuPosition={menuPosition}
      menuRefs={menuRefs}
      filteredSwimlanes={filteredSwimlanes}
      visibleSwimlanes={visibleSwimlanes}
      archivedSwimlanesForBoard={archivedSwimlanesForBoard}
      isArchivedBoardSelected={isArchivedBoardSelected}
      archivedInlineVisible={archivedInlineVisible}
      showArchivedSwimlanes={showArchivedSwimlanes}
      swimlaneCounts={swimlaneCounts}
      isAllSwimlanesActive={isAllSwimlanesActive}
      isSwimlaneSelected={isSwimlaneSelected}
      canShowBoardMenu={canShowBoardMenu}
      canShowSwimlaneMenu={canShowSwimlaneMenu}
      showAllBoardsOption={showAllBoardsOption}
      isAllBoardsSelected={isAllSelected}
      onAllBoardsSelect={selectAll}
      onBoardSelect={handleBoardSelect}
      onAllSwimlanesSelect={handleAllSwimlanesSelect}
      onSwimlaneToggle={handleSwimlaneToggle}
      onArchivedSwimlaneToggle={handleArchivedSwimlaneToggle}
      onAddBoard={handleAddBoard}
      onAddSwimlane={handleAddSwimlane}
      onEditBoard={onEditBoard}
      onEditSwimlane={onEditSwimlane}
      onDeleteBoard={onDeleteBoard}
      onDeleteSwimlane={onDeleteSwimlane}
      onArchiveBoard={onArchiveBoard}
      onArchiveSwimlane={onArchiveSwimlane}
      onUnarchiveBoard={onUnarchiveBoard}
      onUnarchiveSwimlane={onUnarchiveSwimlane}
      onMoveSwimlane={(swimlane) => {
        setMovingSwimlane(swimlane);
        closeDropdown();
      }}
      onShowArchivedBoards={handleShowArchivedBoards}
      onHideArchivedBoards={handleHideArchivedBoards}
      onToggleMenu={toggleMenu}
      onCloseMenu={closeMenuAndDropdown}
      onToggleArchivedSwimlanes={() =>
        setShowArchivedSwimlanes((prev) => !prev)
      }
      onOpenReorderBoards={() => {
        closeDropdown();
        setReorderOpen(true);
      }}
      onOpenReorderSwimlanes={() => {
        closeDropdown();
        setReorderSwimlanesOpen(true);
      }}
      allSwimlanes={allSwimlanesList}
      boardsForSearch={allBoardsList}
      selectedSwimlaneIds={selectedSwimlaneIds}
      searchOpen={swimSearchOpen}
      onSearchOpenChange={setSwimSearchOpen}
      searchQuery={swimSearchQuery}
      onSearchQueryChange={setSwimSearchQuery}
      onSearchResultSelect={(swimlane) => {
        if (!swimlane.boardId) return;
        selectBoard(swimlane.boardId);
        toggleSwimlane(swimlane.boardId, swimlane.id);
        closeDropdown();
      }}
    />
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex min-h-14 min-w-0 w-full items-center justify-between gap-2 rounded-md px-4 py-3 text-left text-xs text-muted-foreground hover:bg-accent/40"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">
            {isAllSelected
              ? "All Boards"
              : (selectedBoard?.name ?? `Select ${labels.board}`)}
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
            {isAllSelected ? null : selectedSwimlanesList.length === 0 ? (
              <span className="inline-flex items-center rounded-md border border-border bg-muted px-1 py-0 text-[9px] font-medium text-muted-foreground">
                All {labels.swimlanePlural}
              </span>
            ) : (
              <>
                {visibleSelectedSwimlaneBadges.map((sw) => (
                  <span
                    key={sw.id}
                    className="inline-flex max-w-full items-center gap-1 rounded-md border px-1 py-0 text-[9px] font-medium"
                    style={{
                      backgroundColor: sw.color ?? "#6B7280",
                      borderColor: sw.color ?? "#6B7280",
                      color: "#FFFFFF",
                      opacity: 0.82,
                    }}
                    title={sw.name}
                  >
                    <span className="truncate">{sw.name}</span>
                  </span>
                ))}
                {hiddenSelectedSwimlaneCount > 0 && (
                  <span className="inline-flex items-center rounded-md border border-border bg-muted px-1 py-0 text-[9px] font-medium text-muted-foreground opacity-80">
                    +{hiddenSelectedSwimlaneCount}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform text-muted-foreground",
            dropdownOpen && "rotate-180",
          )}
        />
      </button>

      {/* Swimlane list — visible only on mobile */}
      {!isAllSelected && selectedBoard && visibleSwimlanes.length > 0 && (
        <div className="md:hidden flex flex-col gap-0.5 px-2 pb-2">
          <button
            type="button"
            onClick={handleAllSwimlanesSelect}
            className={cn(
              "flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-accent/40",
              isAllSwimlanesActive
                ? "bg-accent/60 font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
            All {labels.swimlanePlural}
          </button>
          {visibleSwimlanes.map((sw) => (
            <button
              key={sw.id}
              type="button"
              onClick={() => {
                if (sw.archived) {
                  handleArchivedSwimlaneToggle(sw.id);
                } else {
                  handleSwimlaneToggle(sw.id);
                }
              }}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-accent/40",
                isSwimlaneSelected(sw.id)
                  ? "bg-accent/60 font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: sw.color ?? "#6B7280" }}
              />
              <span className="truncate">{sw.name}</span>
              {swimlaneCounts?.[sw.id] !== undefined && (
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                  {swimlaneCounts[sw.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {dropdownOpen &&
        createPortal(
          <div
            ref={portalRef}
            style={{
              position: "fixed",
              top: dropdownPosition.top + 4,
              left: dropdownPosition.left,
              zIndex: 9999,
              pointerEvents: "auto",
            }}
          >
            {dropdownContent}
          </div>,
          document.body,
        )}

      <ReorderBoardsModal open={reorderOpen} onOpenChange={setReorderOpen} />
      <ReorderSwimlanesModal
        open={reorderSwimlanesOpen}
        onOpenChange={setReorderSwimlanesOpen}
        boardId={selectedBoard?.id}
      />
      <MoveSwimlaneModal
        open={!!movingSwimlane}
        onOpenChange={(open) => {
          if (!open) setMovingSwimlane(null);
        }}
        swimlane={movingSwimlane}
        targetBoards={moveTargetBoards}
      />
    </div>
  );
}
