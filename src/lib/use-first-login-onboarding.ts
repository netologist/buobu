'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useDbStore } from '@/stores/db-store';
import { useBoardStore } from '@/stores/board-store';
import { awaitInitialSync } from '@/lib/supabase-replication';
import { getOnboardingPresets, seedDefaultWorkspace, seedFromPreset } from '@/lib/onboarding-seed';
import { hasAnyCoreData, type OnboardingStep } from '@/lib/onboarding-state';
import { LOCAL_MODE } from '@/lib/feature-flags';

const PUBLIC_PATHS = ['/', '/auth/login', '/auth/register'];

export function useFirstLoginOnboarding() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const db = useDbStore((s) => s.db);
  const dbLoading = useDbStore((s) => s.isLoading);

  const [step, setStep] = useState<OnboardingStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const startedRef = useRef(false);
  const onlineListenerRef = useRef<(() => void) | null>(null);

  const presets = useMemo(() => getOnboardingPresets(), []);

  const setErrorState = useCallback((message: string) => {
    setError(message);
    setStep('error');
  }, []);

  const runInitialSyncFlow = useCallback(async () => {
    if (!user || !db) return;

    setError(null);
    setStep('initial-sync');

    try {
      await awaitInitialSync(user.id);
      const hasData = await hasAnyCoreData(db);
      if (hasData) {
        // Reload boards so UI reflects freshly synced data
        await useBoardStore.getState().loadBoards();
        setStep('done');
      } else {
        setStep('fallback-options');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Initial sync failed';
      setErrorState(message);
    }
  }, [db, setErrorState, user]);

  const bootstrap = useCallback(async () => {
    if (!isAuthenticated || !user || !db) return;

    setError(null);
    const hasLocalData = await hasAnyCoreData(db);

    if (hasLocalData) {
      setStep('done');
      return;
    }

    // Local Mode has no first sync to wait for and needs no network at all, so the
    // initial-sync and offline-choice steps would each tell the user something
    // untrue. Go straight to the preset / import / default choice.
    if (LOCAL_MODE) {
      setStep('fallback-options');
      return;
    }

    if (!navigator.onLine) {
      setStep('offline-choice');
      return;
    }

    await runInitialSyncFlow();
  }, [db, isAuthenticated, runInitialSyncFlow, setError, user]);

  useEffect(() => {
    return () => {
      if (onlineListenerRef.current) {
        window.removeEventListener('online', onlineListenerRef.current);
        onlineListenerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    startedRef.current = false;
    setStep('idle');
    setError(null);
    setImportOpen(false);
  }, [user?.id, setError]);

  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) return;
    if (authLoading || dbLoading) return;
    if (!isAuthenticated || !user || !db) return;
    if (startedRef.current) return;

    startedRef.current = true;
    void bootstrap();
  }, [authLoading, bootstrap, db, dbLoading, isAuthenticated, pathname, user]);

  const retrySync = useCallback(async () => {
    if (!user || !db) return;
    if (!navigator.onLine) {
      setStep('offline-choice');
      return;
    }
    await runInitialSyncFlow();
  }, [db, runInitialSyncFlow, user]);

  const continueOffline = useCallback(() => {
    setError(null);
    setStep('fallback-options');
  }, []);

  const waitForOnline = useCallback(() => {
    setError(null);
    setStep('initial-sync');

    if (navigator.onLine) {
      void runInitialSyncFlow();
      return;
    }

    if (onlineListenerRef.current) {
      window.removeEventListener('online', onlineListenerRef.current);
      onlineListenerRef.current = null;
    }

    const onOnline = () => {
      window.removeEventListener('online', onOnline);
      onlineListenerRef.current = null;
      void runInitialSyncFlow();
    };

    onlineListenerRef.current = onOnline;
    window.addEventListener('online', onOnline);
  }, [runInitialSyncFlow]);

  const chooseImport = useCallback(() => {
    setError(null);
    setStep('import');
    setImportOpen(true);
  }, []);

  const onImportOpenChange = useCallback(async (open: boolean) => {
    setImportOpen(open);
    if (open || !db) return;

    const hasData = await hasAnyCoreData(db);
    if (hasData) {
      setStep('done');
    } else {
      setStep('fallback-options');
    }
  }, [db]);

  const choosePreset = useCallback(async (presetId: string) => {
    if (!db || !user) return;

    setError(null);
    setStep('preset-select');

    try {
      await seedFromPreset(presetId, db, user.id);
      await useBoardStore.getState().loadBoards();
      const hasData = await hasAnyCoreData(db);
      setStep(hasData ? 'done' : 'fallback-options');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Preset seeding failed';
      setErrorState(message);
    }
  }, [db, setErrorState, user]);

  const skipAll = useCallback(async () => {
    if (!db || !user) return;

    setError(null);
    setStep('seeding-default');

    try {
      await seedDefaultWorkspace(db, user.id);
      await useBoardStore.getState().loadBoards();
      const hasData = await hasAnyCoreData(db);
      setStep(hasData ? 'done' : 'fallback-options');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Default setup failed';
      setErrorState(message);
    }
  }, [db, setErrorState, user]);

  const isProtectedPath = !PUBLIC_PATHS.includes(pathname);
  const isBlockingStartup = isProtectedPath && (
    authLoading
    || (isAuthenticated && (
      dbLoading
      || (!!user && !!db && step === 'idle')
    ))
  );
  const isActive = isProtectedPath && (
    isBlockingStartup
    || (isAuthenticated && !!user && !!db && step !== 'done' && step !== 'idle')
  );
  const visibleStep: OnboardingStep = isBlockingStartup ? 'preparing-db' : step;

  return {
    isActive,
    step: visibleStep,
    error,
    presets,
    importOpen,
    db,
    retrySync,
    continueOffline,
    waitForOnline,
    chooseImport,
    onImportOpenChange,
    choosePreset,
    skipAll,
  };
}
