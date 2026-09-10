import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

// --- Hoisted mutable state for next/navigation ---
const nav = vi.hoisted(() => ({
  pathname: '/kanban',
  searchParams: new URLSearchParams(),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  usePathname: () => nav.pathname,
  useSearchParams: () => nav.searchParams,
}));

vi.mock('@/lib/auth/service', () => ({
  getSessionUser: vi.fn().mockResolvedValue(null),
  hasPersistedSession: vi.fn().mockReturnValue(false),
  logout: vi.fn().mockResolvedValue(undefined),
  onAuthStateChange: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
}));

vi.mock('@/lib/rxdb', () => ({
  getDatabase: vi.fn().mockResolvedValue({ collections: {} }),
  closeDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase-replication', () => ({
  startSupabaseReplication: vi.fn(),
  stopAllSupabaseReplications: vi.fn().mockResolvedValue(undefined),
  stopSupabaseReplication: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/migration', () => ({
  checkMigrationNeeded: vi.fn().mockResolvedValue(false),
  migrateFromOldDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/stores/hooks/use-boards', () => ({
  useBoardsSubscription: vi.fn(),
}));

// Mock useSyncGate — tested separately; don't want it interfering here.
vi.mock('@/hooks/useSyncGate', () => ({
  useSyncGate: vi.fn(),
}));

// Mock useIsMobile to return false (desktop mode)
vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: vi.fn().mockReturnValue(false),
}));

// Hoist mocks that are referenced inside vi.mock factories.
const { mockRefreshEntitlements } = vi.hoisted(() => ({
  mockRefreshEntitlements: vi.fn().mockResolvedValue(undefined),
}));

// Mock entitlements store — default to hasSyncAccess: true so existing tests
// that verify startSupabaseReplication is called continue to work.
vi.mock('@/stores/entitlements-store', () => {
  const state = {
    isPlus: true,
    hasSyncAccess: true,
    plan: 'plus',
    status: 'active',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    trialEnd: null,
    cohort: 'standard',
    isLoading: false,
    isOffline: false,
    refreshEntitlements: mockRefreshEntitlements,
    resetEntitlements: vi.fn(),
  };
  function useEntitlementsStore(selector?: (s: typeof state) => unknown) {
    return selector ? selector(state) : state;
  }
  useEntitlementsStore.getState = () => state;
  useEntitlementsStore.setState = vi.fn();
  function useEntitlements() { return state; }
  return { useEntitlementsStore, useEntitlements };
});

// Mock board-store to avoid real DB calls in loadBoards()
vi.mock('@/stores/board-store', () => {
  const loadBoards = vi.fn().mockResolvedValue(undefined);
  const cleanup = vi.fn();
  const state = { loadBoards, cleanup, boards: [], swimlanes: [], isLoading: false };
  function useBoardStore(selector: (s: typeof state) => unknown) {
    return selector(state);
  }
  useBoardStore.getState = () => state;
  useBoardStore.setState = vi.fn();
  return { useBoardStore };
});

import { AuthProvider, useAuthContext } from '../AuthProvider';
import { getSessionUser, hasPersistedSession, onAuthStateChange } from '@/lib/auth/service';
import { getDatabase, closeDatabase } from '@/lib/rxdb';
import { startSupabaseReplication } from '@/lib/supabase-replication';

function TestChild() {
  return <span data-testid="child">hello</span>;
}

function TestConsumer() {
  const { user, isLoading, isAuthenticated } = useAuthContext();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user-id">{user?.id ?? 'null'}</span>
    </div>
  );
}

beforeEach(() => {
  nav.pathname = '/kanban';
  nav.searchParams = new URLSearchParams();
  nav.push.mockReset();
  nav.replace.mockReset();
  vi.mocked(getSessionUser).mockResolvedValue(null);
  vi.mocked(hasPersistedSession).mockReturnValue(false);
  vi.mocked(onAuthStateChange).mockReturnValue({ unsubscribe: vi.fn() });
  vi.mocked(getDatabase).mockResolvedValue({ collections: {} } as never);
  vi.mocked(closeDatabase).mockResolvedValue(undefined);
});

describe('AuthProvider — rendering', () => {
  it('renders children', async () => {
    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );
    expect(await screen.findByTestId('child')).toBeDefined();
    await waitFor(() => expect(getSessionUser).toHaveBeenCalledOnce());
  });

  it('provides context to consumers', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    // Eventually finishes loading
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('isAuthenticated is false when no session', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user-id').textContent).toBe('null');
  });

  it('isAuthenticated is true when session exists', async () => {
    const user = { id: 'u1', email: 'a@b.com', avatarUrl: undefined } as never;
    vi.mocked(getSessionUser).mockResolvedValue(user);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user-id').textContent).toBe('u1');
  });
});

