import type { BacklogItem, Habit, HabitLog, Task, VisionBoardItem, Note, Mindmap, Board, Swimlane, Bookmark, Routine, RoutineLog, Timeblock } from "@/lib/types";
import { getDatabase } from "./rxdb";
import { RxDBRepository } from "./rxdb-repository";
import { getUser } from "./auth/service";
import { markLocalChange } from "./supabase-replication";
import { queueSync } from "@/stores/sync-store";

async function getRepo(userId: string) {
  if (typeof window === "undefined") return null;
  const db = await getDatabase(userId);
  return new RxDBRepository(db, userId);
}

function getUserId(): string {
  const user = getUser();
  if (!user) {
    throw new Error('User must be authenticated to access database');
  }
  return user.id;
}

function markChanged(userId: string): void {
  if (typeof window === "undefined") return;
  markLocalChange(userId);
  queueSync();
}

export async function getTasksByBoard(boardId: string): Promise<Task[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getTasksByBoard(boardId);
}

export async function getTasksBySwimlane(swimlaneId: string): Promise<Task[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getTasksBySwimlane(swimlaneId);
}

export async function putTask(task: Task): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.putTask(task);
  markChanged(userId);
}

export async function putTasks(tasks: Task[]): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r || tasks.length === 0) return;
  await r.putTasks(tasks);
  markChanged(userId);
}

export async function deleteTask(taskId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.deleteTask(taskId);
  markChanged(userId);
}

export async function getAllTasks(): Promise<Task[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getAllTasks();
}

export async function getBacklogBySwimlane(swimlaneId: string): Promise<BacklogItem[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getBacklogBySwimlane(swimlaneId);
}

export async function getBacklogCountsBySwimlane(swimlaneIds: string[]): Promise<Record<string, number>> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return Object.fromEntries(swimlaneIds.map((id) => [id, 0]));
  return r.getBacklogCountsBySwimlane(swimlaneIds);
}

export async function putBacklogItem(item: BacklogItem): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.putBacklogItem(item);
  markChanged(userId);
}

export async function deleteBacklogItem(itemId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.deleteBacklogItem(itemId);
  markChanged(userId);
}

export async function getAllBacklogItems(): Promise<BacklogItem[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getAllBacklogItems();
}

export async function getHabitsByBoard(boardId: string): Promise<Habit[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getHabitsByBoard(boardId);
}

export async function getHabitsBySwimlane(swimlaneId: string): Promise<Habit[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getHabitsBySwimlane(swimlaneId);
}

export async function putHabit(habit: Habit): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.putHabit(habit);
  markChanged(userId);
}

export async function deleteHabit(habitId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.deleteHabit(habitId);
  markChanged(userId);
}

export async function getHabitLogsByHabit(habitId: string): Promise<HabitLog[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getHabitLogsByHabit(habitId);
}

export async function putHabitLog(log: HabitLog): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.putHabitLog(log);
  markChanged(userId);
}

export async function deleteHabitLog(logId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.deleteHabitLog(logId);
  markChanged(userId);
}

export async function getAllHabitLogs(): Promise<HabitLog[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getAllHabitLogs();
}

// --- Whiteboard ---

export async function getVisionItemsByBoard(boardId: string): Promise<VisionBoardItem[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getVisionItemsByBoard(boardId);
}

export async function getVisionItemsBySwimlane(swimlaneId: string): Promise<VisionBoardItem[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getVisionItemsBySwimlane(swimlaneId);
}

export async function getAllVisionItems(): Promise<VisionBoardItem[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getAllVisionItems();
}

export async function putVisionItem(item: Partial<VisionBoardItem>): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.putVisionItem(item);
  markChanged(userId);
}

export async function deleteVisionItem(itemId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.deleteVisionItem(itemId);
  markChanged(userId);
}

// --- Notes ---

export async function getNotesByBoard(boardId: string): Promise<Note[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getNotesByBoard(boardId);
}

export async function getNotesBySwimlane(swimlaneId: string): Promise<Note[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getNotesBySwimlane(swimlaneId);
}

export async function getAllNotes(): Promise<Note[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getAllNotes();
}

export async function putNote(note: Partial<Note>): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.putNote(note);
  markChanged(userId);
}

export async function deleteNote(noteId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.deleteNote(noteId);
  markChanged(userId);
}

// --- Bookmarks ---

export async function getBookmarksByBoard(boardId: string): Promise<Bookmark[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getBookmarksByBoard(boardId);
}

export async function getBookmarksBySwimlane(swimlaneId: string): Promise<Bookmark[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getBookmarksBySwimlane(swimlaneId);
}

export async function getAllBookmarks(): Promise<Bookmark[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getAllBookmarks();
}

export async function putBookmark(bookmark: Partial<Bookmark>): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.putBookmark(bookmark);
  markChanged(userId);
}

export async function deleteBookmark(bookmarkId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.deleteBookmark(bookmarkId);
  markChanged(userId);
}

// --- Mindmaps ---

