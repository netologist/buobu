'use client';

import { create } from 'zustand';
import { getDatabase, type Database } from '@/lib/rxdb';
import { checkMigrationNeeded, migrateFromOldDB } from '@/lib/migration';

interface DbState {
  db: Database | null;
  isLoading: boolean;
  error: Error | null;
  initialize: (userId: string) => Promise<void>;
  reset: () => void;
}

export const useDbStore = create<DbState>((set) => ({
  db: null,
  isLoading: true,
  error: null,

  initialize: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });

      const needsMigration = await checkMigrationNeeded(userId);
      if (needsMigration) {
        await migrateFromOldDB(userId);
      }

      const database = await getDatabase(userId);
      set({ db: database, isLoading: false });
    } catch (err) {
      console.error('Database initialization error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('DB8') || errorMessage.includes('duplicate')) {
        console.warn('Database name conflict detected. Please clear browser storage and reload.');
      }
      set({
        error: err instanceof Error ? err : new Error('Failed to initialize database'),
        isLoading: false,
      });
    }
  },

  reset: () => {
    set({ db: null, isLoading: true, error: null });
  },
}));
