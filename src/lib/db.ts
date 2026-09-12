import type {
  BacklogItem,
  Habit,
  HabitLog,
  Task,
  VisionBoardItem,
  Note,
  Mindmap,
  Board,
  Swimlane,
  Bookmark,
  Routine,
  RoutineLog,
  Timeblock,
} from "@/lib/types";
import { getDatabase } from "./rxdb";
import { RxDBRepository } from "./rxdb-repository";
import { getUser } from "./auth/service";
import { markLocalChange } from "./supabase-replication";
import { queueSync } from "@/stores/sync-store";

async function getRepo(userId: string): Promise<RxDBRepository | null> {
  if (typeof window === "undefined") return null;
  const db = await getDatabase(userId);
  return new RxDBRepository(db, userId);
}

function getUserId(): string {
  const user = getUser();
  if (!user) {
    throw new Error("User must be authenticated to access database");
  }
  return user.id;
}

function markChanged(userId: string): void {
  if (typeof window === "undefined") return;
  markLocalChange(userId);
  queueSync();
}

async function withRepoRead<T>(
  fallback: T,
  fn: (repo: RxDBRepository, userId: string) => Promise<T>
): Promise<T> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return fallback;
  return fn(r, userId);
}

async function withRepoAction(
  fn: (repo: RxDBRepository, userId: string) => Promise<unknown>
): Promise<void> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return;
  await fn(r, userId);
  markChanged(userId);
}

async function withRepoMutationResult<T>(
  fn: (repo: RxDBRepository, userId: string) => Promise<T>
): Promise<T | undefined> {
  const userId = getUserId();
  const r = await getRepo(userId);
  if (!r) return undefined;
  const result = await fn(r, userId);
  markChanged(userId);
  return result;
}

// --- Tasks ---

export async function getTasksByBoard(boardId: string): Promise<Task[]> {
  return withRepoRead([], (r) => r.getTasksByBoard(boardId));
}

export async function getTasksBySwimlane(swimlaneId: string): Promise<Task[]> {
  return withRepoRead([], (r) => r.getTasksBySwimlane(swimlaneId));
}

export async function putTask(task: Task): Promise<void> {
  return withRepoAction((r) => r.putTask(task));
}

export async function putTasks(tasks: Task[]): Promise<void> {
  if (tasks.length === 0) return;
  return withRepoAction((r) => r.putTasks(tasks));
}

export async function deleteTask(taskId: string): Promise<void> {
  return withRepoAction((r) => r.deleteTask(taskId));
}

export async function getAllTasks(): Promise<Task[]> {
  return withRepoRead([], (r) => r.getAllTasks());
}

// --- Backlog ---

export async function getBacklogBySwimlane(swimlaneId: string): Promise<BacklogItem[]> {
  return withRepoRead([], (r) => r.getBacklogBySwimlane(swimlaneId));
}

export async function getBacklogCountsBySwimlane(swimlaneIds: string[]): Promise<Record<string, number>> {
  return withRepoRead(
    Object.fromEntries(swimlaneIds.map((id) => [id, 0])),
    (r) => r.getBacklogCountsBySwimlane(swimlaneIds)
  );
}

export async function putBacklogItem(item: BacklogItem): Promise<void> {
  return withRepoAction((r) => r.putBacklogItem(item));
}

export async function deleteBacklogItem(itemId: string): Promise<void> {
  return withRepoAction((r) => r.deleteBacklogItem(itemId));
}

export async function getAllBacklogItems(): Promise<BacklogItem[]> {
  return withRepoRead([], (r) => r.getAllBacklogItems());
}

// --- Habits ---

export async function getHabitsByBoard(boardId: string): Promise<Habit[]> {
  return withRepoRead([], (r) => r.getHabitsByBoard(boardId));
}

export async function getHabitsBySwimlane(swimlaneId: string): Promise<Habit[]> {
  return withRepoRead([], (r) => r.getHabitsBySwimlane(swimlaneId));
}

export async function putHabit(habit: Habit): Promise<void> {
  return withRepoAction((r) => r.putHabit(habit));
}

export async function deleteHabit(habitId: string): Promise<void> {
  return withRepoAction((r) => r.deleteHabit(habitId));
}

export async function getHabitLogsByHabit(habitId: string): Promise<HabitLog[]> {
  return withRepoRead([], (r) => r.getHabitLogsByHabit(habitId));
}