export async function getMindmapsByBoard(boardId: string): Promise<Mindmap[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getMindmapsByBoard(boardId);
}

export async function getMindmapsBySwimlane(swimlaneId: string): Promise<Mindmap[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getMindmapsBySwimlane(swimlaneId);
}

export async function getAllMindmaps(): Promise<Mindmap[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getAllMindmaps();
}

export async function putMindmap(mindmap: Partial<Mindmap>): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.putMindmap(mindmap);
  markChanged(userId);
}

export async function deleteMindmap(mindmapId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.deleteMindmap(mindmapId);
  markChanged(userId);
}

// --- Boards ---

export async function getAllBoards(): Promise<Board[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getAllBoards();
}

export async function getBoardById(boardId: string): Promise<Board | null> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return null;
  return r.getBoardById(boardId);
}

export async function putBoard(board: Partial<Board>): Promise<Board | void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  const result = await r.putBoard(board);
  markChanged(userId);
  return result;
}

export async function deleteBoard(boardId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.deleteBoard(boardId);
  markChanged(userId);
}

// --- Swimlanes ---

export async function getSwimlanesByBoard(boardId: string): Promise<Swimlane[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getSwimlanesByBoard(boardId);
}

export async function getSwimlaneById(swimlaneId: string): Promise<Swimlane | null> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return null;
  return r.getSwimlaneById(swimlaneId);
}

export async function putSwimlane(swimlane: Partial<Swimlane>): Promise<Swimlane> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) throw new Error("Repository not available");
  const result = await r.putSwimlane(swimlane);
  markChanged(userId);
  return result;
}

export async function deleteSwimlane(swimlaneId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.deleteSwimlane(swimlaneId);
  markChanged(userId);
}

// --- Archive Operations ---

export async function archiveBoard(boardId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.archiveBoard(boardId);
  markChanged(userId);
}

export async function archiveSwimlane(swimlaneId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.archiveSwimlane(swimlaneId);
  markChanged(userId);
}

export async function unarchiveBoard(boardId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.unarchiveBoard(boardId);
  markChanged(userId);
}

export async function unarchiveSwimlane(swimlaneId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.unarchiveSwimlane(swimlaneId);
  markChanged(userId);
}

export async function permanentDeleteBoard(boardId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.permanentDeleteBoard(boardId);
  markChanged(userId);
}

export async function permanentDeleteSwimlane(swimlaneId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.permanentDeleteSwimlane(swimlaneId);
  markChanged(userId);
}

// --- Routines ---

export async function getAllRoutines(): Promise<Routine[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getAllRoutines();
}

export async function getRoutinesBySwimlane(swimlaneId: string): Promise<Routine[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getRoutinesBySwimlane(swimlaneId);
}

export async function putRoutine(routine: Partial<Routine>): Promise<Routine | void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  const result = await r.putRoutine(routine);
  markChanged(userId);
  return result;
}

export async function deleteRoutine(routineId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.deleteRoutine(routineId);
  markChanged(userId);
}

export async function archiveRoutine(routineId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.archiveRoutine(routineId);
  markChanged(userId);
}

// --- RoutineLogs ---

export async function putRoutineLog(log: Partial<RoutineLog>): Promise<RoutineLog | void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  const result = await r.putRoutineLog(log);
  markChanged(userId);
  return result;
}

export async function deleteRoutineLog(logId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.deleteRoutineLog(logId);
  markChanged(userId);
}

export async function getRoutineLogsByRoutine(routineId: string): Promise<RoutineLog[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getRoutineLogsByRoutine(routineId);
}

export async function getAllRoutineLogs(): Promise<RoutineLog[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getAllRoutineLogs();
}

// --- Timeblocks ---

export async function getAllTimeblocks(): Promise<Timeblock[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getAllTimeblocks();
}

export async function getTimeblocksBySwimlane(swimlaneId: string): Promise<Timeblock[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getTimeblocksBySwimlane(swimlaneId);
}

export async function getHabitsByTimeblock(timeblockId: string): Promise<Habit[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getHabitsByTimeblock(timeblockId);
}

export async function getRoutinesByTimeblock(timeblockId: string): Promise<Routine[]> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return [];
  return r.getRoutinesByTimeblock(timeblockId);
}

export async function putTimeblock(timeblock: Partial<Timeblock>): Promise<Timeblock | void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  const result = await r.putTimeblock(timeblock);
  markChanged(userId);
  return result;
}

export async function deleteTimeblock(timeblockId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.deleteTimeblock(timeblockId);
  markChanged(userId);
}

export async function archiveTimeblock(timeblockId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.archiveTimeblock(timeblockId);
  markChanged(userId);
}

export async function unarchiveTimeblock(timeblockId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.unarchiveTimeblock(timeblockId);
  markChanged(userId);
}

export async function permanentDeleteTimeblock(timeblockId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.permanentDeleteTimeblock(timeblockId);
  markChanged(userId);
}

export async function detachFromTimeblock(timeblockId: string): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await r.detachFromTimeblock(timeblockId);
  markChanged(userId);
}
