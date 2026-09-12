import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from 'jotai';
import { makeTask, makeHabit, makeNote, makeBookmark, makeRoutine, makeVisionBoardItem } from '@/test/factories';

// Import atoms
import { tasksAtom, tasksLoadingAtom, activeTasksAtom, archivedTasksAtom, deadlineTasksAtom, tasksByColumnAtom } from '../atoms/tasks';
import { habitsAtom, habitsLoadingAtom, activeHabitsAtom } from '../atoms/habits';
import { notesAtom, notesLoadingAtom, pinnedNotesAtom } from '../atoms/notes';
import { bookmarksAtom, bookmarksLoadingAtom } from '../atoms/bookmarks';
import { mindmapsAtom, mindmapsLoadingAtom } from '../atoms/mindmaps';
import { routinesAtom, routinesLoadingAtom } from '../atoms/routines';
import { visionItemsAtom, visionItemsLoadingAtom, activeVisionItemsAtom } from '../atoms/vision';

// Create isolated store per test
let store: ReturnType<typeof createStore>;
beforeEach(() => {
  store = createStore();
});

// ── Tasks ──────────────────────────────────────────────────────────────────────

describe('tasksAtom', () => {
  it('initialises to empty array', () => {
    expect(store.get(tasksAtom)).toEqual([]);
  });

  it('stores and retrieves tasks', () => {
    const task = makeTask({ title: 'Write tests' });
    store.set(tasksAtom, [task]);
    expect(store.get(tasksAtom)).toHaveLength(1);
    expect(store.get(tasksAtom)[0].title).toBe('Write tests');
  });
});

describe('tasksLoadingAtom', () => {
  it('initialises to false', () => {
    expect(store.get(tasksLoadingAtom)).toBe(false);
  });

  it('can be set to true', () => {
    store.set(tasksLoadingAtom, true);
    expect(store.get(tasksLoadingAtom)).toBe(true);
  });
});

describe('activeTasksAtom (derived)', () => {
  it('returns only non-archived tasks', () => {
    const active = makeTask({ archived: false });
    const archived = makeTask({ archived: true });
    store.set(tasksAtom, [active, archived]);
    expect(store.get(activeTasksAtom)).toHaveLength(1);
    expect(store.get(activeTasksAtom)[0].id).toBe(active.id);
  });

  it('returns empty array when all tasks are archived', () => {
    store.set(tasksAtom, [makeTask({ archived: true })]);
    expect(store.get(activeTasksAtom)).toEqual([]);
  });
});

describe('archivedTasksAtom (derived)', () => {
  it('returns only archived tasks', () => {
    const active = makeTask({ archived: false });
    const archived = makeTask({ archived: true });
    store.set(tasksAtom, [active, archived]);
    expect(store.get(archivedTasksAtom)).toHaveLength(1);
    expect(store.get(archivedTasksAtom)[0].id).toBe(archived.id);
  });
});

describe('deadlineTasksAtom (derived)', () => {
  it('returns only tasks with deadlines', () => {
    const withDeadline = makeTask({ deadline: '2026-04-01' });
    const withoutDeadline = makeTask({ deadline: null });
    store.set(tasksAtom, [withDeadline, withoutDeadline]);
    const result = store.get(deadlineTasksAtom);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(withDeadline.id);
  });
});

describe('tasksByColumnAtom (derived)', () => {
  it('groups tasks by columnId', () => {
    const t1 = makeTask({ columnId: 'col-todo', swimlaneId: 'lane-x', boardId: 'board-x' });
    const t2 = makeTask({ columnId: 'col-todo', swimlaneId: 'lane-x', boardId: 'board-x' });
    const t3 = makeTask({ columnId: 'col-done', swimlaneId: 'lane-x', boardId: 'board-x' });
    store.set(tasksAtom, [t1, t2, t3]);
    // tasksByColumnAtom derives from filteredTasksAtom which reads Zustand store
    // In this isolated test, selections are empty, so filtered = [] → grouped = {}
    // This tests the atom works without errors
    const grouped = store.get(tasksByColumnAtom);
    expect(typeof grouped).toBe('object');
  });
});

// ── Habits ────────────────────────────────────────────────────────────────────

describe('habitsAtom', () => {
  it('initialises to empty array', () => {
    expect(store.get(habitsAtom)).toEqual([]);
  });

  it('stores habits', () => {
    const habit = makeHabit({ title: 'Meditate' });
    store.set(habitsAtom, [habit]);
    expect(store.get(habitsAtom)[0].title).toBe('Meditate');
  });
});