describe('AuthProvider — initialization', () => {
  it('calls getSessionUser on mount', async () => {
    render(<AuthProvider><TestChild /></AuthProvider>);
    await waitFor(() => expect(getSessionUser).toHaveBeenCalledOnce());
  });

  it('calls onAuthStateChange to subscribe to auth events', async () => {
    render(<AuthProvider><TestChild /></AuthProvider>);
    await waitFor(() => expect(onAuthStateChange).toHaveBeenCalledOnce());
  });

  it('calls getDatabase when session user is found', async () => {
    const user = { id: 'u1', email: 'a@b.com', avatarUrl: undefined } as never;
    vi.mocked(getSessionUser).mockResolvedValue(user);

    render(<AuthProvider><TestChild /></AuthProvider>);
    await waitFor(() => expect(getDatabase).toHaveBeenCalledWith('u1'));
  });

  it('starts replication when session user is found', async () => {
    const user = { id: 'u1', email: 'a@b.com', avatarUrl: undefined } as never;
    vi.mocked(getSessionUser).mockResolvedValue(user);

    render(<AuthProvider><TestChild /></AuthProvider>);
    await waitFor(() => expect(startSupabaseReplication).toHaveBeenCalledOnce());
  });

  it('does NOT call getDatabase when no session', async () => {
    render(<AuthProvider><TestChild /></AuthProvider>);
    await waitFor(() => expect(getSessionUser).toHaveBeenCalledOnce());
    expect(getDatabase).not.toHaveBeenCalled();
  });
});

describe('AuthProvider — route protection', () => {
  it('redirects to /auth/login when unauthenticated on a protected route', async () => {
    nav.pathname = '/kanban';
    vi.mocked(getSessionUser).mockResolvedValue(null);

    render(<AuthProvider><TestChild /></AuthProvider>);
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/auth/login'));
  });

  it('does NOT redirect when unauthenticated on a public path', async () => {
    nav.pathname = '/auth/login';
    vi.mocked(getSessionUser).mockResolvedValue(null);

    render(<AuthProvider><TestChild /></AuthProvider>);
    await waitFor(() => expect(getSessionUser).toHaveBeenCalledOnce());
    // Allow any pending microtasks to flush
    await act(async () => {});
    expect(nav.push).not.toHaveBeenCalledWith('/auth/login');
  });

  it('does NOT redirect when unauthenticated on /auth/forgot-password', async () => {
    nav.pathname = '/auth/forgot-password';
    vi.mocked(getSessionUser).mockResolvedValue(null);

    render(<AuthProvider><TestChild /></AuthProvider>);
    await waitFor(() => expect(getSessionUser).toHaveBeenCalledOnce());
    await act(async () => {});
    expect(nav.push).not.toHaveBeenCalledWith('/auth/login');
  });

  it('redirects authenticated user from /auth/login to post-login destination', async () => {
    nav.pathname = '/auth/login';
    const user = { id: 'u1', email: 'a@b.com', avatarUrl: undefined } as never;
    vi.mocked(getSessionUser).mockResolvedValue(user);

    render(<AuthProvider><TestChild /></AuthProvider>);
    // Authenticated user on public path should be redirected via router.replace to post-login destination.
    // HOME_PAGE_ENABLED is off by default, so the destination is the default task view.
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/tasks/kanban-view'));
  });

  it('does not redirect authenticated user on a protected route', async () => {
    nav.pathname = '/kanban';
    const user = { id: 'u1', email: 'a@b.com', avatarUrl: undefined } as never;
    vi.mocked(getSessionUser).mockResolvedValue(user);

    render(<AuthProvider><TestChild /></AuthProvider>);
    await waitFor(() => expect(getSessionUser).toHaveBeenCalledOnce());
    await act(async () => {});
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('does NOT redirect authenticated user on /auth/reset-password', async () => {
    nav.pathname = '/auth/reset-password';
    const user = { id: 'u1', email: 'a@b.com', avatarUrl: undefined } as never;
    vi.mocked(getSessionUser).mockResolvedValue(user);

    render(<AuthProvider><TestChild /></AuthProvider>);
    await waitFor(() => expect(getSessionUser).toHaveBeenCalledOnce());
    await act(async () => {});
    expect(nav.replace).not.toHaveBeenCalledWith('/home');
  });
});

describe('AuthProvider — session expired', () => {
  it('does NOT redirect to /auth/login when session expired (shows dialog instead)', async () => {
    nav.pathname = '/kanban';
    vi.mocked(hasPersistedSession).mockReturnValue(true);
    vi.mocked(getSessionUser).mockResolvedValue(null); // was persisted but now null

    render(<AuthProvider><TestChild /></AuthProvider>);
    await waitFor(() => expect(getSessionUser).toHaveBeenCalledOnce());
    await act(async () => {});
    // Should NOT redirect — the dialog handles re-auth
    expect(nav.push).not.toHaveBeenCalledWith('/auth/login');
  });

  it('shows session expired dialog text', async () => {
    nav.pathname = '/kanban';
    vi.mocked(hasPersistedSession).mockReturnValue(true);
    vi.mocked(getSessionUser).mockResolvedValue(null);

    render(<AuthProvider><TestChild /></AuthProvider>);
    await waitFor(() => {
      expect(screen.queryByText(/session has expired/i)).toBeTruthy();
    });
  });
});

describe('AuthProvider — useAuthContext guard', () => {
  it('throws when used outside AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useAuthContext must be used within an AuthProvider'
    );
    consoleError.mockRestore();
  });
});
