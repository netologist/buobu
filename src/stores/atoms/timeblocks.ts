'use client';

import { atom } from 'jotai';
import type { Timeblock } from '@/lib/types';

// --- Base atoms ---
export const timeblocksAtom = atom<Timeblock[]>([]);
export const timeblocksLoadingAtom = atom<boolean>(true);

// --- Derived atoms ---

/** Active (non-archived) timeblocks */
export const activeTimeblocksAtom = atom<Timeblock[]>((get) =>
  get(timeblocksAtom).filter((tb) => !tb.archived)
);

export const archivedTimeblocksAtom = atom<Timeblock[]>((get) =>
  get(timeblocksAtom).filter((tb) => tb.archived === true)
);
