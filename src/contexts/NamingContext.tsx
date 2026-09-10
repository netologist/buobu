'use client';

import { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import type { NamingLabels, Board } from '@/lib/types';
import { DEFAULT_NAMING } from '@/lib/naming';
import { putBoard } from '@/lib/db';

export type NamingContextType = {
  labels: NamingLabels;
  updateNaming: (labels: NamingLabels) => Promise<void>;
  isLoading: boolean;
};

const NamingContext = createContext<NamingContextType | undefined>(undefined);

export function NamingProvider({ children, board, onBoardUpdated }: { 
  children: ReactNode; 
  board?: Board | null;
  onBoardUpdated?: (board: Board) => void;
}) {
  const labels = useMemo(() => board?.naming ?? DEFAULT_NAMING, [board?.naming]);
  const updateNaming = useCallback(async (newLabels: NamingLabels) => {
    if (board) {
      const updatedBoard = await putBoard({
        ...board,
        naming: newLabels,
      });
      if (updatedBoard && onBoardUpdated) {
        onBoardUpdated(updatedBoard);
      }
    }
  }, [board, onBoardUpdated]);

  const value = useMemo((): NamingContextType => ({
    labels,
    updateNaming,
    isLoading: false,
  }), [labels, updateNaming]);

  return (
    <NamingContext.Provider value={value}>
      {children}
    </NamingContext.Provider>
  );
}

export function useNaming(): NamingContextType {
  const context = useContext(NamingContext);
  
  if (context !== undefined) {
    return context;
  }
  
  return {
    labels: DEFAULT_NAMING,
    updateNaming: async () => {},
    isLoading: false,
  };
}

export function getDefaultNaming(): NamingLabels {
  return DEFAULT_NAMING;
}
