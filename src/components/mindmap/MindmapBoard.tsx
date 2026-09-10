"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Mindmap, Swimlane } from "@/lib/types";
import { getAllMindmaps, putMindmap, deleteMindmap } from "@/lib/db";
import { MindmapEditor } from "@/components/mindmap/MindmapEditor";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { SwimlanePickerModal } from "@/components/ui/swimlane-picker-modal";
import { MindmapListItem } from "@/components/mindmap/MindmapListItem";
import { useBoards } from "@/stores/hooks/use-boards";
import { useMindmaps, useMindmapsSubscription } from "@/stores";
import { filterItems, useSwimlaneSelectionStore } from "@/stores/swimlane-selection-store";
import { useDbStore } from "@/stores/db-store";
import { useUpgradeGuard } from "@/hooks/useUpgradeGuard";
import { UpgradeDialog } from "@/components/subscriptions/UpgradeDialog";
import { useEntitlements } from "@/stores/entitlements-store";
import { PLAN_LIMITS } from "@/lib/subscriptions";
import { useBoardSwimlaneUrlSync } from "@/hooks/useBoardSwimlaneUrlSync";

export function MindmapBoard() {
  const db = useDbStore((s) => s.db);
  const selectionsKey = useSwimlaneSelectionStore((s) => s.selections.join(','));
  const searchParams = useSearchParams();

  // Sync board/swimlane selection to/from URL (?board=&swimlanes=).
  useBoardSwimlaneUrlSync();
  useMindmapsSubscription();
  const {
    boards,
    swimlanes,
    activeBoards,
    activeSwimlanes,
    filteredSwimlanes,
    labels,
    selections,
    hasSelections,
    selectedSwimlaneIds,
    isAllSelected,
    isArchivedSelectionMode,
    putSwimlane: storePutSwimlane,
    deleteSwimlane: storeDeleteSwimlane,
  } = useBoards();
  const subscribedMindmaps = useMindmaps();
  const [allMindmaps, setAllMindmaps] = useState<Mindmap[]>([]);
  const { guard, blocked, dismissDialog } = useUpgradeGuard();
  const { isPlus } = useEntitlements();
  const [selectedMindmap, setSelectedMindmap] = useState<Mindmap | null>(null);
  const prevSelectionsKey = useRef(selectionsKey);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSwimlanePicker, setShowSwimlanePicker] = useState(false);
  const selectedMindmapIdParam = searchParams.get("mindmapId");

  useEffect(() => {
    setAllMindmaps(subscribedMindmaps);
  }, [subscribedMindmaps]);

  useEffect(() => {
    if (prevSelectionsKey.current === selectionsKey) return;
    prevSelectionsKey.current = selectionsKey;
    setSelectedMindmap(null);
    setIsCreatingNew(false);
  }, [selectionsKey]);

  useEffect(() => {
    if (selectedMindmap?.id) {
      const fresh = allMindmaps.find((m) => m.id === selectedMindmap.id);
      if (fresh) setSelectedMindmap(fresh);
    }
  }, [allMindmaps, selectedMindmap?.id]);

  useEffect(() => {
    if (!selectedMindmapIdParam) return;
    const target = allMindmaps.find((m) => m.id === selectedMindmapIdParam) ?? subscribedMindmaps.find((m) => m.id === selectedMindmapIdParam);
    if (target) {
      setSelectedMindmap(target);
      setIsCreatingNew(false);
    }
  }, [selectedMindmapIdParam, allMindmaps, subscribedMindmaps]);

  // Sync selected mindmap to URL query param (?mindmapId=...).
  const hasUrlSyncHydrated = useRef(false);
  useEffect(() => {
    if (!hasUrlSyncHydrated.current) {
      hasUrlSyncHydrated.current = true;
      return;
    }
    const params = new URLSearchParams(globalThis.location.search);
    if (selectedMindmap) {
      params.set("mindmapId", selectedMindmap.id);
    } else {
      params.delete("mindmapId");
    }
    const newSearch = params.toString();
    globalThis.history.replaceState(
      null,
      "",
      newSearch ? `?${newSearch}` : globalThis.location.pathname
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMindmap?.id]);

  const filteredBySelection = useMemo(() => filterItems(allMindmaps, selections), [allMindmaps, selections]);

  const visibleMindmaps = useMemo(() => {
    let items = isArchivedSelectionMode
      ? filteredBySelection.filter((m) => m.archived === true)
      : filteredBySelection.filter((m) => !m.archived);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((m) => m.title.toLowerCase().includes(q));
    }

    return [...items].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [filteredBySelection, searchQuery, isArchivedSelectionMode]);

  const archivedSwimlaneIdSet = useMemo(
    () => new Set(swimlanes.filter((s) => s.archived).map((s) => s.id)),
    [swimlanes]
  );
  const countsBySwimlane = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of allMindmaps) {
      const inArchivedSwimlane = archivedSwimlaneIdSet.has(m.swimlaneId);
      const shouldCount = m.archived === (inArchivedSwimlane || isArchivedSelectionMode);
      if (shouldCount) {
        map[m.swimlaneId] = (map[m.swimlaneId] || 0) + 1;
      }
    }
    return map;
  }, [allMindmaps, isArchivedSelectionMode, archivedSwimlaneIdSet]);

  const handleSaveMindmap = useCallback(
    async (data: Partial<Mindmap>) => {
      const isNew = !data.id;
      if (isNew) {
        const activeCount = allMindmaps.filter((m) => !m.archived).length;
        if (!guard('mindmaps', activeCount)) return;
      }
      const now = new Date().toISOString();
      const resolvedSwimlaneId =
        data.swimlaneId ?? selectedMindmap?.swimlaneId ?? swimlanes[0]?.id ?? "";
      const boardId = swimlanes.find((s) => s.id === resolvedSwimlaneId)?.boardId ?? boards[0]?.id ?? "";
      await putMindmap({
        ...data,
        boardId,
        swimlaneId: resolvedSwimlaneId,
        nodes: data.nodes ?? [],
        createdAt: data.createdAt ?? now,
        updatedAt: now,
      });

      const items = await getAllMindmaps();
      setAllMindmaps(items);

      if (!data.id) {
        const newest = items.find(
          (m) =>
            m.title === data.title &&
            m.swimlaneId === resolvedSwimlaneId
        );
        if (newest) setSelectedMindmap(newest);
        setIsCreatingNew(false);
      }
    },
    [boards, swimlanes, selectedMindmap?.swimlaneId]
  );

  const handleDeleteMindmap = useCallback(
    async (id: string) => {
      await deleteMindmap(id);
      if (selectedMindmap?.id === id) setSelectedMindmap(null);
      setIsCreatingNew(false);
      const items = await getAllMindmaps();
      setAllMindmaps(items);
    },
    [selectedMindmap?.id]
  );

  const handleArchiveMindmap = useCallback(
    async (id: string) => {
      const mindmap = allMindmaps.find((m) => m.id === id);
      if (!mindmap) return;
      await putMindmap({ ...mindmap, archived: true, archivedAt: new Date().toISOString() });
      if (selectedMindmap?.id === id) setSelectedMindmap(null);
      const items = await getAllMindmaps();
      setAllMindmaps(items);
    },
    [allMindmaps, selectedMindmap?.id]
  );

  const handleRestoreMindmap = useCallback(
    async (id: string) => {
      const mindmap = allMindmaps.find((m) => m.id === id);
      if (!mindmap) return;
      await putMindmap({ ...mindmap, archived: false, archivedAt: undefined });
      if (selectedMindmap?.id === id) setSelectedMindmap(null);
      const items = await getAllMindmaps();
      setAllMindmaps(items);
    },
    [allMindmaps, selectedMindmap?.id]
  );

  const createMindmapWithSwimlane = (swimlaneId: string) => {
    const boardId = swimlanes.find((s) => s.id === swimlaneId)?.boardId ?? boards[0]?.id ?? "";
    const now = new Date().toISOString();
    const newMindmap: Mindmap = {
      id: "",
      boardId,
      swimlaneId,
      title: "",
      nodes: [],
      createdAt: now,
      updatedAt: now,
    };
    setSelectedMindmap(newMindmap);
    setIsCreatingNew(true);
  };

  const handleSwimlaneSelect = (swimlaneId: string) => {
    createMindmapWithSwimlane(swimlaneId);
    setShowSwimlanePicker(false);
  };

  const handleAddSwimlane = useCallback(async (boardId: string, data: Partial<Swimlane>) => {
    await storePutSwimlane({ ...data, boardId });
  }, [storePutSwimlane]);

  const handleEditSwimlane = useCallback(async (swimlane: Swimlane) => {
    await storePutSwimlane(swimlane);
  }, [storePutSwimlane]);

  const handleDeleteSwimlane = useCallback(async (swimlaneId: string) => {
    await storeDeleteSwimlane(swimlaneId);
  }, [storeDeleteSwimlane]);

  const mindmapsBySwimlane = useMemo(() => {
    const map: Record<string, typeof visibleMindmaps> = {};
    for (const m of visibleMindmaps) {
      if (!map[m.swimlaneId]) map[m.swimlaneId] = [];
      map[m.swimlaneId].push(m);
    }
    return map;
  }, [visibleMindmaps]);

  const currentSwimlaneName = useMemo(
    () => selectedMindmap ? swimlanes.find((s) => s.id === selectedMindmap.swimlaneId)?.name : undefined,
    [swimlanes, selectedMindmap]
  );

  const sidebarLabel = useMemo(() => {
    if (!hasSelections || isAllSelected) return "All Mindmaps";
    if (selectedSwimlaneIds.size === 1) {
      const sw = swimlanes.find((s) => selectedSwimlaneIds.has(s.id));
      return sw?.name ?? "Mindmaps";
    }
    return `${selectedSwimlaneIds.size} ${labels.swimlanePlural}`;
  }, [hasSelections, isAllSelected, labels.swimlanePlural, selectedSwimlaneIds, swimlanes]);

  const middlePanel = (
    <>
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-sm font-semibold">{sidebarLabel}</span>
        {!isPlus && isAllSelected && (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {allMindmaps.filter((m) => !m.archived).length} / {PLAN_LIMITS.mindmaps}
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
            const laneMindmaps = mindmapsBySwimlane[lane.id] ?? [];
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
                  {laneMindmaps.map((mm) => (
                    <MindmapListItem
                      key={mm.id}
                      mindmap={mm}
                      swimlaneColor={lane.color}
                      isActive={selectedMindmap?.id === mm.id}
                      onClick={() => {
                        setSelectedMindmap(mm);
                        setIsCreatingNew(false);
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    onClick={() => createMindmapWithSwimlane(lane.id)}
                  >
                    + Add mindmap
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  const rightPanel = (
    <MindmapEditor
      key={selectedMindmap?.id ?? "__new__"}
      mindmap={selectedMindmap?.id ? selectedMindmap : null}
      isCreating={isCreatingNew}
      onSave={handleSaveMindmap}
      onDelete={selectedMindmap?.id ? handleDeleteMindmap : undefined}
      onArchive={selectedMindmap?.id && !selectedMindmap.archived ? handleArchiveMindmap : undefined}
      onRestore={selectedMindmap?.id && selectedMindmap.archived ? handleRestoreMindmap : undefined}
      swimlaneName={currentSwimlaneName}
    />
  );

  return (
    <>
      <SwimlanePickerModal
        open={showSwimlanePicker}
        onOpenChange={setShowSwimlanePicker}
        swimlanes={filteredSwimlanes}
        selectedSwimlaneIds={selectedSwimlaneIds}
        onSelect={handleSwimlaneSelect}
        title="Create Mindmap"
      />
      <AppLayout
        sidebarConfig={{
          boards: activeBoards,
          swimlanes: activeSwimlanes,
          allBoards: boards,
          allSwimlanes: swimlanes,
          swimlaneCounts: countsBySwimlane,
          allItemVisible: true,
          allItemLabel: "Mindmaps",
          allItemCount: visibleMindmaps.length,
          isArchivedSelectionMode,
          onAddSwimlane: handleAddSwimlane,
          onEditSwimlane: handleEditSwimlane,
          onDeleteSwimlane: handleDeleteSwimlane,
          db,
        }}
        middlePanel={middlePanel}
        rightPanel={rightPanel}
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

