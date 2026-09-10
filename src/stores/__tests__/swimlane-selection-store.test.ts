import { describe, it, expect, beforeEach } from 'vitest';
import {
  useSwimlaneSelectionStore,
  parseSelection,
  createSelection,
  filterSwimlanes,
  filterItems,
} from '../swimlane-selection-store';

beforeEach(() => {
  useSwimlaneSelectionStore.getState().clearSelection();
});

// ── Pure helpers ──────────────────────────────────────────────────────────────

describe('parseSelection', () => {
  it('splits boardId and swimlaneId', () => {
    expect(parseSelection('board-1:lane-1')).toEqual({ boardId: 'board-1', swimlaneId: 'lane-1' });
  });

  it('handles wildcard swimlane', () => {
    expect(parseSelection('board-1:*')).toEqual({ boardId: 'board-1', swimlaneId: '*' });
  });

  it('handles all-wildcard', () => {
    expect(parseSelection('*:*')).toEqual({ boardId: '*', swimlaneId: '*' });
  });
});

describe('createSelection', () => {
  it('joins boardId and swimlaneId with colon', () => {
    expect(createSelection('board-1', 'lane-1')).toBe('board-1:lane-1');
  });

  it('creates a board-level wildcard', () => {
    expect(createSelection('board-1', '*')).toBe('board-1:*');
  });
});

// ── Store actions ─────────────────────────────────────────────────────────────

describe('selectAll', () => {
  it('sets selections to ["*:*"]', () => {
    useSwimlaneSelectionStore.getState().selectAll();
    expect(useSwimlaneSelectionStore.getState().selections).toEqual(['*:*']);
  });

  it('replaces any existing selections', () => {
    useSwimlaneSelectionStore.getState().selectBoard('board-1');
    useSwimlaneSelectionStore.getState().selectAll();
    expect(useSwimlaneSelectionStore.getState().selections).toEqual(['*:*']);
  });
});

describe('selectBoard', () => {
  it('sets selections to ["boardId:*"]', () => {
    useSwimlaneSelectionStore.getState().selectBoard('board-1');
    expect(useSwimlaneSelectionStore.getState().selections).toEqual(['board-1:*']);
  });

  it('is idempotent when same board already selected', () => {
    useSwimlaneSelectionStore.getState().selectBoard('board-1');
    useSwimlaneSelectionStore.getState().selectBoard('board-1');
    expect(useSwimlaneSelectionStore.getState().selections).toEqual(['board-1:*']);
  });

  it('replaces a different board selection', () => {
    useSwimlaneSelectionStore.getState().selectBoard('board-1');
    useSwimlaneSelectionStore.getState().selectBoard('board-2');
    expect(useSwimlaneSelectionStore.getState().selections).toEqual(['board-2:*']);
  });
});

describe('toggleSwimlane', () => {
  it('adds a swimlane selection', () => {
    useSwimlaneSelectionStore.getState().toggleSwimlane('board-1', 'lane-1');
    expect(useSwimlaneSelectionStore.getState().selections).toContain('board-1:lane-1');
  });

  it('removes an already-selected swimlane', () => {
    useSwimlaneSelectionStore.getState().toggleSwimlane('board-1', 'lane-1');
    useSwimlaneSelectionStore.getState().toggleSwimlane('board-1', 'lane-1');
    expect(useSwimlaneSelectionStore.getState().selections).not.toContain('board-1:lane-1');
  });

  it('falls back to board-level selection when last swimlane deselected', () => {
    useSwimlaneSelectionStore.getState().toggleSwimlane('board-1', 'lane-1');
    useSwimlaneSelectionStore.getState().toggleSwimlane('board-1', 'lane-1');
    expect(useSwimlaneSelectionStore.getState().selections).toEqual(['board-1:*']);
  });

  it('can select multiple swimlanes across boards', () => {
    useSwimlaneSelectionStore.getState().toggleSwimlane('board-1', 'lane-1');
    useSwimlaneSelectionStore.getState().toggleSwimlane('board-2', 'lane-2');
    const { selections } = useSwimlaneSelectionStore.getState();
    expect(selections).toContain('board-1:lane-1');
    expect(selections).toContain('board-2:lane-2');
  });
});

describe('clearSelection', () => {
  it('empties the selections array', () => {
    useSwimlaneSelectionStore.getState().selectAll();
    useSwimlaneSelectionStore.getState().clearSelection();
    expect(useSwimlaneSelectionStore.getState().selections).toEqual([]);
  });
});

// ── filterSwimlanes ───────────────────────────────────────────────────────────

describe('filterSwimlanes', () => {
  const lanes = [
    { id: 'lane-1', boardId: 'board-1' },
    { id: 'lane-2', boardId: 'board-1' },
    { id: 'lane-3', boardId: 'board-2' },
  ];

  it('returns empty array for empty selections', () => {
    expect(filterSwimlanes(lanes, [])).toEqual([]);
  });

  it('returns all lanes for "*:*" selection', () => {
    expect(filterSwimlanes(lanes, ['*:*'])).toEqual(lanes);
  });

  it('filters by specific swimlane IDs', () => {
    const result = filterSwimlanes(lanes, ['board-1:lane-1']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('lane-1');
  });

  it('filters by board-level wildcard', () => {
    const result = filterSwimlanes(lanes, ['board-1:*']);
    expect(result).toHaveLength(2);
    expect(result.map((l) => l.id)).toEqual(expect.arrayContaining(['lane-1', 'lane-2']));
  });

  it('returns only lanes from matching board', () => {
    const result = filterSwimlanes(lanes, ['board-2:*']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('lane-3');
  });
});

// ── filterItems ───────────────────────────────────────────────────────────────

describe('filterItems', () => {
  const items = [
    { id: 't1', swimlaneId: 'lane-1', boardId: 'board-1' },
    { id: 't2', swimlaneId: 'lane-2', boardId: 'board-1' },
    { id: 't3', swimlaneId: 'lane-3', boardId: 'board-2' },
  ];

  it('returns empty array for empty selections', () => {
    expect(filterItems(items, [])).toEqual([]);
  });

  it('returns all items for "*:*" selection', () => {
    expect(filterItems(items, ['*:*'])).toEqual(items);
  });

  it('filters by specific swimlane', () => {
    const result = filterItems(items, ['board-1:lane-1']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t1');
  });

  it('filters by board-level wildcard', () => {
    const result = filterItems(items, ['board-1:*']);
    expect(result.map((i) => i.id)).toEqual(expect.arrayContaining(['t1', 't2']));
  });

  it('filters items from multiple swimlanes', () => {
    const result = filterItems(items, ['board-1:lane-1', 'board-2:lane-3']);
    expect(result).toHaveLength(2);
  });
});
