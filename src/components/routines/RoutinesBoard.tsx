"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Repeat, CalendarDays, TrendingDown, TrendingUp } from "lucide-react";
import type { Routine, Swimlane } from "@/lib/types";
import { getTodayDateKey } from "@/lib/date";
import { formatAmountWithSymbol } from "@/lib/formatters/amountFormatter";
import { useBoardBase } from "@/hooks/useBoardBase";
import { AppLayout, type SidebarConfig } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDbStore } from "@/stores/db-store";
import { filterItems, useSwimlaneSelectionStore } from "@/stores/swimlane-selection-store";
import { SwimlanePickerModal } from "@/components/ui/swimlane-picker-modal";
import {
  useRoutinesSubscription,
  useRoutineLogsSubscription,
  useActiveRoutines,
  routineActions,
} from "@/stores/hooks/use-routines";
import { useTimeblocksSubscription } from "@/stores/hooks/use-timeblocks";
import { RoutineDialog } from "./RoutineDialog";
import { RoutineDetailView } from "./RoutineDetailView";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { useUpgradeGuard } from "@/hooks/useUpgradeGuard";
import { UpgradeDialog } from "@/components/subscriptions/UpgradeDialog";
import { useEntitlements } from "@/stores/entitlements-store";
import { PLAN_LIMITS } from "@/lib/subscriptions";

const TYPE_BADGE: Record<Routine["type"], string> = {
  task: "border-blue-500/40 text-blue-700 dark:text-blue-300",
  event: "border-violet-500/40 text-violet-700 dark:text-violet-300",
  payment: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
};

function recurrenceSummary(r: Routine["recurrence"]): string {
  const { type, interval, daysOfWeek, dayOfMonth } = r;
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  switch (type) {
    case "daily":
      return interval === 1 ? "Every day" : `Every ${interval} days`;
    case "weekly": {
      const days =
        daysOfWeek && daysOfWeek.length > 0
          ? daysOfWeek.map((d) => DAY_NAMES[d]).join(", ")
          : "week";
      return interval === 1 ? `Every ${days}` : `Every ${interval} weeks on ${days}`;
    }
    case "monthly":
      return dayOfMonth ? `Monthly on day ${dayOfMonth}` : `Every ${interval} month(s)`;
    case "yearly":
      return "Yearly";
    case "custom":
      return `Every ${interval} days`;
    default:
      return "Recurring";
  }
}

