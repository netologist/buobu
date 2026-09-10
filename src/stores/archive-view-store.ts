'use client';

import { create } from 'zustand';

export interface ArchiveViewTarget {
  boardId: string;
  swimlaneId?: string;
  entityType?: string;
  entityId?: string;
}

interface ArchiveViewState {
  /** When set, the app is showing archived content in read-only mode */
  target: ArchiveViewTarget | null;
  /** Enter archive view mode */
  enter: (target: ArchiveViewTarget) => void;
  /** Exit archive view mode */
  exit: () => void;
}

export const useArchiveViewStore = create<ArchiveViewState>((set) => ({
  target: null,
  enter: (target) => set({ target }),
  exit: () => set({ target: null }),
}));
