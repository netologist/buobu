/**
 * Integration-unit tests for RxDBRepository.
 *
 * Uses createTestDb() / destroyTestDb() from the test helpers which spin up
 * an isolated in-memory RxDB instance backed by fake-indexeddb.
 * Each test gets a fresh, empty database — no cross-test state leakage.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RxDBRepository } from '../rxdb-repository';
import { createTestDb, destroyTestDb } from '@/test/helpers/rxdb';
import { makeTask, makeBoard, makeSwimlane, makeHabit, makeNote, makeBookmark } from '@/test/factories';
import type { Database } from '@/lib/rxdb';

const USER_ID = 'repo-test-user';

let db: Database;
let repo: RxDBRepository;

beforeEach(async () => {
  db = await createTestDb();
  repo = new RxDBRepository(db, USER_ID);
});

afterEach(async () => {
  // db.remove() deletes all fake-indexeddb data for this database name,
  // giving the next test a truly empty database (closeDatabase alone does not).
  try { await db.remove(); } catch { /* ignore if already closed */ }
  await destroyTestDb(db);
});

// ── Tasks ─────────────────────────────────────────────────────────────────────

describe('Task CRUD', () => {
  it('putTask: creates a new task and returns it', async () => {
    const input = makeTask({ title: 'New Task', boardId: 'b1', columnId: 'c1', swimlaneId: 's1' });
    const result = await repo.putTask(input);

    expect(result.id).toBeTruthy();
    expect(result.title).toBe('New Task');
    expect(result._deleted).toBe(false);
    expect(result.user_id).toBe(USER_ID);
  });

  it('putTask: updates existing task when id already exists', async () => {
    await repo.putTask(makeTask({ id: 'task-xyz', title: 'Original' }));
    await repo.putTask({ id: 'task-xyz', title: 'Updated' });

    // Re-fetch to get the latest state (patch() mutates the DB doc in-place
    // but the returned toMutableJSON() snapshot may still be pre-patch)
    const all = await repo.getAllTasks();
    const updated = all.find(t => t.id === 'task-xyz')!;
    expect(updated.title).toBe('Updated');
    expect(updated._version).toBeGreaterThan(1);
  });

  it('deleteTask: soft-deletes (sets _deleted: true)', async () => {
    await repo.putTask(makeTask({ id: 'task-del' }));

    await repo.deleteTask('task-del');

    // getAllTasks only returns non-deleted items, so it should be absent
    const tasks = await repo.getAllTasks();
    expect(tasks.find(t => t.id === 'task-del')).toBeUndefined();
  });

  it('getTasksByBoard: returns only non-deleted tasks for the given board', async () => {
    await repo.putTask(makeTask({ id: 't-b1-1', boardId: 'board-A' }));
    await repo.putTask(makeTask({ id: 't-b1-2', boardId: 'board-A' }));
    await repo.putTask(makeTask({ id: 't-b2',   boardId: 'board-B' }));

    const result = await repo.getTasksByBoard('board-A');

    expect(result).toHaveLength(2);
    expect(result.every(t => t.boardId === 'board-A')).toBe(true);
  });

  it('getAllTasks: excludes deleted tasks', async () => {
    await repo.putTask(makeTask({ id: 't-alive' }));
    await repo.putTask(makeTask({ id: 't-dead' }));
    await repo.deleteTask('t-dead');

    const result = await repo.getAllTasks();
    expect(result.map(t => t.id)).toContain('t-alive');
    expect(result.map(t => t.id)).not.toContain('t-dead');
  });
});

// ── Boards ────────────────────────────────────────────────────────────────────

describe('Board CRUD', () => {
  it('putBoard: creates and returns a board', async () => {
    const b = makeBoard({ id: 'board-1', name: 'Test Board' });
    const result = await repo.putBoard(b);

    expect(result.id).toBe('board-1');
    expect(result.name).toBe('Test Board');
    expect(result._deleted).toBe(false);
  });

  it('putBoard: updates existing board', async () => {
    await repo.putBoard(makeBoard({ id: 'board-1', name: 'Old Name' }));
    await repo.putBoard({ id: 'board-1', name: 'New Name' });

    const result = await repo.getBoardById('board-1');
    expect(result?.name).toBe('New Name');
  });

  it('deleteBoard: throws when deleting the last board', async () => {
    await repo.putBoard(makeBoard({ id: 'only-board' }));

    await expect(repo.deleteBoard('only-board')).rejects.toThrow(
      'Cannot delete the last board',
    );
  });

  it('deleteBoard: soft-deletes when multiple boards exist', async () => {
    await repo.putBoard(makeBoard({ id: 'b1' }));
    await repo.putBoard(makeBoard({ id: 'b2' }));

    await repo.deleteBoard('b1');

    const boards = await repo.getAllBoards();
    expect(boards.find(b => b.id === 'b1')).toBeUndefined();
    expect(boards.find(b => b.id === 'b2')).toBeDefined();
  });

  it('getAllBoards: sorts by order ascending', async () => {
    await repo.putBoard(makeBoard({ id: 'b-order-2', order: 2 }));
    await repo.putBoard(makeBoard({ id: 'b-order-1', order: 1 }));
    await repo.putBoard(makeBoard({ id: 'b-order-0', order: 0 }));

    const boards = await repo.getAllBoards();
    expect(boards.map(b => b.id)).toEqual(['b-order-0', 'b-order-1', 'b-order-2']);
  });
});

