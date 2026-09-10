import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/rxdb', () => ({
  getDatabase: vi.fn().mockResolvedValue({ collections: {} }),
  closeDatabase: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/migration', () => ({
  checkMigrationNeeded: vi.fn().mockResolvedValue(false),
  migrateFromOldDB: vi.fn().mockResolvedValue(undefined),
}));

import { useDbStore } from '../db-store';
import { getDatabase } from '@/lib/rxdb';
import { checkMigrationNeeded, migrateFromOldDB } from '@/lib/migration';

const resetStore = () =>
  useDbStore.setState({ db: null, isLoading: true, error: null });

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
});

describe('initial state', () => {
  it('db is null', () => {
    expect(useDbStore.getState().db).toBeNull();
  });

  it('isLoading is true', () => {
    expect(useDbStore.getState().isLoading).toBe(true);
  });

  it('error is null', () => {
    expect(useDbStore.getState().error).toBeNull();
  });
});

describe('initialize', () => {
  it('calls getDatabase with the userId', async () => {
    const mockDb = { collections: {} };
    vi.mocked(getDatabase).mockResolvedValueOnce(mockDb as never);

    await useDbStore.getState().initialize('user-123');
    expect(getDatabase).toHaveBeenCalledWith('user-123');
  });

  it('stores the database instance', async () => {
    const mockDb = { collections: { tasks: {} } };
    vi.mocked(getDatabase).mockResolvedValueOnce(mockDb as never);

    await useDbStore.getState().initialize('user-1');
    expect(useDbStore.getState().db).toBe(mockDb);
  });

  it('sets isLoading to false on success', async () => {
    await useDbStore.getState().initialize('user-1');
    expect(useDbStore.getState().isLoading).toBe(false);
  });

  it('runs migration when needed', async () => {
    vi.mocked(checkMigrationNeeded).mockResolvedValueOnce(true);
    await useDbStore.getState().initialize('user-1');
    expect(migrateFromOldDB).toHaveBeenCalledWith('user-1');
  });

  it('skips migration when not needed', async () => {
    vi.mocked(checkMigrationNeeded).mockResolvedValueOnce(false);
    await useDbStore.getState().initialize('user-1');
    expect(migrateFromOldDB).not.toHaveBeenCalled();
  });

  it('sets error and isLoading=false when getDatabase throws', async () => {
    vi.mocked(getDatabase).mockRejectedValueOnce(new Error('DB init failed'));
    await useDbStore.getState().initialize('user-1');
    expect(useDbStore.getState().error?.message).toBe('DB init failed');
    expect(useDbStore.getState().isLoading).toBe(false);
    expect(useDbStore.getState().db).toBeNull();
  });
});

describe('reset', () => {
  it('sets db to null', async () => {
    const mockDb = { collections: {} };
    vi.mocked(getDatabase).mockResolvedValueOnce(mockDb as never);
    await useDbStore.getState().initialize('user-1');

    useDbStore.getState().reset();
    expect(useDbStore.getState().db).toBeNull();
  });

  it('sets isLoading to true', () => {
    useDbStore.setState({ isLoading: false });
    useDbStore.getState().reset();
    expect(useDbStore.getState().isLoading).toBe(true);
  });

  it('clears any existing error', () => {
    useDbStore.setState({ error: new Error('old error') });
    useDbStore.getState().reset();
    expect(useDbStore.getState().error).toBeNull();
  });
});
