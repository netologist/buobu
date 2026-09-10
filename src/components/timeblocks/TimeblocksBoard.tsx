"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Timeblock, Swimlane } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useAllTimeblocks, useTimeblocksSubscription, timeblockActions } from "@/stores/hooks/use-timeblocks";
import { useHabitsSubscription } from "@/stores/hooks/use-habits";
import { useRoutinesSubscription } from "@/stores/hooks/use-routines";
import { TimeblocksSidebar } from "./TimeblocksSidebar";
import { TimeblocksWeeklyCalendar } from "./TimeblocksWeeklyCalendar";
import { TimeblockEditDialog } from "./TimeblockEditDialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { MobileFab } from "@/components/layout/MobileFab";
import { useBoardBase } from "@/hooks/useBoardBase";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSwimlaneSelectionStore } from "@/stores/swimlane-selection-store";

function getWeekStartDate(d: Date, weekStartDay: number): Date {
  const day = d.getDay();
  const start = new Date(d);
  const diff = (day - weekStartDay + 7) % 7;
  start.setDate(d.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = weekStart.toLocaleDateString("en-US", opts);
  const endStr = end.toLocaleDateString("en-US", {
    ...opts,
    ...(end.getFullYear() !== weekStart.getFullYear() ? { year: "numeric" } : {}),
  });
  const year = end.getFullYear();
  return `${startStr} – ${endStr}, ${year}`;
}

export function TimeblocksBoard() {
  const searchParams = useSearchParams();
  const selectBoard = useSwimlaneSelectionStore((s) => s.selectBoard);
  const toggleSwimlane = useSwimlaneSelectionStore((s) => s.toggleSwimlane);
  const selectedBoardIdParam = searchParams.get("boardId");
  const selectedSwimlaneIdParam =
    searchParams.get("swimlaneId") ?? searchParams.get("swimlane");
  const selectedTimeblockIdParam = searchParams.get("timeblockId");

  useTimeblocksSubscription();
  useHabitsSubscription();
  useRoutinesSubscription();

  const allTimeblocks = useAllTimeblocks();

  const {
    boards,
    swimlanes,
    activeBoards,
    activeSwimlanes,
    board,
    isAllSelected,
    filteredItems: selectionFilteredTimeblocks,
    putSwimlane: storePutSwimlane,
    deleteSwimlane: storeDeleteSwimlane,
    isArchivedSelectionMode,
    archivedSwimlaneIdSet,
  } = useBoardBase<Timeblock>({ items: allTimeblocks });

  const filteredTimeblocks = useMemo(() => {
    if (isArchivedSelectionMode) {
      return selectionFilteredTimeblocks.filter((tb) => tb.archived === true);
    }
    return selectionFilteredTimeblocks.filter((tb) => !tb.archived);
  }, [selectionFilteredTimeblocks, isArchivedSelectionMode]);

  const effectiveWeekStartDay = useMemo(() => {
    if (isAllSelected) return 1;
    return board?.weekStart ?? 1;
  }, [board?.weekStart, isAllSelected]);

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStartDate(new Date(), 1));
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"week" | "day">("week");

  // Default to day view on mobile once hydrated
  useEffect(() => {
    if (isMobile) setViewMode("day");
  }, [isMobile]);

  const displayWeekStart = useMemo(
    () => getWeekStartDate(weekStart, effectiveWeekStartDay),
    [weekStart, effectiveWeekStartDay],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTimeblock, setEditingTimeblock] = useState<Timeblock | null>(null);
  const [defaultBoardId, setDefaultBoardId] = useState<string | null>(null);
  const [defaultSwimlaneId, setDefaultSwimlaneId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedBoardIdParam) {
      selectBoard(selectedBoardIdParam);
    }
  }, [selectBoard, selectedBoardIdParam]);

  useEffect(() => {
    if (selectedBoardIdParam && selectedSwimlaneIdParam) {
      toggleSwimlane(selectedBoardIdParam, selectedSwimlaneIdParam);
    }
  }, [selectedBoardIdParam, selectedSwimlaneIdParam, toggleSwimlane]);

  useEffect(() => {
    if (!selectedTimeblockIdParam) return;
    const target = allTimeblocks.find((tb) => tb.id === selectedTimeblockIdParam);
    if (target) {
      setSelectedId(target.id);
    }
  }, [allTimeblocks, selectedTimeblockIdParam]);

  const prevWeek = () =>
    setWeekStart((prev: Date) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });

  const nextWeek = () =>
    setWeekStart((prev: Date) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });

  const goToday = () => setWeekStart(getWeekStartDate(new Date(), effectiveWeekStartDay));

  const prevDay = () => setSelectedDay((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; });
  const nextDay = () => setSelectedDay((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; });
  const goTodayDay = () => setSelectedDay(new Date());

  const displayDays = viewMode === "day" ? [selectedDay] : undefined;

  const openNew = useCallback((boardId?: string, swimlaneId?: string) => {
    setEditingTimeblock(null);
    setDefaultBoardId(boardId ?? null);
    setDefaultSwimlaneId(swimlaneId ?? null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((tb: Timeblock) => {
    setEditingTimeblock(tb);
    setDefaultBoardId(null);
    setDefaultSwimlaneId(null);
    setDialogOpen(true);
  }, []);

  async function handleSave(data: Partial<Timeblock>) {
    await timeblockActions.put(data as Timeblock);
  }

  const handleAddSwimlane = useCallback(async (boardId: string, data: Partial<Swimlane>) => {
    await storePutSwimlane({ ...data, boardId });
  }, [storePutSwimlane]);

  const handleEditSwimlane = useCallback(async (swimlane: Swimlane) => {
    await storePutSwimlane(swimlane);
  }, [storePutSwimlane]);

  const handleDeleteSwimlane = useCallback(async (swimlaneId: string) => {
    await storeDeleteSwimlane(swimlaneId);
  }, [storeDeleteSwimlane]);

  // Count timeblocks per swimlane for sidebar badges (archive-aware)
  const countsBySwimlane = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tb of allTimeblocks) {
      const inArchivedSwimlane = archivedSwimlaneIdSet.has(tb.swimlaneId);
      if (inArchivedSwimlane ? tb.archived === true : (isArchivedSelectionMode ? tb.archived === true : !tb.archived)) {
        counts[tb.swimlaneId] = (counts[tb.swimlaneId] ?? 0) + 1;
      }
    }
    return counts;
  }, [allTimeblocks, isArchivedSelectionMode, archivedSwimlaneIdSet]);

  const middlePanel = (
    <TimeblocksSidebar
      filteredTimeblocks={filteredTimeblocks}
      selectedTimeblockId={selectedId}
      onSelect={setSelectedId}
      onNew={openNew}
      onEdit={openEdit}
      boards={boards}
      swimlanes={swimlanes}
    />
  );

  const rightPanel = (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Navigator */}
      <div className="flex items-center gap-1 border-b px-3 py-2 shrink-0 flex-wrap">
        {/* Day view nav — mobile only */}
        {viewMode === "day" && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={goTodayDay}>
              Today
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={prevDay}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={nextDay}>
              <ChevronRight className="size-4" />
            </Button>
            <span className="flex-1 text-sm font-medium">
              {selectedDay.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </>
        )}
        {/* Week view nav */}
        {viewMode === "week" && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={goToday}>
              Today
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={prevWeek}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={nextWeek}>
              <ChevronRight className="size-4" />
            </Button>
            <span className="flex-1 text-sm font-medium">{formatWeekRange(displayWeekStart)}</span>
          </>
        )}
        {/* View mode toggle */}
        <div className="flex rounded-md border overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("day")}
            className={`px-2 py-1 text-[11px] font-medium transition-colors ${viewMode === "day" ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"}`}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`px-2 py-1 text-[11px] font-medium transition-colors ${viewMode === "week" ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"}`}
          >
            Week
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <TimeblocksWeeklyCalendar
          timeblocks={filteredTimeblocks}
          weekStart={displayWeekStart}
          selectedTimeblockId={selectedId}
          onSelect={setSelectedId}
          onEdit={openEdit}
          displayDays={displayDays}
        />
      </div>
    </div>
  );

  return (
    <>
      <MobileFab
        aria-label="Add new time block"
        icon={<span className="text-2xl leading-none" aria-hidden>+</span>}
        onClick={() => openNew()}
      />

      <AppLayout
        sidebarConfig={{
          boards: activeBoards,
          swimlanes: activeSwimlanes,
          allBoards: boards,
          allSwimlanes: swimlanes,
          swimlaneCounts: countsBySwimlane,
          allItemVisible: true,
          allItemLabel: "Time Blocks",
          allItemCount: filteredTimeblocks.length,
          showAllBoardsOption: true,
          isArchivedSelectionMode,
          onAddSwimlane: handleAddSwimlane,
          onEditSwimlane: handleEditSwimlane,
          onDeleteSwimlane: handleDeleteSwimlane,
        }}
        middlePanel={middlePanel}
        rightPanel={rightPanel}
        middlePanelClassName="w-72 overflow-hidden"
      />

      <TimeblockEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        timeblock={editingTimeblock}
        defaultBoardId={defaultBoardId}
        defaultSwimlaneId={defaultSwimlaneId}
        weekStartDay={effectiveWeekStartDay}
        onSave={handleSave}
      />
    </>
  );
}
