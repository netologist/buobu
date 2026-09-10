'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Search, RotateCcw, Trash2, Layout, Layers, CheckSquare, BookOpen, Brain, Bookmark, Eye, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBoardStore } from '@/stores/board-store';
import { useSwimlaneSelectionStore } from '@/stores/swimlane-selection-store';
import {
  useArchivedTasks,
  useArchivedHabits,
  useArchivedNotes,
  useArchivedMindmaps,
  useArchivedBookmarks,
  useArchivedVisionItems,
  taskActions,
  habitActions,
  noteActions,
  mindmapActions,
  bookmarkActions,
  visionItemActions,
} from '@/stores';
import { PermanentDeleteDialog } from '@/components/ui/archive-dialogs';
import type { Task, Habit, Note, Mindmap, Bookmark as BookmarkType, VisionBoardItem } from '@/lib/types';

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

type EntityType = 'board' | 'swimlane' | 'task' | 'habit' | 'note' | 'mindmap' | 'bookmark' | 'visionItem';

const ENTITY_ICONS: Record<EntityType, React.ReactNode> = {
  board: <Layout className="h-4 w-4" />,
  swimlane: <Layers className="h-4 w-4" />,
  task: <CheckSquare className="h-4 w-4" />,
  habit: <ListTodo className="h-4 w-4" />,
  note: <BookOpen className="h-4 w-4" />,
  mindmap: <Brain className="h-4 w-4" />,
  bookmark: <Bookmark className="h-4 w-4" />,
  visionItem: <Eye className="h-4 w-4" />,
};

const ENTITY_LABELS: Record<EntityType, string> = {
  board: 'Boards',
  swimlane: 'Swimlanes',
  task: 'Tasks',
  habit: 'Habits',
  note: 'Notes',
  mindmap: 'Mindmaps',
  bookmark: 'Bookmarks',
  visionItem: 'Vision Items',
};

interface ArchiveItemRowProps {
  title: string;
  archivedAt?: string | null;
  entityType: EntityType;
  parentInfo?: string;
  onRestore: () => void;
  onDelete: () => void;
  onSelect?: () => void;
}

function ArchiveItemRow({ title, archivedAt, entityType, parentInfo, onRestore, onDelete, onSelect }: ArchiveItemRowProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted/50 ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={onSelect}
    >
      <span className="text-muted-foreground">{ENTITY_ICONS[entityType]}</span>
      <div className="flex-1 min-w-0">
        <span className="truncate block">{title}</span>
        {parentInfo && (
          <span className="text-[10px] text-muted-foreground truncate block">{parentInfo}</span>
        )}
      </div>
      {archivedAt && (
        <span className="text-xs text-muted-foreground shrink-0">
          {formatRelativeTime(archivedAt)}
        </span>
      )}
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onRestore(); }} className="h-7 gap-1 px-2">
          <RotateCcw className="h-3.5 w-3.5" />
          Restore
        </Button>
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="h-7 gap-1 px-2 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface ArchiveGroupProps {
  entityType: EntityType;
  children: React.ReactNode;
  count: number;
}

