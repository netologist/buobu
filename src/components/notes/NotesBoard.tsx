"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Note, Swimlane } from "@/lib/types";
import { getAllNotes, putNote, deleteNote } from "@/lib/db";
import NoteEditor from "@/components/notes/NoteEditor";
import { AppLayout } from "@/components/layout/AppLayout";
import { MobileFab } from "@/components/layout/MobileFab";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pin, Search, Download, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseFrontmatter } from "@/lib/frontmatter";
import { SwimlanePickerModal } from "@/components/ui/swimlane-picker-modal";
import { useBoardBase } from "@/hooks/useBoardBase";
import { useNotes, useNotesSubscription } from "@/stores";
import { useDbStore } from "@/stores/db-store";
import { useSwimlaneSelectionStore } from "@/stores/swimlane-selection-store";

export function NotesBoard() {
  const db = useDbStore((s) => s.db);
  const selectBoard = useSwimlaneSelectionStore((s) => s.selectBoard);
  const selectionsKey = useSwimlaneSelectionStore((s) =>
    s.selections.join(","),
  );
  const searchParams = useSearchParams();
  useNotesSubscription();
  const subscribedNotes = useNotes();
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const prevSelectionsKey = useRef(selectionsKey);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const selectedNoteIdParam = searchParams.get("noteId");
  const selectedBoardIdParam = searchParams.get("boardId");
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
    primaryBoardId,
    putSwimlane: storePutSwimlane,
    deleteSwimlane: storeDeleteSwimlane,
    filteredItems: filteredBySelection,
    archivedSwimlaneIdSet,
  } = useBoardBase<Note>({
    items: allNotes,
    searchQuery,
    filterFn: (note, query) =>
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags?.some((tag) => tag.toLowerCase().includes(query)) === true,
    sortFn: (a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    },
  });
  const [dragOverSwimlaneId, setDragOverSwimlaneId] = useState<string | null>(
    null,
  );
  const [showSwimlanePicker, setShowSwimlanePicker] = useState(false);
  const [menuState, setMenuState] = useState<{ laneId: string; top: number; right: number } | null>(null);

  useEffect(() => {
    setAllNotes(subscribedNotes);
  }, [subscribedNotes]);

  useEffect(() => {
    if (selectedBoardIdParam) {
      selectBoard(selectedBoardIdParam);
    }
  }, [selectBoard, selectedBoardIdParam]);

  useEffect(() => {
    if (prevSelectionsKey.current === selectionsKey) return;
    prevSelectionsKey.current = selectionsKey;
    setSelectedNote(null);
    setIsCreatingNew(false);
  }, [selectionsKey]);

  useEffect(() => {
    if (selectedNote?.id) {
      const fresh = allNotes.find((n) => n.id === selectedNote.id);
      if (fresh) setSelectedNote(fresh);
    }
  }, [allNotes, selectedNote?.id]);

  useEffect(() => {
    if (!selectedNoteIdParam) return;
    const target =
      allNotes.find((n) => n.id === selectedNoteIdParam) ??
      subscribedNotes.find((n) => n.id === selectedNoteIdParam);
    if (target) {
      setSelectedNote(target);
      setIsCreatingNew(false);
    }
  }, [allNotes, selectedNoteIdParam, subscribedNotes]);

  // Sync selected note to URL query param (?noteId=...).
  const hasUrlSyncHydrated = useRef(false);
  useEffect(() => {
    if (!hasUrlSyncHydrated.current) {
      hasUrlSyncHydrated.current = true;
      return;
    }
    const params = new URLSearchParams(globalThis.location.search);
    if (selectedNote) {
      params.set("noteId", selectedNote.id);
    } else {
      params.delete("noteId");
    }
    const newSearch = params.toString();
    globalThis.history.replaceState(
      null,
      "",
      newSearch ? `?${newSearch}` : globalThis.location.pathname,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNote?.id]);

  const visibleNotes = useMemo(() => {
    return isArchivedSelectionMode
      ? filteredBySelection.filter((note) => note.archived === true)
      : filteredBySelection.filter((note) => !note.archived);
  }, [filteredBySelection, isArchivedSelectionMode]);
  const countsBySwimlane = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of allNotes) {
      const inArchivedSwimlane = archivedSwimlaneIdSet.has(n.swimlaneId);
      const shouldCount =
        n.archived === (inArchivedSwimlane || isArchivedSelectionMode);
      if (shouldCount) {
        map[n.swimlaneId] = (map[n.swimlaneId] || 0) + 1;
      }
    }
    return map;
  }, [allNotes, isArchivedSelectionMode, archivedSwimlaneIdSet]);

  const selectedBoardNotesCount = useMemo(() => {
    const boardId = primaryBoardId ?? boards[0]?.id;
    if (!boardId) return allNotes.length;
    return allNotes.filter((n) => n.boardId === boardId).length;
  }, [allNotes, primaryBoardId, boards]);

  const currentBoardName = useMemo(() => {
    if (!selectedNote?.boardId) return undefined;
    return (
      boards.find((b) => b.id === selectedNote.boardId)?.name ??
      `Unknown ${labels.board.toLowerCase()}`
    );
  }, [boards, selectedNote?.boardId, labels]);

  const currentSwimlaneName = useMemo(() => {
    if (!selectedNote?.swimlaneId) return undefined;
    return swimlanes.find((sw) => sw.id === selectedNote.swimlaneId)?.name;
  }, [swimlanes, selectedNote?.swimlaneId]);

  const handleSaveNote = useCallback(
    async (noteData: Partial<Note>) => {
      const now = new Date().toISOString();
      const resolvedSwimlaneId =
        noteData.swimlaneId ??
        selectedNote?.swimlaneId ??
        swimlanes[0]?.id ??
        "";
      const boardFromSwimlane = swimlanes.find(
        (sw) => sw.id === resolvedSwimlaneId,
      )?.boardId;
      const resolvedBoardId =
        boardFromSwimlane ??
        noteData.boardId ??
        selectedNote?.boardId ??
        boards[0]?.id ??
        "";
      await putNote({
        ...noteData,
        boardId: resolvedBoardId,
        swimlaneId: resolvedSwimlaneId,
        tags: noteData.tags ?? [],
        references: noteData.references ?? [],
        createdAt: noteData.createdAt ?? now,
        updatedAt: now,
      });

      const notes = await getAllNotes();
      setAllNotes(notes);

      if (!noteData.id) {
        const newest = notes.find(
          (n) =>
            n.title === noteData.title && n.swimlaneId === resolvedSwimlaneId,
        );
        if (newest) setSelectedNote(newest);
        setIsCreatingNew(false);
      }
    },
    [boards, swimlanes, selectedNote?.boardId, selectedNote?.swimlaneId],
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      await deleteNote(noteId);
      if (selectedNote?.id === noteId) setSelectedNote(null);
      setIsCreatingNew(false);
      const notes = await getAllNotes();
      setAllNotes(notes);
    },
    [selectedNote?.id],
  );

  const handleArchiveNote = useCallback(
    async (noteId: string) => {
      const note = allNotes.find((n) => n.id === noteId);
      if (!note) return;
      await putNote({
        ...note,
        archived: true,
        archivedAt: new Date().toISOString(),
      });
      if (selectedNote?.id === noteId) setSelectedNote(null);
      const notes = await getAllNotes();
      setAllNotes(notes);
    },
    [allNotes, selectedNote?.id],
  );

  const handleRestoreNote = useCallback(
    async (noteId: string) => {
      const note = allNotes.find((n) => n.id === noteId);
      if (!note) return;
      await putNote({ ...note, archived: false, archivedAt: undefined });
      if (selectedNote?.id === noteId) setSelectedNote(null);
      const notes = await getAllNotes();
      setAllNotes(notes);
    },
    [allNotes, selectedNote?.id],
  );

  const importFileRef = useRef<HTMLInputElement>(null);
  const importTargetSwimlaneRef = useRef<string | null>(null);

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (e.target.value !== undefined) e.target.value = "";
      if (!file) return;

      if (file.size > 5_000_000) {
        alert("File too large. Maximum size is 5 MB.");
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => alert("Could not read the file.");
      reader.onload = async () => {
        try {
          const text = reader.result as string;
          const {
            title: fmTitle,
            tags: fmTags,
            createdAt: fmCreatedAt,
            metadata: fmMetadata,
            body,
          } = parseFrontmatter(text);

          const rawTitle =
            fmTitle ?? file.name.replace(/\.md$/i, "").replace(/[-_]/g, " ");
          const now = new Date().toISOString();

          const targetSwimlaneId =
            importTargetSwimlaneRef.current ?? swimlanes[0]?.id ?? "";
          importTargetSwimlaneRef.current = null;
          const targetBoardId =
            swimlanes.find((s) => s.id === targetSwimlaneId)?.boardId ??
            boards[0]?.id ??
            "";
          await handleSaveNote({
            swimlaneId: targetSwimlaneId,
            boardId: targetBoardId,
            title: rawTitle || "Imported note",
            content: body,
            tags: fmTags ?? [],
            references: [],
            metadata: fmMetadata ?? [],
            pinned: false,
            createdAt: fmCreatedAt ?? now,
          });
        } catch {
          alert("Could not read the file.");
        }
      };
      reader.readAsText(file);
    },
    [handleSaveNote, swimlanes, boards],
  );

  const createNoteWithSwimlane = (swimlaneId: string) => {
    const boardId =
      swimlanes.find((s) => s.id === swimlaneId)?.boardId ??
      boards[0]?.id ??
      "";
    const now = new Date().toISOString();
    const newNote: Note = {
      id: "",
      boardId,
      swimlaneId,
      title: "",
      content: "",
      tags: [],
      references: [],
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    setSelectedNote(newNote);
    setIsCreatingNew(true);
  };

  const handleSwimlaneSelect = (swimlaneId: string) => {
    createNoteWithSwimlane(swimlaneId);
    setShowSwimlanePicker(false);
  };

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

  const notesBySwimlane = useMemo(() => {
    const map: Record<string, typeof visibleNotes> = {};
    for (const n of visibleNotes) {
      if (!map[n.swimlaneId]) map[n.swimlaneId] = [];
      map[n.swimlaneId].push(n);
    }
    return map;
  }, [visibleNotes]);

  const sidebarLabel = useMemo(() => {
    if (!hasSelections || isAllSelected) return "All Notes";
    if (selectedSwimlaneIds.size === 1) {
      const sw = swimlanes.find((s) => selectedSwimlaneIds.has(s.id));
      return sw?.name ?? "Notes";
    }
    return `${selectedSwimlaneIds.size} ${labels.swimlanePlural}`;
  }, [
    hasSelections,
    isAllSelected,
    selectedSwimlaneIds,
    swimlanes,
    labels.swimlanePlural,
  ]);

  const handleMoveNote = useCallback(
    async (noteId: string, targetSwimlane: Swimlane) => {
      const note = allNotes.find((n) => n.id === noteId);
      if (!note) return;
      if (note.swimlaneId === targetSwimlane.id) return;
      const now = new Date().toISOString();
      const nextBoardId = targetSwimlane.boardId ?? note.boardId;
      await putNote({
        ...note,
        swimlaneId: targetSwimlane.id,
        boardId: nextBoardId,
        updatedAt: now,
      });
      const notes = await getAllNotes();
      setAllNotes(notes);
      if (selectedNote?.id === noteId) {
        setSelectedNote({
          ...note,
          swimlaneId: targetSwimlane.id,
          boardId: nextBoardId,
          updatedAt: now,
        });
      }
    },
    [allNotes, selectedNote?.id],
  );



  const middlePanel = (
    <>
      <input
        ref={importFileRef}
        type="file"
        accept=".md,text/markdown"
        className="hidden"
        onChange={handleFileSelected}
      />
      <div className="flex items-center border-b px-3 py-2.5">
        <span className="text-sm font-semibold">{sidebarLabel}</span>
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
            const laneNotes = notesBySwimlane[lane.id] ?? [];
            return (
              <div
                key={lane.id}
                className="rounded-xl border bg-card overflow-hidden group"
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 border-b"
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: lane.color ?? "#6B7280",
                  }}
                >
                  <span className="flex-1 text-sm font-semibold truncate">
                    {lane.name}
                  </span>
                  {lane.label && (
                    <Badge variant="secondary" className="text-[9px] shrink-0">
                      {lane.label}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground"
                    title={`Actions for ${lane.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenuState((prev) =>
                        prev?.laneId === lane.id
                          ? null
                          : {
                              laneId: lane.id,
                              top: rect.bottom + 4,
                              right: window.innerWidth - rect.right,
                            },
                      );
                    }}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </div>
                <div className="divide-y overflow-hidden rounded-b-xl">
                  {laneNotes.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No notes yet
                    </div>
                  ) : (
                    laneNotes.map((note) => (
                    <NoteListItem
                      key={note.id}
                      note={note}
                      swimlaneColor={lane.color}
                      isActive={selectedNote?.id === note.id}
                      onClick={() => {
                        setSelectedNote(note);
                        setIsCreatingNew(false);
                      }}
                      onDragEnd={() => setDragOverSwimlaneId(null)}
                    />
                  ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed three-dot menu portal */}
      {menuState && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setMenuState(null)}
          />
          <div
            className="fixed z-[101] min-w-[140px] rounded-md border bg-popover p-1 shadow-lg"
            style={{ top: menuState.top, right: menuState.right }}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-popover-foreground hover:bg-muted"
              onClick={() => {
                importTargetSwimlaneRef.current = menuState.laneId;
                importFileRef.current?.click();
                setMenuState(null);
              }}
            >
              <Download className="h-3 w-3" />
              Import .md
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-popover-foreground hover:bg-muted"
              onClick={() => {
                createNoteWithSwimlane(menuState.laneId);
                setMenuState(null);
              }}
            >
              <span className="flex h-3 w-3 items-center justify-center text-sm leading-none font-bold">+</span>
              Add note
            </button>
          </div>
        </>
      )}
    </>
  );

  const rightPanel = (
    <NoteEditor
      key={selectedNote?.id ?? "__new__"}
      note={selectedNote?.id ? selectedNote : null}
      isCreating={isCreatingNew}
      allNotes={allNotes}
      boardName={currentBoardName}
      swimlaneName={currentSwimlaneName}
      onSave={handleSaveNote}
      onDelete={selectedNote?.id ? handleDeleteNote : undefined}
      onArchive={
        selectedNote?.id && !selectedNote.archived
          ? handleArchiveNote
          : undefined
      }
      onRestore={
        selectedNote?.id && selectedNote.archived
          ? handleRestoreNote
          : undefined
      }
      onNavigateToNote={async (targetNote) => {
        if (selectedNote?.id) {
          const now = new Date().toISOString();
          const boardFromSwimlane = swimlanes.find(
            (sw) => sw.id === selectedNote.swimlaneId,
          )?.boardId;
          await putNote({
            ...selectedNote,
            boardId:
              boardFromSwimlane ?? selectedNote.boardId ?? boards[0]?.id ?? "",
            tags: selectedNote.tags ?? [],
            references: selectedNote.references ?? [],
            updatedAt: now,
          });
          const notes = await getAllNotes();
          setAllNotes(notes);
        }
        setSelectedNote(targetNote);
        setIsCreatingNew(false);
      }}
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
        title="Create Note"
      />
      <MobileFab
        aria-label="Add new note"
        icon={
          <span className="text-2xl leading-none" aria-hidden>
            +
          </span>
        }
        onClick={() => {
          const lane = filteredSwimlanes[0];
          if (lane) createNoteWithSwimlane(lane.id);
        }}
      />
      <AppLayout
        sidebarConfig={{
          boards: activeBoards,
          swimlanes: activeSwimlanes,
          allBoards: boards,
          allSwimlanes: swimlanes,
          swimlaneCounts: countsBySwimlane,
          dragOverSwimlaneId,
          onSwimlaneDragOver: (id) => setDragOverSwimlaneId(id),
          onSwimlaneDragLeave: () => setDragOverSwimlaneId(null),
          onSwimlaneDrop: (swimlaneId) => {
            const sw = swimlanes.find((s) => s.id === swimlaneId);
            if (sw) handleMoveNote("", sw);
            setDragOverSwimlaneId(null);
          },
          allItemVisible: true,
          allItemLabel: "Notes",
          allItemCount: selectedBoardNotesCount,
          isArchivedSelectionMode,
          onAddSwimlane: handleAddSwimlane,
          onEditSwimlane: handleEditSwimlane,
          onDeleteSwimlane: handleDeleteSwimlane,
          db,
        }}
        middlePanel={middlePanel}
        rightPanel={rightPanel}
      />
    </>
  );
}

function NoteListItem({
  note,
  swimlaneColor,
  isActive,
  onClick,
  onDragEnd,
}: Readonly<{
  note: Note;
  swimlaneColor?: string;
  isActive: boolean;
  onClick: () => void;
  onDragEnd?: () => void;
}>) {
  const titlePreview = note.title.trim()
    ? note.title.trim().slice(0, 35)
    : "Untitled";
  const displayTitle =
    titlePreview.length < (note.title.trim()?.length ?? 0)
      ? `${titlePreview}...`
      : titlePreview;
  const preview = note.content
    .replace(/[#*_~`>()!]/g, "")
    .replaceAll("[", "")
    .trim()
    .slice(0, 100);

  return (
    <button
      onClick={onClick}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", note.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={onDragEnd}
      className={`flex w-full flex-col gap-0.5 border-b px-4 py-2.5 text-left transition-colors ${
        isActive ? "bg-primary/10" : "hover:bg-muted/50"
      }`}
      style={
        swimlaneColor
          ? { borderLeftColor: swimlaneColor, borderLeftWidth: "3px" }
          : undefined
      }
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {note.pinned && (
          <Pin className="h-3 w-3 shrink-0 text-amber-500 dark:text-amber-300" />
        )}
        <span className="flex-1 truncate text-sm font-medium leading-tight">
          {displayTitle}
        </span>
      </div>
      {preview && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{preview}</p>
      )}
      <div className="flex items-center gap-2 pt-0.5">
        <span className="text-[10px] text-muted-foreground">
          {new Date(note.updatedAt).toLocaleDateString()}
        </span>
        {note.tags?.slice(0, 2).map((t) => (
          <Badge
            key={t}
            variant="outline"
            className="rounded-full px-1.5 py-0 text-[9px]"
          >
            #{t}
          </Badge>
        ))}
      </div>
    </button>
  );
}
