'use client';

import { atom } from 'jotai';
import type { Bookmark } from '@/lib/types';
import { useSwimlaneSelectionStore, filterItems } from '../swimlane-selection-store';

export const bookmarksAtom = atom<Bookmark[]>([]);
export const bookmarksLoadingAtom = atom<boolean>(false);

export const filteredBookmarksAtom = atom<Bookmark[]>((get) => {
  const bookmarks = get(bookmarksAtom);
  const selections = useSwimlaneSelectionStore.getState().selections;
  return filterItems(bookmarks, selections);
});

export const activeBookmarksAtom = atom<Bookmark[]>((get) => {
  const bookmarks = get(bookmarksAtom);
  return bookmarks.filter((bookmark) => !bookmark.archived);
});
export const archivedBookmarksAtom = atom<Bookmark[]>((get) => {
  const bookmarks = get(bookmarksAtom);
  return bookmarks.filter((bookmark) => bookmark.archived === true);
});

export const pinnedBookmarksAtom = atom<Bookmark[]>((get) => {
  const bookmarks = get(bookmarksAtom);
  return bookmarks.filter((bookmark) => !!bookmark.pinned);
});

