/**
 * Unit tests for src/lib/db.ts
 *
 * db.ts is a thin wrapper that:
 *  1. Gets the current user via getUser()
 *  2. Opens the RxDB database via getDatabase(userId)
 *  3. Delegates to RxDBRepository methods
 *  4. For mutations: calls markLocalChange(userId) + queueSync()
 *
 * Strategy: mock all external dependencies, verify the delegation pattern
 * and that markLocalChange/queueSync are called on writes but not reads.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── hoisted mocks ─────────────────────────────────────────────────────────────

const mockRepoMethods = vi.hoisted(() => ({
  getTasksByBoard: vi.fn().mockResolvedValue([]),
  getAllTasks: vi.fn().mockResolvedValue([]),
  putTask: vi.fn().mockResolvedValue(undefined),
  deleteTask: vi.fn().mockResolvedValue(undefined),
  getHabitsByBoard: vi.fn().mockResolvedValue([]),
  getAllHabitLogs: vi.fn().mockResolvedValue([]),
  putHabit: vi.fn().mockResolvedValue(undefined),
  deleteHabit: vi.fn().mockResolvedValue(undefined),
  putHabitLog: vi.fn().mockResolvedValue(undefined),
  deleteHabitLog: vi.fn().mockResolvedValue(undefined),
  getAllNotes: vi.fn().mockResolvedValue([]),
  getNotesByBoard: vi.fn().mockResolvedValue([]),
  putNote: vi.fn().mockResolvedValue(undefined),
  deleteNote: vi.fn().mockResolvedValue(undefined),
  getAllBoards: vi.fn().mockResolvedValue([]),
  getBoardById: vi.fn().mockResolvedValue(null),
  putBoard: vi.fn().mockResolvedValue(undefined),
  deleteBoard: vi.fn().mockResolvedValue(undefined),
  getSwimlanesByBoard: vi.fn().mockResolvedValue([]),
  getSwimlaneById: vi.fn().mockResolvedValue(null),
  putSwimlane: vi.fn().mockResolvedValue(undefined),
  deleteSwimlane: vi.fn().mockResolvedValue(undefined),
  archiveBoard: vi.fn().mockResolvedValue(undefined),
  unarchiveBoard: vi.fn().mockResolvedValue(undefined),
  archiveSwimlane: vi.fn().mockResolvedValue(undefined),
  unarchiveSwimlane: vi.fn().mockResolvedValue(undefined),
  permanentDeleteBoard: vi.fn().mockResolvedValue(undefined),
  permanentDeleteSwimlane: vi.fn().mockResolvedValue(undefined),
  getAllBookmarks: vi.fn().mockResolvedValue([]),
  putBookmark: vi.fn().mockResolvedValue(undefined),
  deleteBookmark: vi.fn().mockResolvedValue(undefined),
  getAllMindmaps: vi.fn().mockResolvedValue([]),
  putMindmap: vi.fn().mockResolvedValue(undefined),
  deleteMindmap: vi.fn().mockResolvedValue(undefined),
  getAllVisionItems: vi.fn().mockResolvedValue([]),
  putVisionItem: vi.fn().mockResolvedValue(undefined),
  deleteVisionItem: vi.fn().mockResolvedValue(undefined),
  getAllRoutines: vi.fn().mockResolvedValue([]),
  putRoutine: vi.fn().mockResolvedValue(undefined),
  deleteRoutine: vi.fn().mockResolvedValue(undefined),
  archiveRoutine: vi.fn().mockResolvedValue(undefined),
  getAllRoutineLogs: vi.fn().mockResolvedValue([]),
  putRoutineLog: vi.fn().mockResolvedValue(undefined),
  deleteRoutineLog: vi.fn().mockResolvedValue(undefined),
  getRoutineLogsByRoutine: vi.fn().mockResolvedValue([]),
  getBacklogBySwimlane: vi.fn().mockResolvedValue([]),
  getAllBacklogItems: vi.fn().mockResolvedValue([]),
  putBacklogItem: vi.fn().mockResolvedValue(undefined),
  deleteBacklogItem: vi.fn().mockResolvedValue(undefined),
  getHabitLogsByHabit: vi.fn().mockResolvedValue([]),
  getHabitsBySwimlane: vi.fn().mockResolvedValue([]),
  getMindmapsByBoard: vi.fn().mockResolvedValue([]),
  getMindmapsBySwimlane: vi.fn().mockResolvedValue([]),
  getBookmarksByBoard: vi.fn().mockResolvedValue([]),
  getBookmarksBySwimlane: vi.fn().mockResolvedValue([]),
  getVisionItemsByBoard: vi.fn().mockResolvedValue([]),
  getVisionItemsBySwimlane: vi.fn().mockResolvedValue([]),
  getNotesBySwimlane: vi.fn().mockResolvedValue([]),
}));

const mockGetUser = vi.hoisted(() => vi.fn());
const mockGetDatabase = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockMarkLocalChange = vi.hoisted(() => vi.fn());
const mockQueueSync = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/service', () => ({ getUser: mockGetUser }));
vi.mock('@/lib/rxdb', () => ({ getDatabase: mockGetDatabase }));
vi.mock('@/lib/rxdb-repository', () => ({
  // Must use a regular function (not arrow) so `new RxDBRepository()` works
  RxDBRepository: vi.fn().mockImplementation(function() {
    return mockRepoMethods;
  }),
}));
vi.mock('@/lib/supabase-replication', () => ({ markLocalChange: mockMarkLocalChange }));
vi.mock('@/stores/sync-store', () => ({ queueSync: mockQueueSync }));

import {
  getTasksByBoard,
  putTask,
  deleteTask,
  getAllTasks,
  putHabit,
  deleteHabit,
  getAllNotes,
  putNote,
  deleteNote,
  putBoard,
  deleteBoard,
  getAllBoards,
  putSwimlane,
  deleteSwimlane,
} from '../db';
import { makeTask, makeHabit, makeNote, makeBoard, makeSwimlane } from '@/test/factories';

const TEST_USER = { id: 'db-test-user-id' };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockReturnValue(TEST_USER);
});

// ── Authentication guard ───────────────────────────────────────────────────────

describe('authentication guard', () => {
  it('throws when no user is authenticated', async () => {
    mockGetUser.mockReturnValue(null);
    await expect(getTasksByBoard('board-1')).rejects.toThrow(
      'User must be authenticated',
    );
  });
});

// ── Read functions (no markLocalChange / queueSync) ───────────────────────────

describe('read operations', () => {
  it('getTasksByBoard: delegates to repo and does not call markChanged', async () => {
    const tasks = [makeTask()];
    mockRepoMethods.getTasksByBoard.mockResolvedValue(tasks);

    const result = await getTasksByBoard('board-1');

    expect(mockRepoMethods.getTasksByBoard).toHaveBeenCalledWith('board-1');
    expect(result).toEqual(tasks);
    expect(mockMarkLocalChange).not.toHaveBeenCalled();
    expect(mockQueueSync).not.toHaveBeenCalled();
  });

  it('getAllTasks: delegates to repo and does not mark sync', async () => {
    await getAllTasks();
    expect(mockRepoMethods.getAllTasks).toHaveBeenCalled();
    expect(mockMarkLocalChange).not.toHaveBeenCalled();
  });

  it('getAllNotes: delegates to repo and does not mark sync', async () => {
    await getAllNotes();
    expect(mockRepoMethods.getAllNotes).toHaveBeenCalled();
    expect(mockMarkLocalChange).not.toHaveBeenCalled();
  });

  it('getAllBoards: delegates to repo and does not mark sync', async () => {
    await getAllBoards();
    expect(mockRepoMethods.getAllBoards).toHaveBeenCalled();
    expect(mockMarkLocalChange).not.toHaveBeenCalled();
  });
});

// ── Write functions (call markLocalChange + queueSync) ────────────────────────

describe('write operations', () => {
  it('putTask: delegates to repo and marks sync', async () => {
    const task = makeTask();
    await putTask(task);

    expect(mockRepoMethods.putTask).toHaveBeenCalledWith(task);
    expect(mockMarkLocalChange).toHaveBeenCalledWith(TEST_USER.id);
    expect(mockQueueSync).toHaveBeenCalled();
  });

  it('deleteTask: delegates to repo and marks sync', async () => {
    await deleteTask('task-1');

    expect(mockRepoMethods.deleteTask).toHaveBeenCalledWith('task-1');
    expect(mockMarkLocalChange).toHaveBeenCalledWith(TEST_USER.id);
    expect(mockQueueSync).toHaveBeenCalled();
  });

  it('putHabit: delegates to repo and marks sync', async () => {
    const habit = makeHabit();
    await putHabit(habit);

    expect(mockRepoMethods.putHabit).toHaveBeenCalledWith(habit);
    expect(mockMarkLocalChange).toHaveBeenCalledWith(TEST_USER.id);
    expect(mockQueueSync).toHaveBeenCalled();
  });

  it('deleteHabit: delegates to repo and marks sync', async () => {
    await deleteHabit('habit-1');

    expect(mockRepoMethods.deleteHabit).toHaveBeenCalledWith('habit-1');
    expect(mockMarkLocalChange).toHaveBeenCalledWith(TEST_USER.id);
    expect(mockQueueSync).toHaveBeenCalled();
  });

  it('putNote: delegates to repo and marks sync', async () => {
    const note = makeNote();
    await putNote(note);

    expect(mockRepoMethods.putNote).toHaveBeenCalledWith(note);
    expect(mockMarkLocalChange).toHaveBeenCalledWith(TEST_USER.id);
    expect(mockQueueSync).toHaveBeenCalled();
  });

  it('deleteNote: delegates to repo and marks sync', async () => {
    await deleteNote('note-1');

    expect(mockRepoMethods.deleteNote).toHaveBeenCalledWith('note-1');
    expect(mockMarkLocalChange).toHaveBeenCalledWith(TEST_USER.id);
    expect(mockQueueSync).toHaveBeenCalled();
  });

  it('putBoard: delegates to repo and marks sync', async () => {
    const board = makeBoard();
    await putBoard(board);

    expect(mockRepoMethods.putBoard).toHaveBeenCalledWith(board);
    expect(mockMarkLocalChange).toHaveBeenCalledWith(TEST_USER.id);
    expect(mockQueueSync).toHaveBeenCalled();
  });

  it('deleteBoard: delegates to repo and marks sync', async () => {
    await deleteBoard('board-1');

    expect(mockRepoMethods.deleteBoard).toHaveBeenCalledWith('board-1');
    expect(mockMarkLocalChange).toHaveBeenCalledWith(TEST_USER.id);
    expect(mockQueueSync).toHaveBeenCalled();
  });

  it('putSwimlane: delegates to repo and marks sync', async () => {
    const swimlane = makeSwimlane();
    await putSwimlane(swimlane);

    expect(mockRepoMethods.putSwimlane).toHaveBeenCalledWith(swimlane);
    expect(mockMarkLocalChange).toHaveBeenCalledWith(TEST_USER.id);
    expect(mockQueueSync).toHaveBeenCalled();
  });

  it('deleteSwimlane: delegates to repo and marks sync', async () => {
    await deleteSwimlane('sl-1');

    expect(mockRepoMethods.deleteSwimlane).toHaveBeenCalledWith('sl-1');
    expect(mockMarkLocalChange).toHaveBeenCalledWith(TEST_USER.id);
    expect(mockQueueSync).toHaveBeenCalled();
  });
});
