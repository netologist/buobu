'use client';

import { create } from 'zustand';

interface ArchiveFilterState {
  showArchivedItems: boolean;
  setShowArchivedItems: (value: boolean) => void;
  /** True when the current selection forces archived mode (archived board/swimlane selected). */
  isLockedBySelection: boolean;
  setLockedBySelection: (value: boolean) => void;
}

export const useArchiveFilterStore = create<ArchiveFilterState>((set) => ({
  showArchivedItems: false,
  setShowArchivedItems: (value) => set({ showArchivedItems: value }),
  isLockedBySelection: false,
  setLockedBySelection: (value) => set({ isLockedBySelection: value }),
}));