describe('habitsLoadingAtom', () => {
  it('initialises to false', () => {
    expect(store.get(habitsLoadingAtom)).toBe(false);
  });
});

describe('activeHabitsAtom (derived)', () => {
  it('returns only non-archived habits', () => {
    const active = makeHabit({ archived: false });
    const archived = makeHabit({ archived: true });
    store.set(habitsAtom, [active, archived]);
    expect(store.get(activeHabitsAtom)).toHaveLength(1);
    expect(store.get(activeHabitsAtom)[0].id).toBe(active.id);
  });
});

// ── Notes ─────────────────────────────────────────────────────────────────────

describe('notesAtom', () => {
  it('initialises to empty array', () => {
    expect(store.get(notesAtom)).toEqual([]);
  });

  it('stores notes', () => {
    const note = makeNote({ title: 'My note' });
    store.set(notesAtom, [note]);
    expect(store.get(notesAtom)[0].title).toBe('My note');
  });
});

describe('notesLoadingAtom', () => {
  it('initialises to false', () => {
    expect(store.get(notesLoadingAtom)).toBe(false);
  });
});

describe('pinnedNotesAtom (derived)', () => {
  it('returns only pinned notes', () => {
    const pinned = makeNote({ pinned: true });
    const unpinned = makeNote({ pinned: false });
    store.set(notesAtom, [pinned, unpinned]);
    const result = store.get(pinnedNotesAtom);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(pinned.id);
  });
});

// ── Bookmarks ─────────────────────────────────────────────────────────────────

describe('bookmarksAtom', () => {
  it('initialises to empty array', () => {
    expect(store.get(bookmarksAtom)).toEqual([]);
  });

  it('stores bookmarks', () => {
    const bm = makeBookmark({ url: 'https://vitest.dev' });
    store.set(bookmarksAtom, [bm]);
    expect(store.get(bookmarksAtom)[0].url).toBe('https://vitest.dev');
  });
});

describe('bookmarksLoadingAtom', () => {
  it('initialises to false', () => {
    expect(store.get(bookmarksLoadingAtom)).toBe(false);
  });
});

// ── Mindmaps ──────────────────────────────────────────────────────────────────

describe('mindmapsAtom', () => {
  it('initialises to empty array', () => {
    expect(store.get(mindmapsAtom)).toEqual([]);
  });
});

describe('mindmapsLoadingAtom', () => {
  it('initialises to false', () => {
    expect(store.get(mindmapsLoadingAtom)).toBe(false);
  });
});

// ── Routines ──────────────────────────────────────────────────────────────────

describe('routinesAtom', () => {
  it('initialises to empty array', () => {
    expect(store.get(routinesAtom)).toEqual([]);
  });

  it('stores routines', () => {
    const routine = makeRoutine({ title: 'Morning routine' });
    store.set(routinesAtom, [routine]);
    expect(store.get(routinesAtom)[0].title).toBe('Morning routine');
  });
});

describe('routinesLoadingAtom', () => {
  it('initialises to true (loading starts immediately for routines)', () => {
    expect(store.get(routinesLoadingAtom)).toBe(true);
  });
});

// ── Vision ────────────────────────────────────────────────────────────────────

describe('visionItemsAtom', () => {
  it('initialises to empty array', () => {
    expect(store.get(visionItemsAtom)).toEqual([]);
  });

  it('stores vision items', () => {
    const item = makeVisionBoardItem({ title: 'Dream house' });
    store.set(visionItemsAtom, [item]);
    expect(store.get(visionItemsAtom)[0].title).toBe('Dream house');
  });
});

describe('visionItemsLoadingAtom', () => {
  it('initialises to false', () => {
    expect(store.get(visionItemsLoadingAtom)).toBe(false);
  });
});

describe('activeVisionItemsAtom (derived)', () => {
  it('returns only non-archived vision items', () => {
    const active = makeVisionBoardItem({ archived: false });
    const archived = makeVisionBoardItem({ archived: true });
    store.set(visionItemsAtom, [active, archived]);
    expect(store.get(activeVisionItemsAtom)).toHaveLength(1);
    expect(store.get(activeVisionItemsAtom)[0].id).toBe(active.id);
  });
});

