"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Bookmark, BookmarkStatus, Swimlane } from "@/lib/types";
import { getAllBookmarks, putBookmark, deleteBookmark } from "@/lib/db";
import { fetchBookmarkMetadata, getDomainFromUrl, makeFallbackMetadata, normalizeBookmarkUrl } from "@/lib/bookmarks";
import { BookmarkCard } from "@/components/bookmarks/BookmarkCard";
import { BookmarkDetailPanel } from "@/components/bookmarks/BookmarkDetailPanel";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SwimlanePickerModal } from "@/components/ui/swimlane-picker-modal";
import { useBoardBase } from "@/hooks/useBoardBase";
import { useBookmarks, useBookmarksSubscription } from "@/stores";
import { useDbStore } from "@/stores/db-store";
import { Search } from "lucide-react";
import { useSwimlaneSelectionStore } from "@/stores/swimlane-selection-store";
import { useUpgradeGuard } from "@/hooks/useUpgradeGuard";
import { UpgradeDialog } from "@/components/subscriptions/UpgradeDialog";
import { useEntitlements } from "@/stores/entitlements-store";
import { PLAN_LIMITS } from "@/lib/subscriptions";

const BOOKMARK_STATUSES: BookmarkStatus[] = ["unread", "reading", "important", "archived", "favorite"];

type MetadataState = "idle" | "loading" | "error";

