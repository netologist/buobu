'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { closeDatabase, getDatabase } from '@/lib/rxdb';
import { getSessionUser, hasPersistedSession, logout as authLogout, onAuthStateChange, type User } from '@/lib/auth/service';
import { startSupabaseReplication, stopAllSupabaseReplications, stopSupabaseReplication } from '@/lib/supabase-replication';
import { useAuthStore } from '@/stores/auth-store';
import { useDbStore } from '@/stores/db-store';
import { useBoardStore } from '@/stores/board-store';
import { useSyncStore } from '@/stores/sync-store';
import { useBoardsSubscription } from '@/stores/hooks/use-boards';
import { useEntitlementsStore } from '@/stores/entitlements-store';
import { useSyncGate } from '@/hooks/useSyncGate';
import { useIsMobile } from '@/hooks/useIsMobile';
import { getPostLoginPath } from '@/lib/navigation/post-login-path';
import { useLastVisitedPath } from '@/hooks/useLastVisitedPath';
import { CLOUD_MODE, LOCAL_MODE } from '@/lib/feature-flags';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = new Set(['/', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password']);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // Zustand store actions for parallel state sync
  const dbInitialize = useDbStore((s) => s.initialize);
  const loadBoards = useBoardStore((s) => s.loadBoards);
  const resetSyncStore = useSyncStore((s) => s.reset);
  const refreshEntitlements = useEntitlementsStore((s) => s.refreshEntitlements);
  const resetEntitlements = useEntitlementsStore((s) => s.resetEntitlements);

  // Reactive RxDB subscription: keeps boards & swimlanes in sync with remote changes
  // (replaces the one-shot loadBoards() pattern which misses incoming sync data)
  useBoardsSubscription();

  // Persist the current section pathname so we can restore it after login.
  useLastVisitedPath();

  // Monitor entitlement changes and start/stop replication accordingly.
  // Handles Free → Plus upgrade (activateSync + start) and Plus → Free downgrade (stop).
  useSyncGate();

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const hadPersistedSession = hasPersistedSession();
        const currentUser = await getSessionUser();

        if (!mounted) return;

        setUser(currentUser);
        setSessionExpired(hadPersistedSession && !currentUser);

        if (currentUser) {
          const db = await getDatabase(currentUser.id);

          // Initialize Zustand stores first.
          await dbInitialize(currentUser.id);
          await loadBoards();
          resetSyncStore();

          // Local Mode has no entitlements to fetch and nothing to sync to.
          if (LOCAL_MODE) return;

          // Fetch entitlements synchronously before deciding whether to start sync.
          // This prevents Free users from briefly opening a replication connection.
          await refreshEntitlements();
          const { hasSyncAccess } = useEntitlementsStore.getState();
          if (hasSyncAccess) {
            startSupabaseReplication(db, currentUser.id);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth state:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    const { unsubscribe } = onAuthStateChange(async (event, _session, nextUser) => {
      if (!mounted) return;

      setUser(nextUser);
      setSessionExpired(event === 'SESSION_EXPIRED');

      if (nextUser) {
        try {
          const db = await getDatabase(nextUser.id);

          // Sync Zustand stores
          await dbInitialize(nextUser.id);
          await loadBoards();
          resetSyncStore();

          if (LOCAL_MODE) return;

          // Fetch entitlements before deciding whether to start sync.
          await refreshEntitlements();
          const { hasSyncAccess } = useEntitlementsStore.getState();
          if (hasSyncAccess) {
            startSupabaseReplication(db, nextUser.id);
          }
        } catch (error) {
          console.error('Failed to initialize user database:', error);
        }
        return;
      }

      try {
        await stopAllSupabaseReplications();
        await closeDatabase();
        // Reset Zustand stores
        useDbStore.getState().reset();
        useBoardStore.getState().cleanup();
        useSyncStore.getState().reset();
        resetEntitlements();
      } catch (error) {
        console.error('Error closing database on sign out:', error);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [dbInitialize, loadBoards, refreshEntitlements, resetEntitlements, resetSyncStore]);

  useEffect(() => {
    if (isLoading) return;

    const authenticated = !!user;

    if (!authenticated && !PUBLIC_PATHS.has(pathname) && !sessionExpired) {
      router.push('/auth/login');
    } else if (
      authenticated &&
      PUBLIC_PATHS.has(pathname) &&
      // Reset-password is the one public path an authenticated user may stay on.
      // Local Mode has no password to reset, so there it stops being an exception.
      !(CLOUD_MODE && pathname === '/auth/reset-password')
    ) {
      router.replace(getPostLoginPath(isMobile));
    }
  }, [isLoading, pathname, router, sessionExpired, user, isMobile]);

  useEffect(() => {
    if (PUBLIC_PATHS.has(pathname)) {
      setSessionExpired(false);
    }
  }, [pathname]);

  const logout = async () => {
    // Local Mode has no account to sign out of. The menu action is hidden, and
    // proceeding would close the database and strand the user on an empty page.
    if (LOCAL_MODE) return;

    try {
      if (user?.id) {
        await stopSupabaseReplication(user.id);
      }
      await closeDatabase();
      // Reset Zustand stores
      useDbStore.getState().reset();
      useBoardStore.getState().cleanup();
      useSyncStore.getState().reset();
      resetEntitlements();
    } catch (error) {
      console.error('Error closing database during logout:', error);
    }

    await authLogout();
    setUser(null);
    setSessionExpired(false);
    router.push('/auth/login');
  };

  const handleGoToLogin = () => {
    setSessionExpired(false);
    router.push('/auth/login');
  };

  // Sync Zustand auth store for components that use it directly
  useEffect(() => {
    useAuthStore.getState().setAuthState({ user, isLoading });
  }, [user, isLoading]);

  // Refresh entitlements on window focus (subscription state can change externally).
  useEffect(() => {
    if (!user) return;
    const handleFocus = () => { void refreshEntitlements(); };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, refreshEntitlements]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        logout,
      }}
    >
      {children}
      <Dialog open={sessionExpired && !PUBLIC_PATHS.has(pathname)}>
        <DialogContent showCloseButton={false} onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Login required</DialogTitle>
            <DialogDescription>
              Your session has expired. Please sign in again to continue syncing and editing your data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/auth/login" onClick={handleGoToLogin}>
                Go to login
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