// ── Swimlanes ─────────────────────────────────────────────────────────────────

describe('Swimlane CRUD', () => {
  it('putSwimlane: creates and returns a swimlane', async () => {
    const s = makeSwimlane({ id: 'sl-1', boardId: 'board-A', name: 'Sprint 1' });
    const result = await repo.putSwimlane(s);

    expect(result.id).toBe('sl-1');
    expect(result.name).toBe('Sprint 1');
  });

  it('deleteSwimlane: throws when deleting the last swimlane in a board', async () => {
    await repo.putSwimlane(makeSwimlane({ id: 'sl-only', boardId: 'board-A' }));

    await expect(repo.deleteSwimlane('sl-only')).rejects.toThrow(
      'Cannot delete the last swimlane',
    );
  });

  it('deleteSwimlane: soft-deletes when multiple swimlanes exist in board', async () => {
    await repo.putSwimlane(makeSwimlane({ id: 'sl-a', boardId: 'board-A' }));
    await repo.putSwimlane(makeSwimlane({ id: 'sl-b', boardId: 'board-A' }));

    await repo.deleteSwimlane('sl-a');

    const swimlanes = await repo.getSwimlanesByBoard('board-A');
    expect(swimlanes.find(s => s.id === 'sl-a')).toBeUndefined();
    expect(swimlanes.find(s => s.id === 'sl-b')).toBeDefined();
  });

  it('getSwimlanesByBoard: returns only swimlanes for the given board', async () => {
    await repo.putSwimlane(makeSwimlane({ id: 'sl-x1', boardId: 'board-X' }));
    await repo.putSwimlane(makeSwimlane({ id: 'sl-y1', boardId: 'board-Y' }));

    const result = await repo.getSwimlanesByBoard('board-X');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('sl-x1');
  });
});

// ── Habits ────────────────────────────────────────────────────────────────────

describe('Habit CRUD', () => {
  it('putHabit: creates a habit', async () => {
    const result = await repo.putHabit(makeHabit({ id: 'h1', title: 'Morning Run', boardId: 'b1' }));
    expect(result.id).toBe('h1');
    expect(result.title).toBe('Morning Run');
  });

  it('deleteHabit: soft-deletes', async () => {
    await repo.putHabit(makeHabit({ id: 'h-del', boardId: 'b1' }));
    await repo.deleteHabit('h-del');

    const result = await repo.getHabitsByBoard('b1');
    expect(result.find(h => h.id === 'h-del')).toBeUndefined();
  });

  it('getHabitsByBoard: returns habits for board only', async () => {
    await repo.putHabit(makeHabit({ id: 'h-b1', boardId: 'b-one' }));
    await repo.putHabit(makeHabit({ id: 'h-b2', boardId: 'b-two' }));

    const result = await repo.getHabitsByBoard('b-one');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('h-b1');
  });
});

// ── Notes ─────────────────────────────────────────────────────────────────────

describe('Note CRUD', () => {
  it('putNote: creates a note', async () => {
    const result = await repo.putNote(makeNote({ id: 'n1', title: 'My Note', boardId: 'b1' }));
    expect(result.id).toBe('n1');
    expect(result.title).toBe('My Note');
  });

  it('deleteNote: soft-deletes', async () => {
    await repo.putNote(makeNote({ id: 'n-del', boardId: 'b1' }));
    await repo.deleteNote('n-del');

    const notes = await repo.getAllNotes();
    expect(notes.find(n => n.id === 'n-del')).toBeUndefined();
  });

  it('getNotesByBoard: returns notes for a specific board', async () => {
    await repo.putNote(makeNote({ id: 'n-a', boardId: 'board-A' }));
    await repo.putNote(makeNote({ id: 'n-b', boardId: 'board-B' }));

    const result = await repo.getNotesByBoard('board-A');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('n-a');
  });
});

// ── Bookmarks ─────────────────────────────────────────────────────────────────

describe('Bookmark CRUD', () => {
  it('putBookmark: creates a bookmark', async () => {
    const result = await repo.putBookmark(makeBookmark({ id: 'bk1', boardId: 'b1' }));
    expect(result.id).toBe('bk1');
  });

  it('deleteBookmark: soft-deletes', async () => {
    await repo.putBookmark(makeBookmark({ id: 'bk-del', boardId: 'b1' }));
    await repo.deleteBookmark('bk-del');

    const bookmarks = await repo.getAllBookmarks();
    expect(bookmarks.find(b => b.id === 'bk-del')).toBeUndefined();
  });
});
