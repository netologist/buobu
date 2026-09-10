import { describe, it, expect } from 'vitest';
import { hasAnyCoreData } from '../onboarding-state';
import type { Database } from '@/lib/rxdb';

// Build a minimal mock db where each collection returns a configurable list
function makeCollection(items: unknown[]) {
  return {
    find: () => ({
      exec: async () => items,
    }),
  };
}

function makeDb(overrides: Partial<Record<string, unknown[]>> = {}) {
  const empty: unknown[] = [];
  return {
    boards:      makeCollection(overrides.boards      ?? empty),
    swimlanes:   makeCollection(overrides.swimlanes   ?? empty),
    tasks:       makeCollection(overrides.tasks        ?? empty),
    backlogs:    makeCollection(overrides.backlogs    ?? empty),
    habits:      makeCollection(overrides.habits      ?? empty),
    habitLogs:   makeCollection(overrides.habitLogs   ?? empty),
    notes:       makeCollection(overrides.notes       ?? empty),
    mindmaps:    makeCollection(overrides.mindmaps    ?? empty),
    visionItems: makeCollection(overrides.visionItems ?? empty),
  } as unknown as Database;
}

describe('hasAnyCoreData', () => {
  it('returns false when all collections are empty', async () => {
    expect(await hasAnyCoreData(makeDb())).toBe(false);
  });

  it('returns true when boards has at least one item', async () => {
    expect(await hasAnyCoreData(makeDb({ boards: [{}] }))).toBe(true);
  });

  it('returns true when tasks has items', async () => {
    expect(await hasAnyCoreData(makeDb({ tasks: [{}] }))).toBe(true);
  });

  it('returns true when only visionItems has items (last in Promise.all)', async () => {
    expect(await hasAnyCoreData(makeDb({ visionItems: [{}] }))).toBe(true);
  });

  it('returns true when multiple collections have items', async () => {
    expect(await hasAnyCoreData(makeDb({ boards: [{}], habits: [{}], notes: [{}] }))).toBe(true);
  });

  it('returns false when all collections return empty arrays', async () => {
    const db = makeDb({
      boards: [], swimlanes: [], tasks: [], backlogs: [],
      habits: [], habitLogs: [], notes: [], mindmaps: [], visionItems: [],
    });
    expect(await hasAnyCoreData(db)).toBe(false);
  });
});
