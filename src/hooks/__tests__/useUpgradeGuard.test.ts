import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock the entitlements store so each test can control `isPlus`.
// ---------------------------------------------------------------------------
const mockIsPlus = vi.hoisted(() => ({ value: false }));

vi.mock('@/stores/entitlements-store', () => ({
  useEntitlements: () => ({ isPlus: mockIsPlus.value }),
}));

import { useUpgradeGuard } from '../useUpgradeGuard';
import { PLAN_LIMITS } from '@/lib/subscriptions/limits';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderGuard(isPlus = false) {
  mockIsPlus.value = isPlus;
  return renderHook(() => useUpgradeGuard());
}

// ---------------------------------------------------------------------------
// guard() — Free user
// ---------------------------------------------------------------------------

describe('guard() — Free user', () => {
  beforeEach(() => { mockIsPlus.value = false; });

  it('returns true when count is below the limit', () => {
    const { result } = renderGuard(false);
    expect(result.current.guard('boards', 0)).toBe(true);
  });

  it('returns true when count is one below the limit', () => {
    const { result } = renderGuard(false);
    expect(result.current.guard('boards', PLAN_LIMITS.boards - 1)).toBe(true);
  });

  it('returns false when count equals the limit', () => {
    const { result } = renderGuard(false);
    let ret: boolean;
    act(() => { ret = result.current.guard('boards', PLAN_LIMITS.boards); });
    expect(ret!).toBe(false);
  });

  it('returns false when count exceeds the limit', () => {
    const { result } = renderGuard(false);
    let ret: boolean;
    act(() => { ret = result.current.guard('habits', PLAN_LIMITS.habits + 5); });
    expect(ret!).toBe(false);
  });

  it('sets blocked state with feature, current, and limit when blocked', () => {
    const { result } = renderGuard(false);

    act(() => {
      result.current.guard('habits', PLAN_LIMITS.habits);
    });

    expect(result.current.blocked).toEqual({
      feature: 'habits',
      current: PLAN_LIMITS.habits,
      limit: PLAN_LIMITS.habits,
    });
  });

  it('sets blocked.current to the value passed in', () => {
    const { result } = renderGuard(false);

    act(() => {
      result.current.guard('bookmarks', 150);
    });

    expect(result.current.blocked?.current).toBe(150);
  });

  it('does not set blocked when create is allowed', () => {
    const { result } = renderGuard(false);

    act(() => {
      result.current.guard('boards', 0);
    });

    expect(result.current.blocked).toBeNull();
  });

  it('enforces swimlanesPerBoard limit', () => {
    const { result } = renderGuard(false);
    let ret: boolean;
    act(() => { ret = result.current.guard('swimlanesPerBoard', PLAN_LIMITS.swimlanesPerBoard); });
    expect(ret!).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// guard() — Plus user
// ---------------------------------------------------------------------------

describe('guard() — Plus user', () => {
  it('always returns true regardless of count', () => {
    const { result } = renderGuard(true);
    expect(result.current.guard('boards', PLAN_LIMITS.boards + 100)).toBe(true);
  });

  it('never sets blocked state', () => {
    const { result } = renderGuard(true);

    act(() => {
      result.current.guard('habits', 9999);
    });

    expect(result.current.blocked).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// dismissDialog()
// ---------------------------------------------------------------------------

describe('dismissDialog()', () => {
  it('clears blocked state', () => {
    const { result } = renderGuard(false);

    // Trigger a block first.
    act(() => {
      result.current.guard('boards', PLAN_LIMITS.boards);
    });
    expect(result.current.blocked).not.toBeNull();

    act(() => {
      result.current.dismissDialog();
    });

    expect(result.current.blocked).toBeNull();
  });

  it('is a no-op when nothing is blocked', () => {
    const { result } = renderGuard(false);

    act(() => {
      result.current.dismissDialog();
    });

    expect(result.current.blocked).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('initial state', () => {
  it('blocked starts as null', () => {
    const { result } = renderGuard(false);
    expect(result.current.blocked).toBeNull();
  });

  it('exposes guard and dismissDialog functions', () => {
    const { result } = renderGuard(false);
    expect(typeof result.current.guard).toBe('function');
    expect(typeof result.current.dismissDialog).toBe('function');
  });
});
