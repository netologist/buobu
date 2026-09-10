import { describe, it, expect, beforeEach } from 'vitest';
import { useArchiveFilterStore } from '../archive-filter-store';
import { useArchiveViewStore, type ArchiveViewTarget } from '../archive-view-store';

beforeEach(() => {
  useArchiveFilterStore.setState({ showArchivedItems: false, isLockedBySelection: false });
  useArchiveViewStore.setState({ target: null });
});

// ── ArchiveFilterStore ────────────────────────────────────────────────────────

describe('useArchiveFilterStore', () => {
  describe('initial state', () => {
    it('showArchivedItems is false', () => {
      expect(useArchiveFilterStore.getState().showArchivedItems).toBe(false);
    });

    it('isLockedBySelection is false', () => {
      expect(useArchiveFilterStore.getState().isLockedBySelection).toBe(false);
    });
  });

  describe('setShowArchivedItems', () => {
    it('sets showArchivedItems to true', () => {
      useArchiveFilterStore.getState().setShowArchivedItems(true);
      expect(useArchiveFilterStore.getState().showArchivedItems).toBe(true);
    });

    it('sets showArchivedItems back to false', () => {
      useArchiveFilterStore.getState().setShowArchivedItems(true);
      useArchiveFilterStore.getState().setShowArchivedItems(false);
      expect(useArchiveFilterStore.getState().showArchivedItems).toBe(false);
    });
  });

  describe('setLockedBySelection', () => {
    it('sets isLockedBySelection to true', () => {
      useArchiveFilterStore.getState().setLockedBySelection(true);
      expect(useArchiveFilterStore.getState().isLockedBySelection).toBe(true);
    });

    it('sets isLockedBySelection to false', () => {
      useArchiveFilterStore.getState().setLockedBySelection(true);
      useArchiveFilterStore.getState().setLockedBySelection(false);
      expect(useArchiveFilterStore.getState().isLockedBySelection).toBe(false);
    });
  });
});

// ── ArchiveViewStore ──────────────────────────────────────────────────────────

describe('useArchiveViewStore', () => {
  const target: ArchiveViewTarget = {
    boardId: 'board-1',
    swimlaneId: 'lane-1',
    entityType: 'task',
    entityId: 'task-1',
  };

  describe('initial state', () => {
    it('target is null', () => {
      expect(useArchiveViewStore.getState().target).toBeNull();
    });
  });

  describe('enter', () => {
    it('sets the target', () => {
      useArchiveViewStore.getState().enter(target);
      expect(useArchiveViewStore.getState().target).toEqual(target);
    });

    it('replaces a previous target', () => {
      const second: ArchiveViewTarget = { boardId: 'board-2' };
      useArchiveViewStore.getState().enter(target);
      useArchiveViewStore.getState().enter(second);
      expect(useArchiveViewStore.getState().target?.boardId).toBe('board-2');
    });

    it('works with only boardId (minimal target)', () => {
      useArchiveViewStore.getState().enter({ boardId: 'board-x' });
      expect(useArchiveViewStore.getState().target?.boardId).toBe('board-x');
    });
  });

  describe('exit', () => {
    it('clears the target to null', () => {
      useArchiveViewStore.getState().enter(target);
      useArchiveViewStore.getState().exit();
      expect(useArchiveViewStore.getState().target).toBeNull();
    });

    it('calling exit when already null does not throw', () => {
      expect(() => useArchiveViewStore.getState().exit()).not.toThrow();
    });
  });
});
