import { describe, it, expect } from 'vitest';
import { canCreate, canCreateFromUsage } from '../guards';
import { PLAN_LIMITS } from '../limits';
import type { Usage } from '../usage';

// ─── canCreate ────────────────────────────────────────────────────────────────

describe('canCreate', () => {
  describe('Plus user — always passes', () => {
    it('returns ok=true even when current === limit', () => {
      const result = canCreate('boards', PLAN_LIMITS.boards, true);
      expect(result.ok).toBe(true);
    });

    it('returns ok=true when current > limit', () => {
      const result = canCreate('boards', PLAN_LIMITS.boards + 10, true);
      expect(result.ok).toBe(true);
    });

    it('returns ok=true when current is 0', () => {
      const result = canCreate('habits', 0, true);
      expect(result.ok).toBe(true);
    });
  });

  describe('Free user — below limit', () => {
    it('allows creating first board', () => {
      const result = canCreate('boards', 0, false);
      expect(result.ok).toBe(true);
    });

    it('allows creating last board (current = limit - 1)', () => {
      const result = canCreate('boards', PLAN_LIMITS.boards - 1, false);
      expect(result.ok).toBe(true);
    });

    it('allows creating habit when count is within limit', () => {
      const result = canCreate('habits', 5, false);
      expect(result.ok).toBe(true);
    });
  });

  describe('Free user — at or over limit', () => {
    it('blocks when current === limit', () => {
      const result = canCreate('boards', PLAN_LIMITS.boards, false);
      expect(result.ok).toBe(false);
    });

    it('blocks when current > limit', () => {
      const result = canCreate('boards', PLAN_LIMITS.boards + 1, false);
      expect(result.ok).toBe(false);
    });

    it('returns reason FREE_LIMIT', () => {
      const result = canCreate('boards', PLAN_LIMITS.boards, false);
      if (result.ok) throw new Error('expected block');
      expect(result.reason).toBe('FREE_LIMIT');
    });

    it('returns correct feature name', () => {
      const result = canCreate('habits', PLAN_LIMITS.habits, false);
      if (result.ok) throw new Error('expected block');
      expect(result.feature).toBe('habits');
    });

    it('returns correct limit value', () => {
      const result = canCreate('boards', PLAN_LIMITS.boards, false);
      if (result.ok) throw new Error('expected block');
      expect(result.limit).toBe(PLAN_LIMITS.boards);
    });

    it('returns correct current value', () => {
      const result = canCreate('boards', PLAN_LIMITS.boards + 3, false);
      if (result.ok) throw new Error('expected block');
      expect(result.current).toBe(PLAN_LIMITS.boards + 3);
    });

    it('blocks swimlanesPerBoard at limit', () => {
      const result = canCreate('swimlanesPerBoard', PLAN_LIMITS.swimlanesPerBoard, false);
      expect(result.ok).toBe(false);
    });

    it('blocks bookmarks at limit (100)', () => {
      const result = canCreate('bookmarks', 100, false);
      expect(result.ok).toBe(false);
    });

    it('allows bookmarks at 99 (one below limit)', () => {
      const result = canCreate('bookmarks', 99, false);
      expect(result.ok).toBe(true);
    });
  });

  describe('each CappedFeature enforces its specific limit', () => {
    const cases: [Parameters<typeof canCreate>[0], number][] = [
      ['boards', PLAN_LIMITS.boards],
      ['swimlanesPerBoard', PLAN_LIMITS.swimlanesPerBoard],
      ['routines', PLAN_LIMITS.routines],
      ['habits', PLAN_LIMITS.habits],
      ['bookmarks', PLAN_LIMITS.bookmarks],
      ['whiteboards', PLAN_LIMITS.whiteboards],
      ['mindmaps', PLAN_LIMITS.mindmaps],
    ];

    for (const [feature, limit] of cases) {
      it(`${feature}: blocks at ${limit}, allows at ${limit - 1}`, () => {
        expect(canCreate(feature, limit, false).ok).toBe(false);
        expect(canCreate(feature, limit - 1, false).ok).toBe(true);
      });
    }
  });
});

// ─── canCreateFromUsage ───────────────────────────────────────────────────────

describe('canCreateFromUsage', () => {
  const baseUsage: Usage = {
    boards: 0,
    routines: 0,
    habits: 0,
    bookmarks: 0,
    whiteboards: 0,
    mindmaps: 0,
  };

  it('delegates to canCreate — free user at boards limit blocks', () => {
    const usage: Usage = { ...baseUsage, boards: PLAN_LIMITS.boards };
    const result = canCreateFromUsage('boards', usage, false);
    expect(result.ok).toBe(false);
  });

  it('delegates to canCreate — free user below boards limit passes', () => {
    const usage: Usage = { ...baseUsage, boards: 0 };
    const result = canCreateFromUsage('boards', usage, false);
    expect(result.ok).toBe(true);
  });

  it('plus user passes regardless of usage', () => {
    const usage: Usage = { ...baseUsage, habits: 9999 };
    const result = canCreateFromUsage('habits', usage, true);
    expect(result.ok).toBe(true);
  });

  it('correctly reads habits from usage map', () => {
    const usage: Usage = { ...baseUsage, habits: PLAN_LIMITS.habits };
    const result = canCreateFromUsage('habits', usage, false);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected block');
    expect(result.feature).toBe('habits');
  });
});