export async function putHabitLog(log: HabitLog): Promise<void> {
  return withRepoAction((r) => r.putHabitLog(log));
}

export async function deleteHabitLog(logId: string): Promise<void> {
  return withRepoAction((r) => r.deleteHabitLog(logId));
}

export async function getAllHabitLogs(): Promise<HabitLog[]> {
  return withRepoRead([], (r) => r.getAllHabitLogs());
}

// --- Whiteboard / Vision ---

export async function getVisionItemsByBoard(boardId: string): Promise<VisionBoardItem[]> {
  return withRepoRead([], (r) => r.getVisionItemsByBoard(boardId));
}

export async function getVisionItemsBySwimlane(swimlaneId: string): Promise<VisionBoardItem[]> {
  return withRepoRead([], (r) => r.getVisionItemsBySwimlane(swimlaneId));
}

export async function getAllVisionItems(): Promise<VisionBoardItem[]> {
  return withRepoRead([], (r) => r.getAllVisionItems());
}

export async function putVisionItem(item: Partial<VisionBoardItem>): Promise<void> {
  return withRepoAction((r) => r.putVisionItem(item));
}

export async function deleteVisionItem(itemId: string): Promise<void> {
  return withRepoAction((r) => r.deleteVisionItem(itemId));
}

// --- Notes ---

export async function getNotesByBoard(boardId: string): Promise<Note[]> {
  return withRepoRead([], (r) => r.getNotesByBoard(boardId));
}

export async function getNotesBySwimlane(swimlaneId: string): Promise<Note[]> {
  return withRepoRead([], (r) => r.getNotesBySwimlane(swimlaneId));
}

export async function getAllNotes(): Promise<Note[]> {
  return withRepoRead([], (r) => r.getAllNotes());
}

export async function putNote(note: Partial<Note>): Promise<void> {
  return withRepoAction((r) => r.putNote(note));
}

export async function deleteNote(noteId: string): Promise<void> {
  return withRepoAction((r) => r.deleteNote(noteId));
}

// --- Bookmarks ---

export async function getBookmarksByBoard(boardId: string): Promise<Bookmark[]> {
  return withRepoRead([], (r) => r.getBookmarksByBoard(boardId));
}

export async function getBookmarksBySwimlane(swimlaneId: string): Promise<Bookmark[]> {
  return withRepoRead([], (r) => r.getBookmarksBySwimlane(swimlaneId));
}

export async function getAllBookmarks(): Promise<Bookmark[]> {
  return withRepoRead([], (r) => r.getAllBookmarks());
}

export async function putBookmark(bookmark: Partial<Bookmark>): Promise<void> {
  return withRepoAction((r) => r.putBookmark(bookmark));
}

export async function deleteBookmark(bookmarkId: string): Promise<void> {
  return withRepoAction((r) => r.deleteBookmark(bookmarkId));
}

// --- Mindmaps ---

export async function getMindmapsByBoard(boardId: string): Promise<Mindmap[]> {
  return withRepoRead([], (r) => r.getMindmapsByBoard(boardId));
}

export async function getMindmapsBySwimlane(swimlaneId: string): Promise<Mindmap[]> {
  return withRepoRead([], (r) => r.getMindmapsBySwimlane(swimlaneId));
}

export async function getAllMindmaps(): Promise<Mindmap[]> {
  return withRepoRead([], (r) => r.getAllMindmaps());
}

export async function putMindmap(mindmap: Partial<Mindmap>): Promise<void> {
  return withRepoAction((r) => r.putMindmap(mindmap));
}

export async function deleteMindmap(mindmapId: string): Promise<void> {
  return withRepoAction((r) => r.deleteMindmap(mindmapId));
}

// --- Boards ---

export async function getAllBoards(): Promise<Board[]> {
  return withRepoRead([], (r) => r.getAllBoards());
}

export async function getBoardById(boardId: string): Promise<Board | null> {
  return withRepoRead(null, (r) => r.getBoardById(boardId));
}

export async function putBoard(board: Partial<Board>): Promise<Board | void> {
  return withRepoMutationResult((r) => r.putBoard(board));
}

export async function deleteBoard(boardId: string): Promise<void> {
  return withRepoAction((r) => r.deleteBoard(boardId));
}

// --- Swimlanes ---

export async function getSwimlanesByBoard(boardId: string): Promise<Swimlane[]> {
  return withRepoRead([], (r) => r.getSwimlanesByBoard(boardId));
}

