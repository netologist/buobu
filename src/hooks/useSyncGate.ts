'use client';

/**
 * useSyncGate — watches entitlement changes and starts/stops replication.
 *
 * Responsibilities:
 *  1. Detect mid-session upgrade (hasSyncAccess: false → true):
 *     push all local RxDB data via activateSync(), then start replication.
 *  2. Detect mid-session downgrade (hasSyncAccess: true → false):
 *     stop replication. Cloud data is kept; only replication is halted.
 *
 * NOTE: The initial replication start on login is handled by AuthProvider,
 * not here. This hook only reacts to *changes* after the initial render.
 */

import { useEffect, useRef } from 'react';
import { useEntitlementsStore } from '@/stores/entitlements-store';
import { useDbStore } from '@/stores/db-store';
import { useAuthStore } from '@/stores/auth-store';
import {
  startSupabaseReplication,
  stopSupabaseReplication,
  getReplicationStates,
} from '@/lib/supabase-replication';
import { activateSync } from '@/lib/subscriptions/activate-sync';

export function useSyncGate(): void {
  const hasSyncAccess = useEntitlementsStore((s) => s.hasSyncAccess);
  const isLoading = useEntitlementsStore((s) => s.isLoading);
  const db = useDbStore((s) => s.db);
  const user = useAuthStore((s) => s.user);

  // Track the previous value to detect transitions.
  // Initialised as null so the first render is always skipped —
  // AuthProvider already handles the initial conditional replication start.
  const prevRef = useRef<boolean | null>(null);

  useEffect(() => {
    // Wait until entitlements have finished loading and the session is ready.
    if (isLoading || !user?.id || !db) return;

    const prev = prevRef.current;
    prevRef.current = hasSyncAccess;

    // Skip first render — no transition has happened yet.
    if (prev === null) return;

    if (hasSyncAccess && !prev) {
      // ── Free → Plus upgrade detected mid-session ──────────────────────────
      // Only start if not already running (idempotent guard for safety).
      const alreadyRunning = getReplicationStates(user.id).length > 0;
      if (alreadyRunning) return;

      activateSync(db, user.id)
        .then(() => {
          startSupabaseReplication(db, user.id);
        })
        .catch((err: unknown) => {
          console.error('[useSyncGate] activateSync failed:', err);
        });

      return;
    }

    if (!hasSyncAccess && prev) {
      // ── Plus → Free downgrade detected mid-session ────────────────────────
      // Stop replication; cloud data is preserved.
      stopSupabaseReplication(user.id).catch((err: unknown) => {
        console.error('[useSyncGate] stopSupabaseReplication failed:', err);
      });
    }
  }, [hasSyncAccess, isLoading, user?.id, db]);
}