export function BookmarksBoard() {
  const db = useDbStore((s) => s.db);
  const selectBoard = useSwimlaneSelectionStore((s) => s.selectBoard);
  const selectionsKey = useSwimlaneSelectionStore((s) => s.selections.join(','));
  const searchParams = useSearchParams();
  useBookmarksSubscription();
  const subscribedBookmarks = useBookmarks();
  const [allBookmarks, setAllBookmarks] = useState<Bookmark[]>([]);
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const { guard, blocked, dismissDialog } = useUpgradeGuard();
  const { isPlus } = useEntitlements();
  const prevSelectionsKey = useRef(selectionsKey);
  const [searchQuery, setSearchQuery] = useState("");
   const {
    boards,
    swimlanes,
    activeBoards,
    activeSwimlanes,
    filteredSwimlanes,
    labels,
    hasSelections,
    selectedSwimlaneIds,
    isAllSelected,
    isArchivedSelectionMode,
    putSwimlane: storePutSwimlane,
    deleteSwimlane: storeDeleteSwimlane,
    filteredItems: filteredBySelection,
    archivedSwimlaneIdSet,
  } = useBoardBase<Bookmark>({
    items: allBookmarks,
    searchQuery,
    filterFn: (bookmark, query) =>
      bookmark.title.toLowerCase().includes(query) ||
      bookmark.description.toLowerCase().includes(query) ||
      bookmark.domain.toLowerCase().includes(query) ||
      bookmark.tags.some((tag) => tag.toLowerCase().includes(query)),
    sortFn: (a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    },
  });
  const [statusFilter, setStatusFilter] = useState<BookmarkStatus | "all">("all");
  const [showSwimlanePicker, setShowSwimlanePicker] = useState(false);
  const [metadataState, setMetadataState] = useState<MetadataState>("idle");
  const [tagInput, setTagInput] = useState("");
  const selectedBookmarkIdParam = searchParams.get("bookmarkId");
  const selectedBoardIdParam = searchParams.get("boardId");

  useEffect(() => {
    setAllBookmarks(subscribedBookmarks);
  }, [subscribedBookmarks]);

  useEffect(() => {
    if (selectedBoardIdParam) {
      selectBoard(selectedBoardIdParam);
    }
  }, [selectBoard, selectedBoardIdParam]);

  useEffect(() => {
    if (!selectedBookmarkIdParam) return;
    const target = allBookmarks.find((b) => b.id === selectedBookmarkIdParam) ?? subscribedBookmarks.find((b) => b.id === selectedBookmarkIdParam);
    if (target) {
      setSelectedBookmark(target);
      setMetadataState("idle");
    }
  }, [selectedBookmarkIdParam]);

  useEffect(() => {
    if (prevSelectionsKey.current === selectionsKey) return;
    prevSelectionsKey.current = selectionsKey;
    setSelectedBookmark(null);
  }, [selectionsKey]);

  useEffect(() => {
    if (selectedBookmark?.id) {
      const fresh = allBookmarks.find((bookmark) => bookmark.id === selectedBookmark.id);
      if (fresh) {
        setSelectedBookmark(fresh);
      } else {
        setSelectedBookmark(null);
      }
    }
  }, [allBookmarks, selectedBookmark?.id]);

  // Sync selected bookmark to URL query param (?bookmarkId=...).
  const hasUrlSyncHydrated = useRef(false);
  useEffect(() => {
    if (!hasUrlSyncHydrated.current) {
      hasUrlSyncHydrated.current = true;
      return;
    }
    const params = new URLSearchParams(globalThis.location.search);
    if (selectedBookmark) {
      params.set("bookmarkId", selectedBookmark.id);
    } else {
      params.delete("bookmarkId");
    }
    const newSearch = params.toString();
    globalThis.history.replaceState(
      null,
      "",
      newSearch ? `?${newSearch}` : globalThis.location.pathname
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBookmark?.id]);

  const visibleBookmarks = useMemo(() => {
    let bookmarks = isArchivedSelectionMode
      ? filteredBySelection.filter((bookmark) => bookmark.archived === true)
      : filteredBySelection.filter((bookmark) => !bookmark.archived);

    if (statusFilter !== "all") {
      bookmarks = bookmarks.filter((bookmark) => bookmark.status === statusFilter);
    }

    return bookmarks;
  }, [filteredBySelection, statusFilter, isArchivedSelectionMode]);
  const countsBySwimlane = useMemo(() => {
    const map: Record<string, number> = {};
    for (const bookmark of allBookmarks) {
      const inArchivedSwimlane = archivedSwimlaneIdSet.has(bookmark.swimlaneId);
      const shouldCount = bookmark.archived === (inArchivedSwimlane || isArchivedSelectionMode);
      if (shouldCount) {
        map[bookmark.swimlaneId] = (map[bookmark.swimlaneId] || 0) + 1;
      }
    }
    return map;
  }, [allBookmarks, isArchivedSelectionMode, archivedSwimlaneIdSet]);


  useEffect(() => {
    setTagInput("");
  }, [selectedBookmark?.id]);

  const addTag = useCallback(() => {
    const nextTag = tagInput.trim();
    if (!nextTag) return;

    setSelectedBookmark((current) => {
      if (!current) return current;
      const exists = current.tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase());
      if (exists) return current;
      return {
        ...current,
        tags: [...current.tags, nextTag],
      };
    });
    setTagInput("");
  }, [tagInput]);

  const removeTag = useCallback((tagToRemove: string) => {
    setSelectedBookmark((current) => {
      if (!current) return current;
      return {
        ...current,
        tags: current.tags.filter((tag) => tag !== tagToRemove),
      };
    });
  }, []);

  const saveBookmark = useCallback(
    async (data: Partial<Bookmark>) => {
      const isNew = !data.id;
      if (isNew) {
        const activeCount = allBookmarks.filter((b) => !b.archived).length;
        if (!guard('bookmarks', activeCount)) return;
      }
      const now = new Date().toISOString();
      const resolvedSwimlaneId = data.swimlaneId ?? selectedBookmark?.swimlaneId ?? swimlanes[0]?.id ?? "";
      const boardId = swimlanes.find((lane) => lane.id === resolvedSwimlaneId)?.boardId ?? boards[0]?.id ?? "";
      const normalizedRating = typeof data.rating === "number" && data.rating >= 1
        ? Math.min(5, Math.floor(data.rating))
        : undefined;

      const rawUrl = data.url?.trim();
      if (!rawUrl) return;

      let normalizedUrl: string;
      let domain: string;
      try {
        normalizedUrl = normalizeBookmarkUrl(rawUrl);
        domain = data.domain || getDomainFromUrl(normalizedUrl);
      } catch {
        return;
      }

      await putBookmark({
        ...data,
        boardId,
        swimlaneId: resolvedSwimlaneId,
        url: rawUrl,
        urlNormalized: normalizedUrl,
        domain,
        title: data.title?.trim() || domain,
        description: data.description ?? "",
        tags: data.tags ?? [],
        comments: data.comments ?? [],
        links: data.links ?? [],
        status: data.status ?? "unread",
        rating: normalizedRating,
        createdAt: data.createdAt ?? now,
        updatedAt: now,
      });

      const bookmarks = await getAllBookmarks();
      setAllBookmarks(bookmarks);

      if (!data.id) {
        const newest = bookmarks.find((bookmark) => bookmark.urlNormalized === normalizedUrl);
        if (newest) setSelectedBookmark(newest);
      }
    },
    [boards, selectedBookmark?.swimlaneId, swimlanes]
  );

  const hydrateMetadata = useCallback(async () => {
    if (!selectedBookmark?.url) return;
    setMetadataState("loading");
    try {
      const metadata = await fetchBookmarkMetadata(selectedBookmark.url);
      const fallback = makeFallbackMetadata(selectedBookmark.url);
      const now = new Date().toISOString();
      const next: Bookmark = {
        ...selectedBookmark,
        title: metadata.title || selectedBookmark.title || fallback.title || "",
        description: metadata.description || selectedBookmark.description || "",
        previewImage: metadata.previewImage || selectedBookmark.previewImage,
        favicon: metadata.favicon || selectedBookmark.favicon || fallback.favicon,
        siteName: metadata.siteName || selectedBookmark.siteName,
        domain: metadata.domain || selectedBookmark.domain || fallback.domain || "",
        metadataFetchStatus: "success",
        metadataLastFetchedAt: now,
        updatedAt: now,
      };
      setSelectedBookmark(next);
      await saveBookmark(next);
      setMetadataState("idle");
    } catch {
      setSelectedBookmark((current) =>
        current
          ? {
              ...current,
              metadataFetchStatus: "failed",
            }
          : current
      );
      setMetadataState("error");
    }
  }, [saveBookmark, selectedBookmark]);

  const handleDeleteBookmark = useCallback(
    async (bookmarkId: string) => {
      await deleteBookmark(bookmarkId);
      if (selectedBookmark?.id === bookmarkId) setSelectedBookmark(null);
      const bookmarks = await getAllBookmarks();
      setAllBookmarks(bookmarks);
    },
    [selectedBookmark?.id]
  );

  const handleArchiveBookmark = useCallback(
    async (bookmarkId: string) => {
      const bookmark = allBookmarks.find((b) => b.id === bookmarkId);
      if (!bookmark) return;
      await putBookmark({ ...bookmark, archived: true, archivedAt: new Date().toISOString() });
      if (selectedBookmark?.id === bookmarkId) setSelectedBookmark(null);
      const bookmarks = await getAllBookmarks();
      setAllBookmarks(bookmarks);
    },
    [allBookmarks, selectedBookmark?.id]
  );

  const handleRestoreBookmark = useCallback(
    async (bookmarkId: string) => {
      const bookmark = allBookmarks.find((b) => b.id === bookmarkId);
      if (!bookmark) return;
      await putBookmark({ ...bookmark, archived: false, archivedAt: undefined });
      if (selectedBookmark?.id === bookmarkId) setSelectedBookmark(null);
      const bookmarks = await getAllBookmarks();
      setAllBookmarks(bookmarks);
    },
    [allBookmarks, selectedBookmark?.id]
  );

  const createBookmarkWithSwimlane = useCallback(
    (swimlaneId: string) => {
      const boardId = swimlanes.find((lane) => lane.id === swimlaneId)?.boardId ?? boards[0]?.id ?? "";
      const now = new Date().toISOString();
      setSelectedBookmark({
        id: "",
        boardId,
        swimlaneId,
        url: "",
        urlNormalized: "",
        domain: "",
        title: "",
        description: "",
        tags: [],
        comments: [],
        links: [],
        status: "unread",
        pinned: false,
        createdAt: now,
        updatedAt: now,
      });
      setMetadataState("idle");
    },
    [boards, swimlanes]
  );


  const handleAddSwimlane = useCallback(async (boardId: string, data: Partial<Swimlane>) => {
    await storePutSwimlane({ ...data, boardId });
  }, [storePutSwimlane]);

  const handleEditSwimlane = useCallback(async (swimlane: Swimlane) => {
    await storePutSwimlane(swimlane);
  }, [storePutSwimlane]);

  const handleDeleteSwimlane = useCallback(async (swimlaneId: string) => {
    await storeDeleteSwimlane(swimlaneId);
  }, [storeDeleteSwimlane]);

  const bookmarksBySwimlane = useMemo(() => {
    const map: Record<string, typeof visibleBookmarks> = {};
    for (const b of visibleBookmarks) {
      if (!map[b.swimlaneId]) map[b.swimlaneId] = [];
      map[b.swimlaneId].push(b);
    }
    return map;
  }, [visibleBookmarks]);

  const currentSwimlaneName = useMemo(
    () => selectedBookmark ? swimlanes.find((s) => s.id === selectedBookmark.swimlaneId)?.name : undefined,
    [swimlanes, selectedBookmark]
  );

  const sidebarLabel = useMemo(() => {
    if (!hasSelections || isAllSelected) return "All Bookmarks";
    if (selectedSwimlaneIds.size === 1) {
      const lane = swimlanes.find((swimlane) => selectedSwimlaneIds.has(swimlane.id));
      return lane?.name ?? "Bookmarks";
    }
    return `${selectedSwimlaneIds.size} ${labels.swimlanePlural}`;
  }, [hasSelections, isAllSelected, labels.swimlanePlural, selectedSwimlaneIds, swimlanes]);

  const middlePanel = (
    <>
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-sm font-semibold">{sidebarLabel}</span>
        {!isPlus && isAllSelected && (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {allBookmarks.filter((b) => !b.archived).length} / {PLAN_LIMITS.bookmarks}
          </span>
        )}
      </div>
      <div className="space-y-2 border-b px-3 py-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search..."
            className="h-8 pl-7 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as BookmarkStatus | "all")}>
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {BOOKMARK_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
        <div className="flex flex-col gap-3">
          {filteredSwimlanes.map((lane) => {
            const laneBookmarks = bookmarksBySwimlane[lane.id] ?? [];
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
                  {laneBookmarks.map((bookmark) => (
                    <BookmarkCard
                      key={bookmark.id}
                      bookmark={bookmark}
                      accentColor={lane.color}
                      isSelected={selectedBookmark?.id === bookmark.id}
                      onSelect={() => {
                        setSelectedBookmark(bookmark);
                        setMetadataState("idle");
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    onClick={() => createBookmarkWithSwimlane(lane.id)}
                  >
                    + Add bookmark
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  const rightPanel = selectedBookmark ? (
    <BookmarkDetailPanel
      bookmark={selectedBookmark}
      currentSwimlaneName={currentSwimlaneName}
      metadataState={metadataState}
      tagInput={tagInput}
      setTagInput={setTagInput}
      setBookmark={setSelectedBookmark}
      onAddTag={addTag}
      onRemoveTag={removeTag}
      onHydrateMetadata={hydrateMetadata}
      onArchive={() => handleArchiveBookmark(selectedBookmark.id)}
      onRestore={() => handleRestoreBookmark(selectedBookmark.id)}
      onDelete={() => handleDeleteBookmark(selectedBookmark.id)}
      onSave={() => saveBookmark(selectedBookmark)}
    />
  ) : (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Select or create a bookmark to start.
    </div>
  );

  return (
    <>
      <SwimlanePickerModal
        open={showSwimlanePicker}
        onOpenChange={setShowSwimlanePicker}
        swimlanes={filteredSwimlanes}
        selectedSwimlaneIds={selectedSwimlaneIds}
        onSelect={(swimlaneId) => {
          createBookmarkWithSwimlane(swimlaneId);
          setShowSwimlanePicker(false);
        }}
        title="Create Bookmark"
      />
      <AppLayout
        sidebarConfig={{
          boards: activeBoards,
          swimlanes: activeSwimlanes,
          allBoards: boards,
          allSwimlanes: swimlanes,
          swimlaneCounts: countsBySwimlane,
          allItemVisible: true,
          allItemLabel: "Bookmarks",
          allItemCount: visibleBookmarks.length,
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