export async function getSwimlaneById(swimlaneId: string): Promise<Swimlane | null> {
  return withRepoRead(null, (r) => r.getSwimlaneById(swimlaneId));
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
  return withRepoAction((r) => r.deleteSwimlane(swimlaneId));
}

// --- Archive Operations ---

export async function archiveBoard(boardId: string): Promise<void> {
  return withRepoAction((r) => r.archiveBoard(boardId));
}

export async function archiveSwimlane(swimlaneId: string): Promise<void> {
  return withRepoAction((r) => r.archiveSwimlane(swimlaneId));
}

export async function unarchiveBoard(boardId: string): Promise<void> {
  return withRepoAction((r) => r.unarchiveBoard(boardId));
}

export async function unarchiveSwimlane(swimlaneId: string): Promise<void> {
  return withRepoAction((r) => r.unarchiveSwimlane(swimlaneId));
}

export async function permanentDeleteBoard(boardId: string): Promise<void> {
  return withRepoAction((r) => r.permanentDeleteBoard(boardId));
}

export async function permanentDeleteSwimlane(swimlaneId: string): Promise<void> {
  return withRepoAction((r) => r.permanentDeleteSwimlane(swimlaneId));
}

// --- Routines ---

export async function getAllRoutines(): Promise<Routine[]> {
  return withRepoRead([], (r) => r.getAllRoutines());
}

export async function getRoutinesBySwimlane(swimlaneId: string): Promise<Routine[]> {
  return withRepoRead([], (r) => r.getRoutinesBySwimlane(swimlaneId));
}

export async function putRoutine(routine: Partial<Routine>): Promise<Routine | void> {
  return withRepoMutationResult((r) => r.putRoutine(routine));
}

export async function deleteRoutine(routineId: string): Promise<void> {
  return withRepoAction((r) => r.deleteRoutine(routineId));
}

export async function archiveRoutine(routineId: string): Promise<void> {
  return withRepoAction((r) => r.archiveRoutine(routineId));
}

// --- RoutineLogs ---

export async function putRoutineLog(log: Partial<RoutineLog>): Promise<RoutineLog | void> {
  return withRepoMutationResult((r) => r.putRoutineLog(log));
}

export async function deleteRoutineLog(logId: string): Promise<void> {
  return withRepoAction((r) => r.deleteRoutineLog(logId));
}

export async function getRoutineLogsByRoutine(routineId: string): Promise<RoutineLog[]> {
  return withRepoRead([], (r) => r.getRoutineLogsByRoutine(routineId));
}

export async function getAllRoutineLogs(): Promise<RoutineLog[]> {
  return withRepoRead([], (r) => r.getAllRoutineLogs());
}

// --- Timeblocks ---

export async function getAllTimeblocks(): Promise<Timeblock[]> {
  return withRepoRead([], (r) => r.getAllTimeblocks());
}

export async function getTimeblocksBySwimlane(swimlaneId: string): Promise<Timeblock[]> {
  return withRepoRead([], (r) => r.getTimeblocksBySwimlane(swimlaneId));
}

export async function getHabitsByTimeblock(timeblockId: string): Promise<Habit[]> {
  return withRepoRead([], (r) => r.getHabitsByTimeblock(timeblockId));
}

export async function getRoutinesByTimeblock(timeblockId: string): Promise<Routine[]> {
  return withRepoRead([], (r) => r.getRoutinesByTimeblock(timeblockId));
}

export async function putTimeblock(timeblock: Partial<Timeblock>): Promise<Timeblock | void> {
  return withRepoMutationResult((r) => r.putTimeblock(timeblock));
}

export async function deleteTimeblock(timeblockId: string): Promise<void> {
  return withRepoAction((r) => r.deleteTimeblock(timeblockId));
}

export async function archiveTimeblock(timeblockId: string): Promise<void> {
  return withRepoAction((r) => r.archiveTimeblock(timeblockId));
}

export async function unarchiveTimeblock(timeblockId: string): Promise<void> {
  return withRepoAction((r) => r.unarchiveTimeblock(timeblockId));
}

export async function permanentDeleteTimeblock(timeblockId: string): Promise<void> {
  return withRepoAction((r) => r.permanentDeleteTimeblock(timeblockId));
}

export async function detachFromTimeblock(timeblockId: string): Promise<void> {
  return withRepoAction((r) => r.detachFromTimeblock(timeblockId));
}