export function RoutinesBoard() {
  const db = useDbStore((s) => s.db);
  const selectBoard = useSwimlaneSelectionStore((s) => s.selectBoard);
  const selectionsKey = useSwimlaneSelectionStore((s) => s.selections.join(','));
  const searchParams = useSearchParams();
  useRoutinesSubscription();
  useRoutineLogsSubscription();
  useTimeblocksSubscription();

  const activeRoutines = useActiveRoutines();
  const { guard, blocked, dismissDialog } = useUpgradeGuard();
  const { isPlus } = useEntitlements();
  const {
    boards,
    swimlanes,
    activeBoards,
    activeSwimlanes,
    filteredSwimlanes,
    labels,
    selections,
    hasSelections,
    isAllSelected,
    selectedSwimlaneIds,
    isArchivedSelectionMode,
    primaryBoardId,
    putSwimlane: storePutSwimlane,
    deleteSwimlane: storeDeleteSwimlane,
    loadBoards,
  } = useBoardBase<Routine>();

  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const prevSelectionsKey = useRef(selectionsKey);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSwimlanePicker, setShowSwimlanePicker] = useState(false);
  const [createBoardId, setCreateBoardId] = useState<string | null>(null);
  const [createSwimlaneId, setCreateSwimlaneId] = useState<string | null>(null);
  const selectedRoutineIdParam = searchParams.get("routineId");
  const selectedBoardIdParam = searchParams.get("boardId");

  useEffect(() => {
    if (selectedBoardIdParam) {
      selectBoard(selectedBoardIdParam);
    }
  }, [selectBoard, selectedBoardIdParam]);

  useEffect(() => {
    if (prevSelectionsKey.current === selectionsKey) return;
    prevSelectionsKey.current = selectionsKey;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedRoutineId(null);
  }, [selectionsKey]);

  const filteredBySelection = useMemo(
    () => filterItems(activeRoutines, selections),
    [activeRoutines, selections],
  );

  const visibleRoutines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? filteredBySelection.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.type.toLowerCase().includes(q) ||
            (r.description ?? "").toLowerCase().includes(q),
        )
      : filteredBySelection;

    return [...list].sort((a, b) => {
      const aDate = a.nextDueDate ?? "";
      const bDate = b.nextDueDate ?? "";
      if (aDate && bDate) return aDate.localeCompare(bDate);
      if (aDate) return -1;
      if (bDate) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredBySelection, searchQuery]);

  const selectedRoutine = useMemo(
    () => activeRoutines.find((r) => r.id === selectedRoutineId) ?? null,
    [activeRoutines, selectedRoutineId],
  );

  useEffect(() => {
    if (!selectedRoutineIdParam) return;
    const target = activeRoutines.find((r) => r.id === selectedRoutineIdParam);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (target) setSelectedRoutineId(target.id);
  }, [selectedRoutineIdParam, activeRoutines]);

  // Sync selected routine to URL query param (?routineId=...).
  const hasUrlSyncHydrated = useRef(false);
  useEffect(() => {
    if (!hasUrlSyncHydrated.current) {
      hasUrlSyncHydrated.current = true;
      return;
    }
    const params = new URLSearchParams(globalThis.location.search);
    if (selectedRoutineId) {
      params.set("routineId", selectedRoutineId);
    } else {
      params.delete("routineId");
    }
    const newSearch = params.toString();
    globalThis.history.replaceState(
      null,
      "",
      newSearch ? `?${newSearch}` : globalThis.location.pathname
    );
  }, [selectedRoutineId]);

  const countsBySwimlane = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of activeRoutines) {
      counts[r.swimlaneId] = (counts[r.swimlaneId] || 0) + 1;
    }
    return counts;
  }, [activeRoutines]);

  const selectedBoardRoutinesCount = useMemo(() => {
    const boardId = primaryBoardId ?? boards[0]?.id;
    if (!boardId) return activeRoutines.length;
    return activeRoutines.filter((r) => r.boardId === boardId).length;
  }, [activeRoutines, primaryBoardId, boards]);


  const sidebarLabel = useMemo(() => {
    if (!hasSelections || isAllSelected) return "All Routines";
    if (selectedSwimlaneIds.size === 1) {
      const sw = swimlanes.find((s) => selectedSwimlaneIds.has(s.id));
      return sw?.name ?? "Routines";
    }
    return `${selectedSwimlaneIds.size} ${labels.swimlanePlural}`;
  }, [hasSelections, isAllSelected, selectedSwimlaneIds, swimlanes, labels]);

  async function handleArchive(routineId: string) {
    await routineActions.archive(routineId);
    if (selectedRoutineId === routineId) setSelectedRoutineId(null);
  }

  async function handleDelete(routineId: string) {
    await routineActions.delete(routineId);
    if (selectedRoutineId === routineId) setSelectedRoutineId(null);
  }

  async function handleSave(data: Partial<Routine>) {
    const isNew = !data.id;
    if (isNew && !guard('routines', activeRoutines.length)) return;
    await routineActions.put({
      ...data,
      ...(isNew ? { nextDueDate: getTodayDateKey() } : {}),
    });
  }

  function openCreateRoutineWithSwimlane(swimlaneId: string) {
    const swimlane = swimlanes.find((lane) => lane.id === swimlaneId && !lane.archived);
    setCreateBoardId(swimlane?.boardId ?? null);
    setCreateSwimlaneId(swimlane?.id ?? null);
    setEditingRoutine(null);
    setDialogOpen(true);
  }


  const handleAddSwimlane = useCallback(
    async (boardId: string, data: Partial<Swimlane>) => {
      await storePutSwimlane({ ...data, boardId });
    },
    [storePutSwimlane],
  );

  const handleEditSwimlane = useCallback(
    async (swimlane: Swimlane) => {
      await storePutSwimlane(swimlane);
    },
    [storePutSwimlane],
  );

  const handleDeleteSwimlane = useCallback(
    async (swimlaneId: string) => {
      await storeDeleteSwimlane(swimlaneId);
    },
    [storeDeleteSwimlane],
  );

  const routinesBySwimlane = useMemo(() => {
    const map: Record<string, (typeof visibleRoutines)> = {};
    for (const r of visibleRoutines) {
      if (!map[r.swimlaneId]) map[r.swimlaneId] = [];
      map[r.swimlaneId].push(r);
    }
    return map;
  }, [visibleRoutines]);

  const sidebarConfig: SidebarConfig = {
    boards: activeBoards,
    swimlanes: activeSwimlanes,
    allBoards: boards,
    allSwimlanes: swimlanes,
    swimlaneCounts: countsBySwimlane,
    allItemVisible: true,
    allItemLabel: "Routines",
    allItemCount: selectedBoardRoutinesCount,
    isArchivedSelectionMode,
    onAddSwimlane: handleAddSwimlane,
    onEditSwimlane: handleEditSwimlane,
    onDeleteSwimlane: handleDeleteSwimlane,
    onBoardDeleted: loadBoards,
    db,
  };

  const today = getTodayDateKey();

  const middlePanel = (
    <>
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-sm font-semibold">{sidebarLabel}</span>
        {!isPlus && isAllSelected && (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {activeRoutines.length} / {PLAN_LIMITS.routines}
          </span>
        )}
      </div>
      <div className="border-b pl-3 px-1 py-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search…"
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
        <div className="flex flex-col gap-3">
          {filteredSwimlanes.map((lane) => {
            const laneRoutines = routinesBySwimlane[lane.id] ?? [];
            return (
              <div key={lane.id} className="rounded-xl border bg-card overflow-hidden">
                <div
                  className="flex items-center gap-2 px-3 py-2 border-b"
                  style={{ borderLeftWidth: 3, borderLeftColor: lane.color ?? "#6B7280" }}
                >
                  <span className="flex-1 text-sm font-semibold truncate">{lane.name}</span>
                  {lane.label && (
                    <Badge variant="secondary" className="text-[9px] shrink-0">{lane.label}</Badge>
                  )}
                </div>
                <div className="divide-y">
                  {laneRoutines.map((routine) => {
                    const isActive = selectedRoutineId === routine.id;
                    const isDueToday = routine.nextDueDate === today;
                    const isOverdue = routine.nextDueDate != null && routine.nextDueDate < today;
                    let dueTextClass = "text-muted-foreground";
                    if (isOverdue) {
                      dueTextClass = "text-red-600 dark:text-red-400";
                    } else if (isDueToday) {
                      dueTextClass = "text-amber-600 dark:text-amber-400";
                    }
                    return (
                      <button
                        key={routine.id}
                        type="button"
                        onClick={() => setSelectedRoutineId(routine.id)}
                        className={`flex w-full flex-col gap-0.5 border-l-[3px] px-3 py-2 text-left transition-colors ${
                          isActive ? "bg-primary/10" : "hover:bg-muted/50"
                        }`}
                        style={{ borderLeftColor: lane.color ?? "#6B7280" }}
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="flex-1 truncate text-sm font-medium leading-tight">
                            {routine.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={`shrink-0 rounded-full px-1.5 py-0 text-[9px] ${TYPE_BADGE[routine.type]}`}
                          >
                            {routine.type}
                          </Badge>
                        </div>
                        {routine.description && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {routine.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Repeat className="h-2.5 w-2.5" />
                            {recurrenceSummary(routine.recurrence)}
                          </span>
                          {routine.nextDueDate && (
                            <span
                              className={`flex items-center gap-1 text-[10px] ${dueTextClass}`}
                            >
                              <CalendarDays className="h-2.5 w-2.5" />
                              {routine.nextDueDate}
                            </span>
                          )}
                          {routine.type === "payment" && routine.paymentAmount != null && (
                            <span
                              className={`flex items-center gap-1 text-[10px] font-medium ${
                                routine.paymentType === "income"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {routine.paymentType === "income" ? (
                                <TrendingUp className="h-2.5 w-2.5" />
                              ) : (
                                <TrendingDown className="h-2.5 w-2.5" />
                              )}
                              {routine.paymentType === "expense" ? "-" : ""}
                              {formatAmountWithSymbol(routine.paymentAmount, lane.currency ?? DEFAULT_CURRENCY)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    onClick={() => openCreateRoutineWithSwimlane(lane.id)}
                  >
                    + Add routine
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  const selectedRoutineSwimlane = selectedRoutine
    ? swimlanes.find((s) => s.id === selectedRoutine.swimlaneId)
    : undefined;
  const selectedRoutineBoard = selectedRoutine
    ? boards.find((b) => b.id === selectedRoutine.boardId)
    : undefined;

  const rightPanel = selectedRoutine ? (
    <RoutineDetailView
      routine={selectedRoutine}
      boardName={selectedRoutineBoard?.name}
      swimlaneName={selectedRoutineSwimlane?.name}
      swimlaneColor={selectedRoutineSwimlane?.color}
      onEdit={(routine) => {
        setEditingRoutine(routine);
        setDialogOpen(true);
      }}
      onArchive={handleArchive}
      onDelete={handleDelete}
    />
  ) : (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
      Select a routine to see its details.
    </div>
  );

  return (
    <>
      <SwimlanePickerModal
        open={showSwimlanePicker}
        onOpenChange={setShowSwimlanePicker}
        swimlanes={filteredSwimlanes}
        selectedSwimlaneIds={selectedSwimlaneIds}
        onSelect={openCreateRoutineWithSwimlane}
        title="Create Routine"
      />
      <AppLayout
        sidebarConfig={sidebarConfig}
        middlePanel={middlePanel}
        rightPanel={rightPanel}
      />
      <RoutineDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingRoutine(null);
            setCreateBoardId(null);
            setCreateSwimlaneId(null);
          }
        }}
        routine={editingRoutine}
        defaultBoardId={createBoardId}
        defaultSwimlaneId={createSwimlaneId}
        onSave={handleSave}
      />
      {blocked && (
        <UpgradeDialog
          open
          onOpenChange={(open) => !open && dismissDialog()}
          feature={blocked.feature}
          current={blocked.current}
          limit={blocked.limit}
        />
      )}
    </>
  );
}
