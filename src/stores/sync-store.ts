'use client';

import { create } from 'zustand';
import { getUser } from '@/lib/auth/service';
import { isSupabaseReplicationPaused, triggerSupabaseResync } from '@/lib/supabase-replication';
import { LOCAL_MODE } from '@/lib/feature-flags';

export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error' | 'offline';

const SYNC_DEBOUNCE_MS = 1500;
const SYNC_SUCCESS_RESET_MS = 3000;
const SYNC_SETTLE_MS = 800;

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncResetTimer: ReturnType<typeof setTimeout> | null = null;

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  errorMessage: string | null;
  hasPendingChanges: boolean;
  startSync: () => void;
  syncSuccess: () => void;
  syncError: (message: string) => void;
  setPending: () => void;
  setOffline: () => void;
  setOnline: () => void;
  retry: () => void;
  reset: () => void;
}

function clearSyncDebounceTimer() {
  if (!syncDebounceTimer) return;
  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = null;
}

function clearSyncResetTimer() {
  if (!syncResetTimer) return;
  clearTimeout(syncResetTimer);
  syncResetTimer = null;
}

function canUseNavigator() {
  return typeof navigator !== 'undefined';
}

function isOnline() {
  return !canUseNavigator() || navigator.onLine;
}

async function runSync(skipStart = false) {
  // Local Mode has nothing to sync to. Reporting success here would tell the user
  // their data is backed up when nothing left the browser.
  if (LOCAL_MODE) return;

  const store = useSyncStore.getState();

  if (!isOnline()) {
    store.setOffline();
    return;
  }

  try {
    const user = getUser();
    if (!user?.id) {
      throw new Error('No authenticated user for sync');
    }

    if (isSupabaseReplicationPaused(user.id)) {
      return;
    }

    if (!skipStart) {
      store.startSync();
    }

    triggerSupabaseResync(user.id);
    await new Promise((resolve) => setTimeout(resolve, SYNC_SETTLE_MS));

    if (!isOnline()) {
      throw new Error('Could not reach server');
    }

    useSyncStore.getState().syncSuccess();
  } catch {
    useSyncStore.getState().syncError('Could not reach server');
  }
}

function scheduleSync(delay = SYNC_DEBOUNCE_MS) {
  clearSyncDebounceTimer();
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null;
    void runSync();
  }, delay);
}

export function queueSync() {
  // No pending state and no debounce timer: writes are local-only here, and a
  // perpetual "pending" badge would be its own small lie.
  if (LOCAL_MODE) return;

  const store = useSyncStore.getState();
  store.setPending();

  if (store.status === 'offline' || !isOnline()) {
    store.setOffline();
    return;
  }

  const user = getUser();
  if (user?.id && isSupabaseReplicationPaused(user.id)) {
    return;
  }

  scheduleSync();
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'idle',
  lastSyncedAt: null,
  errorMessage: null,
  hasPendingChanges: false,

  startSync: () => {
    clearSyncResetTimer();
    set({
      status: 'syncing',
      errorMessage: null,
    });
  },

  syncSuccess: () => {
    clearSyncResetTimer();
    const lastSyncedAt = new Date();

    set({
      status: 'synced',
      lastSyncedAt,
      errorMessage: null,
      hasPendingChanges: false,
    });

    syncResetTimer = setTimeout(() => {
      const state = useSyncStore.getState();
      if (state.status === 'synced' && !state.hasPendingChanges) {
        useSyncStore.setState({ status: 'idle' });
      }
    }, SYNC_SUCCESS_RESET_MS);
  },

  syncError: (message) => {
    clearSyncResetTimer();
    set({
      status: 'error',
      errorMessage: message,
      hasPendingChanges: true,
    });
  },

  setPending: () => {
    clearSyncResetTimer();
    set((state) => ({
      hasPendingChanges: true,
      errorMessage: null,
      status: state.status === 'offline' || !isOnline() ? 'offline' : 'pending',
    }));
  },

  setOffline: () => {
    clearSyncDebounceTimer();
    clearSyncResetTimer();
    set({
      status: 'offline',
    });
  },

  setOnline: () => {
    const hasPendingChanges = get().hasPendingChanges;
    const user = getUser();
    const isPaused = user?.id ? isSupabaseReplicationPaused(user.id) : false;

    set({
      status: hasPendingChanges ? 'pending' : 'idle',
      errorMessage: null,
    });

    if (hasPendingChanges && !isPaused) {
      scheduleSync();
    }
  },

  retry: () => {
    const user = getUser();
    if (user?.id && isSupabaseReplicationPaused(user.id)) {
      return;
    }

    clearSyncDebounceTimer();
    get().startSync();
    void runSync(true);
  },

  reset: () => {
    clearSyncDebounceTimer();
    clearSyncResetTimer();
    set({
      status: isOnline() ? 'idle' : 'offline',
      lastSyncedAt: null,
      errorMessage: null,
      hasPendingChanges: false,
    });
  },
}));
