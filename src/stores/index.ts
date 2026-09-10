'use client';

// --- Zustand Stores ---
export { useDbStore } from './db-store';
export { useAuthStore } from './auth-store';
export { useBoardStore } from './board-store';
export { 
  useSwimlaneSelectionStore, 
  useSwimlaneSelectionDerived,
  filterSwimlanes,
  filterItems,
  parseSelection,
  createSelection,
  type Selection,
  type ParsedSelection,
} from './swimlane-selection-store';
export { useSyncStore } from './sync-store';
export { useArchiveViewStore, type ArchiveViewTarget } from './archive-view-store';

// --- Hooks ---
export { useRxSubscription, useRxCollectionSubscription, useRxBoardSubscription } from './hooks/use-rx-subscription';
export { useBoards, useBoardsSubscription } from './hooks/use-boards';
export { useTasksSubscription, useBoardTasksSubscription, useTasks, useFilteredTasks, useActiveTasks, useArchivedTasks, useTasksLoading, taskActions } from './hooks/use-tasks';
export { useHabitsSubscription, useBoardHabitsSubscription, useHabitLogsSubscription, useHabits, useFilteredHabits, useActiveHabits, useArchivedHabits, useHabitLogs, useLogsByHabit, habitActions } from './hooks/use-habits';
export { useNotesSubscription, useBoardNotesSubscription, useNotes, useFilteredNotes, useActiveNotes, useArchivedNotes, usePinnedNotes, noteActions } from './hooks/use-notes';
export { useBookmarksSubscription, useBoardBookmarksSubscription, useBookmarks, useFilteredBookmarks, useActiveBookmarks, useArchivedBookmarks, usePinnedBookmarks, bookmarkActions } from './hooks/use-bookmarks';
export { useVisionItemsSubscription, useBoardVisionItemsSubscription, useVisionItems, useFilteredVisionItems, useActiveVisionItems, useArchivedVisionItems, visionItemActions } from './hooks/use-vision';
export { useMindmapsSubscription, useBoardMindmapsSubscription, useMindmaps, useFilteredMindmaps, useActiveMindmaps, useArchivedMindmaps, mindmapActions } from './hooks/use-mindmaps';

// --- Routine hooks ---
export { useRoutinesSubscription, useRoutineLogsSubscription, useRoutines, useActiveRoutines, useArchivedRoutines, useDueRoutines, useApprovalRequiredRoutines, useAutoProcessRoutines, useRoutineLogs, useLogsByRoutine, routineActions } from './hooks/use-routines';
