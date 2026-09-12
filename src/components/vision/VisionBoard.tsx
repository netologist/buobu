"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Swimlane, VisionBoardItem } from "@/lib/types";
import {
  getAllVisionItems,
  putVisionItem,
  deleteVisionItem,
} from "@/lib/db";
import dynamic from "next/dynamic";
import { AppLayout } from "@/components/layout/AppLayout";
import { VisionItemListItem } from "@/components/vision/VisionItemListItem";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { SwimlanePickerModal } from "@/components/ui/swimlane-picker-modal";
import { useBoards } from "@/stores/hooks/use-boards";
import { useVisionItems, useVisionItemsSubscription } from "@/stores";
import { filterItems, useSwimlaneSelectionStore } from "@/stores/swimlane-selection-store";
import { useDbStore } from "@/stores/db-store";
import { useUpgradeGuard } from "@/hooks/useUpgradeGuard";
import { UpgradeDialog } from "@/components/subscriptions/UpgradeDialog";
import { useEntitlements } from "@/stores/entitlements-store";
import { PLAN_LIMITS } from "@/lib/subscriptions";
import { useBoardSwimlaneUrlSync } from "@/hooks/useBoardSwimlaneUrlSync";

const ExcalidrawEditor = dynamic(
  () => import("@/components/vision/ExcalidrawEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Loading canvas…
      </div>
    ),
  }
);