function ArchiveGroup({ entityType, children, count }: ArchiveGroupProps) {
  if (count === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {ENTITY_ICONS[entityType]}
        {ENTITY_LABELS[entityType]}
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{count}</span>
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export default function ArchivePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ name: string; deleteFn: () => Promise<void> } | null>(null);

  const boards = useBoardStore((s) => s.boards);
  const swimlanes = useBoardStore((s) => s.swimlanes);
  const { unarchiveBoard, unarchiveSwimlane, permanentDeleteBoard, permanentDeleteSwimlane } = useBoardStore();
  const { selectBoard, toggleSwimlane } = useSwimlaneSelectionStore();

  const archivedTasks = useArchivedTasks();
  const archivedHabits = useArchivedHabits();
  const archivedNotes = useArchivedNotes();
  const archivedMindmaps = useArchivedMindmaps();
  const archivedBookmarks = useArchivedBookmarks();
  const archivedVisionItems = useArchivedVisionItems();

  /** Select a resource's board and swimlane, then navigate to the appropriate page */
  const selectResourceContext = useCallback((boardId: string, swimlaneId: string, route: string) => {
    selectBoard(boardId);
    toggleSwimlane(boardId, swimlaneId);
    router.push(route);
  }, [selectBoard, toggleSwimlane, router]);

  const getParentInfo = useCallback((boardId: string, swimlaneId: string) => {
    const board = boards.find((b) => b.id === boardId);
    const swimlane = swimlanes.find((s) => s.id === swimlaneId);
    if (!board) return undefined;
    return `${board.name}${swimlane ? ` / ${swimlane.name}` : ''}`;
  }, [boards, swimlanes]);

  const archivedBoards = useMemo(() => boards.filter((b) => b.archived === true), [boards]);
  const archivedSwimlanes = useMemo(() => swimlanes.filter((s) => s.archived === true), [swimlanes]);

  const query = searchQuery.toLowerCase().trim();

  const filteredBoards = useMemo(
    () => (query ? archivedBoards.filter((b) => b.name.toLowerCase().includes(query)) : archivedBoards),
    [archivedBoards, query]
  );
  const filteredSwimlanes = useMemo(
    () => (query ? archivedSwimlanes.filter((s) => s.name.toLowerCase().includes(query) || s.label?.toLowerCase().includes(query)) : archivedSwimlanes),
    [archivedSwimlanes, query]
  );
  const filteredTasks = useMemo(
    () => (query ? archivedTasks.filter((t) => t.title.toLowerCase().includes(query)) : archivedTasks),
    [archivedTasks, query]
  );
  const filteredHabits = useMemo(
    () => (query ? archivedHabits.filter((h) => h.title.toLowerCase().includes(query)) : archivedHabits),
    [archivedHabits, query]
  );
  const filteredNotes = useMemo(
    () => (query ? archivedNotes.filter((n) => n.title.toLowerCase().includes(query) || n.tags.some((t) => t.toLowerCase().includes(query))) : archivedNotes),
    [archivedNotes, query]
  );
  const filteredMindmaps = useMemo(
    () => (query ? archivedMindmaps.filter((m) => m.title.toLowerCase().includes(query)) : archivedMindmaps),
    [archivedMindmaps, query]
  );
  const filteredBookmarks = useMemo(
    () => (query ? archivedBookmarks.filter((b) => b.title.toLowerCase().includes(query) || b.url.toLowerCase().includes(query)) : archivedBookmarks),
    [archivedBookmarks, query]
  );
  const filteredVisionItems = useMemo(
    () => (query ? archivedVisionItems.filter((v) => v.title.toLowerCase().includes(query)) : archivedVisionItems),
    [archivedVisionItems, query]
  );

  const totalCount =
    filteredBoards.length +
    filteredSwimlanes.length +
    filteredTasks.length +
    filteredHabits.length +
    filteredNotes.length +
    filteredMindmaps.length +
    filteredBookmarks.length +
    filteredVisionItems.length;

  const restoreTask = (task: Task) => taskActions.put({ ...task, archived: false, archivedAt: null } as Task);
  const restoreHabit = (habit: Habit) => habitActions.put({ ...habit, archived: false, archivedAt: null } as Habit);
  const restoreNote = (note: Note) => noteActions.put({ ...note, archived: false, archivedAt: null } as Note);
  const restoreMindmap = (mindmap: Mindmap) => mindmapActions.put({ ...mindmap, archived: false, archivedAt: null } as Mindmap);
  const restoreBookmark = (bookmark: BookmarkType) => bookmarkActions.put({ ...bookmark, archived: false, archivedAt: null } as BookmarkType);
  const restoreVisionItem = (item: VisionBoardItem) => visionItemActions.put({ ...item, archived: false, archivedAt: null } as VisionBoardItem);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Archive className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Archive</h1>
        {totalCount > 0 && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {totalCount} items
          </span>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search archived items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
          <Archive className="h-12 w-12 opacity-30" />
          <p className="text-sm">{searchQuery ? 'No archived items match your search.' : 'No archived items.'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <ArchiveGroup entityType="board" count={filteredBoards.length}>
            {filteredBoards.map((board) => (
              <ArchiveItemRow
                key={board.id}
                title={board.name}
                archivedAt={board.archivedAt}
                entityType="board"
                onRestore={() => unarchiveBoard(board.id)}
                onDelete={() =>
                  setDeleteTarget({
                    name: board.name,
                    deleteFn: () => permanentDeleteBoard(board.id),
                  })
                }
              />
            ))}
          </ArchiveGroup>

          <ArchiveGroup entityType="swimlane" count={filteredSwimlanes.length}>
            {filteredSwimlanes.map((swimlane) => {
              const parentBoard = boards.find((b) => b.id === swimlane.boardId);
              return (
                <ArchiveItemRow
                  key={swimlane.id}
                  title={`${swimlane.name}${parentBoard ? ` (${parentBoard.name})` : ''}`}
                  archivedAt={swimlane.archivedAt}
                  entityType="swimlane"
                  onRestore={() => unarchiveSwimlane(swimlane.id)}
                  onDelete={() =>
                    setDeleteTarget({
                      name: swimlane.name,
                      deleteFn: () => permanentDeleteSwimlane(swimlane.id),
                    })
                  }
                />
              );
            })}
          </ArchiveGroup>

          <ArchiveGroup entityType="task" count={filteredTasks.length}>
            {filteredTasks.map((task) => (
              <ArchiveItemRow
                key={task.id}
                title={task.title}
                archivedAt={task.archivedAt}
                entityType="task"
                parentInfo={getParentInfo(task.boardId, task.swimlaneId)}
                onSelect={() => selectResourceContext(task.boardId, task.swimlaneId, '/boards')}
                onRestore={() => restoreTask(task)}
                onDelete={() =>
                  setDeleteTarget({
                    name: task.title,
                    deleteFn: () => taskActions.delete(task.id),
                  })
                }
              />
            ))}
          </ArchiveGroup>

          <ArchiveGroup entityType="habit" count={filteredHabits.length}>
            {filteredHabits.map((habit) => (
              <ArchiveItemRow
                key={habit.id}
                title={habit.title}
                archivedAt={habit.archivedAt}
                entityType="habit"
                parentInfo={getParentInfo(habit.boardId, habit.swimlaneId)}
                onSelect={() => selectResourceContext(habit.boardId, habit.swimlaneId, '/habits')}
                onRestore={() => restoreHabit(habit)}
                onDelete={() =>
                  setDeleteTarget({
                    name: habit.title,
                    deleteFn: () => habitActions.delete(habit.id),
                  })
                }
              />
            ))}
          </ArchiveGroup>

          <ArchiveGroup entityType="note" count={filteredNotes.length}>
            {filteredNotes.map((note) => (
              <ArchiveItemRow
                key={note.id}
                title={note.title}
                archivedAt={note.archivedAt}
                entityType="note"
                parentInfo={getParentInfo(note.boardId, note.swimlaneId)}
                onSelect={() => selectResourceContext(note.boardId, note.swimlaneId, '/notes')}
                onRestore={() => restoreNote(note)}
                onDelete={() =>
                  setDeleteTarget({
                    name: note.title,
                    deleteFn: () => noteActions.delete(note.id),
                  })
                }
              />
            ))}
          </ArchiveGroup>

          <ArchiveGroup entityType="mindmap" count={filteredMindmaps.length}>
            {filteredMindmaps.map((mindmap) => (
              <ArchiveItemRow
                key={mindmap.id}
                title={mindmap.title}
                archivedAt={mindmap.archivedAt}
                entityType="mindmap"
                parentInfo={getParentInfo(mindmap.boardId, mindmap.swimlaneId)}
                onSelect={() => selectResourceContext(mindmap.boardId, mindmap.swimlaneId, '/mindmap')}
                onRestore={() => restoreMindmap(mindmap)}
                onDelete={() =>
                  setDeleteTarget({
                    name: mindmap.title,
                    deleteFn: () => mindmapActions.delete(mindmap.id),
                  })
                }
              />
            ))}
          </ArchiveGroup>

          <ArchiveGroup entityType="bookmark" count={filteredBookmarks.length}>
            {filteredBookmarks.map((bookmark) => (
              <ArchiveItemRow
                key={bookmark.id}
                title={bookmark.title || bookmark.url}
                archivedAt={bookmark.archivedAt}
                entityType="bookmark"
                parentInfo={getParentInfo(bookmark.boardId, bookmark.swimlaneId)}
                onSelect={() => selectResourceContext(bookmark.boardId, bookmark.swimlaneId, '/bookmarks')}
                onRestore={() => restoreBookmark(bookmark)}
                onDelete={() =>
                  setDeleteTarget({
                    name: bookmark.title || bookmark.url,
                    deleteFn: () => bookmarkActions.delete(bookmark.id),
                  })
                }
              />
            ))}
          </ArchiveGroup>

          <ArchiveGroup entityType="visionItem" count={filteredVisionItems.length}>
            {filteredVisionItems.map((item) => (
              <ArchiveItemRow
                key={item.id}
                title={item.title}
                archivedAt={item.archivedAt}
                entityType="visionItem"
                parentInfo={getParentInfo(item.boardId, item.swimlaneId)}
                onSelect={() => selectResourceContext(item.boardId, item.swimlaneId, '/vision')}
                onRestore={() => restoreVisionItem(item)}
                onDelete={() =>
                  setDeleteTarget({
                    name: item.title,
                    deleteFn: () => visionItemActions.delete(item.id),
                  })
                }
              />
            ))}
          </ArchiveGroup>
        </div>
      )}

      <PermanentDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        itemName={deleteTarget?.name ?? ''}
        onConfirm={async () => {
          if (deleteTarget) await deleteTarget.deleteFn();
        }}
      />
    </div>
  );
}
