'use client';

import { useAtomValue } from 'jotai';
import { useRxCollectionSubscription, useRxBoardSubscription } from './use-rx-subscription';
import { bookmarksAtom, bookmarksLoadingAtom, filteredBookmarksAtom, activeBookmarksAtom, archivedBookmarksAtom, pinnedBookmarksAtom } from '../atoms/bookmarks';
import * as db from '@/lib/db';

export function useBookmarksSubscription() {
  useRxCollectionSubscription('bookmarks', bookmarksAtom, bookmarksLoadingAtom);
}

export function useBoardBookmarksSubscription(boardId: string | null | undefined) {
  useRxBoardSubscription('bookmarks', boardId, bookmarksAtom, bookmarksLoadingAtom);
}

export function useBookmarks() {
  return useAtomValue(bookmarksAtom);
}

export function useFilteredBookmarks() {
  return useAtomValue(filteredBookmarksAtom);
}

export function useActiveBookmarks() {
  return useAtomValue(activeBookmarksAtom);
}

export function useArchivedBookmarks() {
  return useAtomValue(archivedBookmarksAtom);
}

export function usePinnedBookmarks() {
  return useAtomValue(pinnedBookmarksAtom);
}

export const bookmarkActions = {
  put: db.putBookmark,
  delete: db.deleteBookmark,
};