export function VisionBoard() {
  const db = useDbStore((s) => s.db);
  const selectBoard = useSwimlaneSelectionStore((s) => s.selectBoard);
  const selectionsKey = useSwimlaneSelectionStore((s) => s.selections.join(','));
  const searchParams = useSearchParams();

  // Sync board/swimlane selection to/from URL (?board=&swimlanes=).
  useBoardSwimlaneUrlSync();
  useVisionItemsSubscription();
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
  const subscribedItems = useVisionItems();
  const [allItems, setAllItems] = useState<VisionBoardItem[]>([]);
  const { guard, blocked, dismissDialog } = useUpgradeGuard();
  const { isPlus } = useEntitlements();
  const [selectedItem, setSelectedItem] = useState<VisionBoardItem | null>(null);
  const prevSelectionsKey = useRef(selectionsKey);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSwimlanePicker, setShowSwimlanePicker] = useState(false);
  const selectedItemIdParam = searchParams.get("whiteboardId");
  const selectedBoardIdParam = searchParams.get("boardId");

  useEffect(() => {
    setAllItems(subscribedItems);
  }, [subscribedItems]);

  useEffect(() => {
    if (selectedBoardIdParam) {
      selectBoard(selectedBoardIdParam);
    }
  }, [selectBoard, selectedBoardIdParam]);

  useEffect(() => {
    if (prevSelectionsKey.current === selectionsKey) return;
    prevSelectionsKey.current = selectionsKey;
    setSelectedItem(null);
    setIsCreatingNew(false);
  }, [selectionsKey]);

  useEffect(() => {
    if (selectedItem?.id) {
      const fresh = allItems.find((i) => i.id === selectedItem.id);
      if (fresh) {
        setSelectedItem(fresh);
      } else {
        setSelectedItem(null);
        setIsCreatingNew(false);
      }
    }
  }, [allItems, selectedItem?.id]);

  useEffect(() => {
    if (!selectedItemIdParam) return;
    const target = allItems.find((i) => i.id === selectedItemIdParam) ?? subscribedItems.find((i) => i.id === selectedItemIdParam);
    if (target) {
      setSelectedItem(target);
      setIsCreatingNew(false);
    }
  }, [allItems, selectedItemIdParam, subscribedItems]);

  // Sync selected item to URL query param (?whiteboardId=...).
  const hasUrlSyncHydrated = useRef(false);
  useEffect(() => {
    if (!hasUrlSyncHydrated.current) {
      hasUrlSyncHydrated.current = true;
      return;
    }
    const params = new URLSearchParams(globalThis.location.search);
    if (selectedItem) {
      params.set("whiteboardId", selectedItem.id);
    } else {
      params.delete("whiteboardId");
    }
    const newSearch = params.toString();
    globalThis.history.replaceState(
      null,
      "",
      newSearch ? `?${newSearch}` : globalThis.location.pathname
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem?.id]);

  const filteredBySelection = useMemo(() => filterItems(allItems, selections), [allItems, selections]);

  const visibleItems = useMemo(() => {
    let items = isArchivedSelectionMode
      ? filteredBySelection.filter((i) => i.archived === true)
      : filteredBySelection.filter((i) => !i.archived);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) => i.title.toLowerCase().includes(q));
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
    for (const i of allItems) {
      const inArchivedSwimlane = archivedSwimlaneIdSet.has(i.swimlaneId);
      const shouldCount = i.archived === (inArchivedSwimlane || isArchivedSelectionMode);
      if (shouldCount) {
        map[i.swimlaneId] = (map[i.swimlaneId] || 0) + 1;
      }
    }
    return map;
  }, [allItems, isArchivedSelectionMode, archivedSwimlaneIdSet]);

  const handleSaveItem = useCallback(
    async (data: Partial<VisionBoardItem>) => {
      const isNew = !data.id;
      if (isNew) {
        const activeCount = allItems.filter((i) => !i.archived).length;
        if (!guard('whiteboards', activeCount)) return;
      }
      const now = new Date().toISOString();
      const resolvedSwimlaneId =
        data.swimlaneId ?? selectedItem?.swimlaneId ?? swimlanes[0]?.id ?? "";
      const boardId = swimlanes.find((s) => s.id === resolvedSwimlaneId)?.boardId ?? boards[0]?.id ?? "";
      await putVisionItem({
        ...data,
        boardId,
        swimlaneId: resolvedSwimlaneId,
        createdAt: data.createdAt ?? now,
        updatedAt: now,
      });

      const items = await getAllVisionItems();
      setAllItems(items);

      if (!data.id) {
        const newest = items.find(
          (i) =>
            i.title === data.title && i.swimlaneId === resolvedSwimlaneId
        );
        if (newest) setSelectedItem(newest);
        setIsCreatingNew(false);
      }
    },
    [allItems, boards, guard, selectedItem?.swimlaneId, swimlanes]
  );

  const handleDeleteItem = useCallback(
    async (id: string) => {
      await deleteVisionItem(id);
      if (selectedItem?.id === id) setSelectedItem(null);
      setIsCreatingNew(false);
      const items = await getAllVisionItems();
      setAllItems(items);
    },
    [selectedItem?.id]
  );

  const handleArchiveItem = useCallback(
    async (id: string) => {
      const item = allItems.find((i) => i.id === id);
      if (!item) return;
      await putVisionItem({ ...item, archived: true, archivedAt: new Date().toISOString() });
      if (selectedItem?.id === id) setSelectedItem(null);
      const items = await getAllVisionItems();
      setAllItems(items);
    },
    [allItems, selectedItem?.id]
  );

  const createItemWithSwimlane = (swimlaneId: string) => {
    const boardId = swimlanes.find((s) => s.id === swimlaneId)?.boardId ?? boards[0]?.id ?? "";
    const now = new Date().toISOString();
    const newItem: VisionBoardItem = {
      id: "",
      boardId,
      swimlaneId,
      title: "",
      excalidrawData: "",
      createdAt: now,
      updatedAt: now,
    };
    setSelectedItem(newItem);
    setIsCreatingNew(true);
  };

  const handleSwimlaneSelect = (swimlaneId: string) => {
    createItemWithSwimlane(swimlaneId);
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

  const itemsBySwimlane = useMemo(() => {
    const map: Record<string, typeof visibleItems> = {};
    for (const item of visibleItems) {
      if (!map[item.swimlaneId]) map[item.swimlaneId] = [];
      map[item.swimlaneId].push(item);
    }
    return map;
  }, [visibleItems]);

  const sidebarLabel = useMemo(() => {
    if (!hasSelections || isAllSelected) return "All Whiteboards";
    if (selectedSwimlaneIds.size === 1) {
      const sw = swimlanes.find((s) => selectedSwimlaneIds.has(s.id));
      return sw?.name ?? "Whiteboards";
    }
    return `${selectedSwimlaneIds.size} ${labels.swimlanePlural}`;
  }, [hasSelections, isAllSelected, labels.swimlanePlural, selectedSwimlaneIds, swimlanes]);

  const currentSwimName = (() => {
    if (!selectedItem) return undefined;
    const s = swimlanes.find(
      (sw: Swimlane) => sw.id === selectedItem.swimlaneId
    );
    return s?.name;
  })();

  const middlePanel = (
    <>
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-sm font-semibold">{sidebarLabel}</span>
        {!isPlus && isAllSelected && (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {allItems.filter((i) => !i.archived).length} / {PLAN_LIMITS.whiteboards}
          </span>
        )}
      </div>
      <div className="border-b pl-3 pr-1 py-2">
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
            const laneItems = itemsBySwimlane[lane.id] ?? [];
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
                  {laneItems.map((item) => (
                    <VisionItemListItem
                      key={item.id}
                      item={item}
                      swimlaneColor={lane.color}
                      isActive={selectedItem?.id === item.id}
                      onClick={() => {
                        setSelectedItem(item);
                        setIsCreatingNew(false);
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    onClick={() => createItemWithSwimlane(lane.id)}
                  >
                    + Add whiteboard
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
    <ExcalidrawEditor
      key={selectedItem?.id ?? "__new__"}
      item={selectedItem?.id ? selectedItem : null}
      isCreating={isCreatingNew}
      onSave={handleSaveItem}
      onDelete={selectedItem?.id ? handleDeleteItem : undefined}
      onArchive={selectedItem?.id ? handleArchiveItem : undefined}
      swimlaneName={currentSwimName}
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
        title="Create Whiteboard"
      />
      <AppLayout
        sidebarConfig={{
          boards: activeBoards,
          swimlanes: activeSwimlanes,
          allBoards: boards,
          allSwimlanes: swimlanes,
          swimlaneCounts: countsBySwimlane,
          allItemVisible: true,
          allItemLabel: "Whiteboards",
          allItemCount: visibleItems.length,
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
