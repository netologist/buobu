import type { MutableRefObject } from "react";

import type { Board, Swimlane } from "@/lib/types";
import { CompactNavigationBoardsPane } from "@/components/layout/CompactNavigationBoardsPane";
import { CompactNavigationSwimlanesPane } from "@/components/layout/CompactNavigationSwimlanesPane";

type CompactNavigationLabels = {
  board: string;
  boardPlural: string;
  swimlane: string;
  swimlanePlural: string;
};

type CompactNavigationDropdownProps = {
  dropdownMaxHeight: number | null;
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
  filteredSwimlanes: Swimlane[];
  visibleSwimlanes: Swimlane[];
  archivedSwimlanesForBoard: Swimlane[];
  isArchivedBoardSelected: boolean;
  archivedInlineVisible: boolean;
  showArchivedSwimlanes: boolean;
  swimlaneCounts?: Record<string, number>;
  isAllSwimlanesActive: boolean;
  isSwimlaneSelected: (swimlaneId: string) => boolean;
  canShowBoardMenu: boolean;
  canShowSwimlaneMenu: boolean;
  showAllBoardsOption?: boolean;
  isAllBoardsSelected?: boolean;
  onAllBoardsSelect?: () => void;
  onBoardSelect: (boardId: string) => void;
  onAllSwimlanesSelect: () => void;
  onSwimlaneToggle: (swimlaneId: string) => void;
  onArchivedSwimlaneToggle: (swimlaneId: string) => void;
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
  onMoveSwimlane?: (swimlane: Swimlane) => void;
  onShowArchivedBoards: () => void;
  onHideArchivedBoards: () => void;
  onToggleMenu: (key: string, trigger?: HTMLElement | null) => void;
  onCloseMenu: () => void;
  onToggleArchivedSwimlanes: () => void;
  onOpenReorderBoards: () => void;
  onOpenReorderSwimlanes: () => void;
  // Swimlane search (Task 5)
  allSwimlanes: Swimlane[];
  boardsForSearch: Board[];
  selectedSwimlaneIds: Set<string>;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSearchResultSelect?: (swimlane: Swimlane) => void;
};

export function CompactNavigationDropdown({
  dropdownMaxHeight,
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
  filteredSwimlanes,
  visibleSwimlanes,
  archivedSwimlanesForBoard,
  isArchivedBoardSelected,
  archivedInlineVisible,
  showArchivedSwimlanes,
  swimlaneCounts,
  isAllSwimlanesActive,
  isSwimlaneSelected,
  canShowBoardMenu,
  canShowSwimlaneMenu,
  showAllBoardsOption,
  isAllBoardsSelected,
  onAllBoardsSelect,
  onBoardSelect,
  onAllSwimlanesSelect,
  onSwimlaneToggle,
  onArchivedSwimlaneToggle,
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
  onMoveSwimlane,
  onShowArchivedBoards,
  onHideArchivedBoards,
  onToggleMenu,
  onCloseMenu,
  onToggleArchivedSwimlanes,
  onOpenReorderBoards,
  onOpenReorderSwimlanes,
  allSwimlanes,
  boardsForSearch,
  selectedSwimlaneIds,
  searchOpen,
  onSearchOpenChange,
  searchQuery,
  onSearchQueryChange,
  onSearchResultSelect,
}: CompactNavigationDropdownProps) {
  return (
    <div
      className="flex w-125 max-w-[calc(100vw-1rem)] overflow-hidden rounded-md border bg-popover shadow-lg"
      style={dropdownMaxHeight ? { maxHeight: dropdownMaxHeight } : undefined}
    >
      <CompactNavigationBoardsPane
        labels={labels}
        showArchivedBoards={showArchivedBoards}
        archivedBoards={archivedBoards}
        boards={boards}
        visibleBoards={visibleBoards}
        selectedBoard={selectedBoard}
        totalSwimlaneCount={totalSwimlaneCount}
        openMenuKey={openMenuKey}
        menuPosition={menuPosition}
        menuRefs={menuRefs}
        canShowBoardMenu={canShowBoardMenu}
        onBoardSelect={onBoardSelect}
        showAllBoardsOption={showAllBoardsOption}
        isAllBoardsSelected={isAllBoardsSelected}
        onAllBoardsSelect={onAllBoardsSelect}
        onAddBoard={onAddBoard}
        onEditBoard={onEditBoard}
        onDeleteBoard={onDeleteBoard}
        onArchiveBoard={onArchiveBoard}
        onUnarchiveBoard={onUnarchiveBoard}
        onShowArchivedBoards={onShowArchivedBoards}
        onHideArchivedBoards={onHideArchivedBoards}
        onToggleMenu={onToggleMenu}
        onCloseMenu={onCloseMenu}
        onOpenReorderBoards={onOpenReorderBoards}
      />

      {!isAllBoardsSelected && (
        <CompactNavigationSwimlanesPane
          labels={labels}
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
          canShowSwimlaneMenu={canShowSwimlaneMenu}
          onAllSwimlanesSelect={onAllSwimlanesSelect}
          onSwimlaneToggle={onSwimlaneToggle}
          onArchivedSwimlaneToggle={onArchivedSwimlaneToggle}
          onAddSwimlane={onAddSwimlane}
          onEditSwimlane={onEditSwimlane}
          onDeleteSwimlane={onDeleteSwimlane}
          onArchiveSwimlane={onArchiveSwimlane}
          onUnarchiveSwimlane={onUnarchiveSwimlane}
          onMoveSwimlane={onMoveSwimlane}
          onToggleMenu={onToggleMenu}
          onCloseMenu={onCloseMenu}
          onToggleArchivedSwimlanes={onToggleArchivedSwimlanes}
          onOpenReorderSwimlanes={onOpenReorderSwimlanes}
          allSwimlanes={allSwimlanes}
          selectedSwimlaneIds={selectedSwimlaneIds}
          searchOpen={searchOpen}
          onSearchOpenChange={onSearchOpenChange}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          swimlaneBoardMap={Object.fromEntries(
            boardsForSearch.map((b) => [b.id, b]),
          )}
          onSearchResultSelect={onSearchResultSelect}
        />
      )}
    </div>
  );
}
