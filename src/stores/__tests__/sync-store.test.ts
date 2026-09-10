import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useSyncStore } from '../sync-store';

// Mock external dependencies to prevent real sync calls
vi.mock('@/lib/auth/service', () => ({
  getUser: vi.fn().mockReturnValue({ id: 'user-1' }),
}));
vi.mock('@/lib/supabase-replication', () => ({
  isSupabaseReplicationPaused: vi.fn().mockReturnValue(false),
  triggerSupabaseResync: vi.fn(),
}));

beforeEach(() => {
  vi.useFakeTimers();
  useSyncStore.setState({
    status: 'idle',
    lastSyncedAt: null,
    errorMessage: null,
    hasPendingChanges: false,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('initial state', () => {
  it('status is "idle"', () => {
    expect(useSyncStore.getState().status).toBe('idle');
  });

  it('lastSyncedAt is null', () => {
    expect(useSyncStore.getState().lastSyncedAt).toBeNull();
  });

  it('errorMessage is null', () => {
    expect(useSyncStore.getState().errorMessage).toBeNull();
  });

  it('hasPendingChanges is false', () => {
    expect(useSyncStore.getState().hasPendingChanges).toBe(false);
  });
});

describe('startSync', () => {
  it('sets status to "syncing"', () => {
    useSyncStore.getState().startSync();
    expect(useSyncStore.getState().status).toBe('syncing');
  });

  it('clears errorMessage', () => {
    useSyncStore.setState({ errorMessage: 'old error' });
    useSyncStore.getState().startSync();
    expect(useSyncStore.getState().errorMessage).toBeNull();
  });
});

describe('syncSuccess', () => {
  it('sets status to "synced"', () => {
    useSyncStore.getState().syncSuccess();
    expect(useSyncStore.getState().status).toBe('synced');
  });

  it('sets lastSyncedAt to a Date', () => {
    useSyncStore.getState().syncSuccess();
    expect(useSyncStore.getState().lastSyncedAt).toBeInstanceOf(Date);
  });

  it('clears hasPendingChanges', () => {
    useSyncStore.setState({ hasPendingChanges: true });
    useSyncStore.getState().syncSuccess();
    expect(useSyncStore.getState().hasPendingChanges).toBe(false);
  });

  it('resets status to "idle" after 3 seconds', () => {
    useSyncStore.getState().syncSuccess();
    vi.advanceTimersByTime(3000);
    expect(useSyncStore.getState().status).toBe('idle');
  });
});

describe('syncError', () => {
  it('sets status to "error"', () => {
    useSyncStore.getState().syncError('Network failure');
    expect(useSyncStore.getState().status).toBe('error');
  });

  it('stores the error message', () => {
    useSyncStore.getState().syncError('Could not reach server');
    expect(useSyncStore.getState().errorMessage).toBe('Could not reach server');
  });

  it('sets hasPendingChanges to true', () => {
    useSyncStore.getState().syncError('error');
    expect(useSyncStore.getState().hasPendingChanges).toBe(true);
  });
});

describe('setPending', () => {
  it('sets hasPendingChanges to true', () => {
    useSyncStore.getState().setPending();
    expect(useSyncStore.getState().hasPendingChanges).toBe(true);
  });

  it('sets status to "pending" when online', () => {
    useSyncStore.getState().setPending();
    expect(useSyncStore.getState().status).toBe('pending');
  });

  it('clears errorMessage', () => {
    useSyncStore.setState({ errorMessage: 'old' });
    useSyncStore.getState().setPending();
    expect(useSyncStore.getState().errorMessage).toBeNull();
  });
});

describe('setOffline', () => {
  it('sets status to "offline"', () => {
    useSyncStore.getState().setOffline();
    expect(useSyncStore.getState().status).toBe('offline');
  });
});

describe('setOnline', () => {
  it('sets status to "idle" when no pending changes', () => {
    useSyncStore.setState({ status: 'offline', hasPendingChanges: false });
    useSyncStore.getState().setOnline();
    expect(useSyncStore.getState().status).toBe('idle');
  });

  it('sets status to "pending" when there are pending changes', () => {
    useSyncStore.setState({ status: 'offline', hasPendingChanges: true });
    useSyncStore.getState().setOnline();
    expect(useSyncStore.getState().status).toBe('pending');
  });

  it('clears errorMessage', () => {
    useSyncStore.setState({ errorMessage: 'offline error', hasPendingChanges: false });
    useSyncStore.getState().setOnline();
    expect(useSyncStore.getState().errorMessage).toBeNull();
  });
});

describe('reset', () => {
  it('resets all fields', () => {
    useSyncStore.setState({
      status: 'error',
      lastSyncedAt: new Date(),
      errorMessage: 'something went wrong',
      hasPendingChanges: true,
    });
    useSyncStore.getState().reset();
    const s = useSyncStore.getState();
    expect(s.lastSyncedAt).toBeNull();
    expect(s.errorMessage).toBeNull();
    expect(s.hasPendingChanges).toBe(false);
  });

  it('sets status to "idle" after reset', () => {
    useSyncStore.getState().reset();
    // navigator.onLine is true in jsdom by default
    expect(useSyncStore.getState().status).toBe('idle');
  });
});
