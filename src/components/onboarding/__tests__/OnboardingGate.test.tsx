import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const nav = vi.hoisted(() => ({
  pathname: '/tasks/kanban-view',
}));

const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  isAuthenticated: false,
  isLoading: true,
}));

const dbState = vi.hoisted(() => ({
  db: null as object | null,
  isLoading: true,
}));

const loadBoards = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const hasAnyCoreData = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
}));

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuthContext: () => authState,
}));

vi.mock('@/stores/db-store', () => ({
  useDbStore: (selector: (state: typeof dbState) => unknown) => selector(dbState),
}));

vi.mock('@/stores/board-store', () => ({
  useBoardStore: {
    getState: () => ({
      loadBoards,
    }),
  },
}));

vi.mock('@/lib/supabase-replication', () => ({
  awaitInitialSync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/onboarding-seed', () => ({
  getOnboardingPresets: () => [],
  seedDefaultWorkspace: vi.fn().mockResolvedValue(undefined),
  seedFromPreset: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/onboarding-state', () => ({
  hasAnyCoreData,
}));

import { OnboardingGate } from '../OnboardingGate';

beforeEach(() => {
  nav.pathname = '/tasks/kanban-view';
  authState.user = null;
  authState.isAuthenticated = false;
  authState.isLoading = true;
  dbState.db = null;
  dbState.isLoading = true;
  loadBoards.mockClear();
  hasAnyCoreData.mockReset();
  hasAnyCoreData.mockResolvedValue(true);
});

describe('OnboardingGate', () => {
  it('shows a unified startup loading screen while auth is still resolving', () => {
    render(
      <OnboardingGate>
        <div>app</div>
      </OnboardingGate>
    );

    expect(screen.getByText(/Preparing Your Workspace/i)).toBeTruthy();
  });

  it('does not restart onboarding checks on route changes after local data is confirmed', async () => {
    authState.user = { id: 'user-1' };
    authState.isAuthenticated = true;
    authState.isLoading = false;
    dbState.db = { collections: {} };
    dbState.isLoading = false;

    const { rerender } = render(
      <OnboardingGate>
        <div>app</div>
      </OnboardingGate>
    );

    await waitFor(() => {
      expect(hasAnyCoreData).toHaveBeenCalledTimes(1);
    });

    nav.pathname = '/notes';
    rerender(
      <OnboardingGate>
        <div>app</div>
      </OnboardingGate>
    );

    await waitFor(() => {
      expect(screen.getByText('app')).toBeTruthy();
    });

    expect(hasAnyCoreData).toHaveBeenCalledTimes(1);
  });
});
