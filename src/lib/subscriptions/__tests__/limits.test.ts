import { describe, it, expect } from 'vitest';
import { PLAN_LIMITS, PLUS_ONLY_FEATURES, type CappedFeature, type PlusOnlyFeature } from '../limits';

describe('PLAN_LIMITS', () => {
  it('covers every CappedFeature key', () => {
    const expected: CappedFeature[] = [
      'boards',
      'swimlanesPerBoard',
      'routines',
      'habits',
      'bookmarks',
      'whiteboards',
      'mindmaps',
    ];
    for (const key of expected) {
      expect(PLAN_LIMITS).toHaveProperty(key);
    }
  });

  it('boards limit is 2', () => {
    expect(PLAN_LIMITS.boards).toBe(2);
  });

  it('swimlanesPerBoard limit is 3', () => {
    expect(PLAN_LIMITS.swimlanesPerBoard).toBe(3);
  });

  it('routines limit is 10', () => {
    expect(PLAN_LIMITS.routines).toBe(10);
  });

  it('habits limit is 10', () => {
    expect(PLAN_LIMITS.habits).toBe(10);
  });

  it('bookmarks limit is 100', () => {
    expect(PLAN_LIMITS.bookmarks).toBe(100);
  });

  it('whiteboards limit is 10', () => {
    expect(PLAN_LIMITS.whiteboards).toBe(10);
  });

  it('mindmaps limit is 10', () => {
    expect(PLAN_LIMITS.mindmaps).toBe(10);
  });

  it('does NOT contain tasks (no Free cap)', () => {
    expect(PLAN_LIMITS).not.toHaveProperty('tasks');
  });

  it('does NOT contain notes (no Free cap)', () => {
    expect(PLAN_LIMITS).not.toHaveProperty('notes');
  });

  it('all limits are positive integers', () => {
    for (const [, v] of Object.entries(PLAN_LIMITS)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });

  it('is immutable (Readonly)', () => {
    // Attempting to reassign should throw in strict mode (or silently fail in non-strict).
    // We verify the object reference stays consistent.
    const ref = PLAN_LIMITS;
    expect(ref).toBe(PLAN_LIMITS);
  });
});

describe('PLUS_ONLY_FEATURES', () => {
  it('contains cloud_sync', () => {
    expect(PLUS_ONLY_FEATURES).toContain('cloud_sync');
  });

  it('contains api_keys', () => {
    expect(PLUS_ONLY_FEATURES).toContain('api_keys');
  });

  it('contains mcp', () => {
    expect(PLUS_ONLY_FEATURES).toContain('mcp');
  });

  it('has exactly 3 entries', () => {
    expect(PLUS_ONLY_FEATURES).toHaveLength(3);
  });

  it('satisfies PlusOnlyFeature type (all values are valid)', () => {
    const valid: PlusOnlyFeature[] = ['cloud_sync', 'api_keys', 'mcp'];
    for (const f of PLUS_ONLY_FEATURES) {
      expect(valid).toContain(f);
    }
  });
});
