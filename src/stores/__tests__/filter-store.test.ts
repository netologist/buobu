import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore, DEFAULT_FILTERS, type KanbanFilterState } from '../filter-store';

// Reset store to initial state before each test
beforeEach(() => {
  useFilterStore.setState({ filters: { ...DEFAULT_FILTERS } });
});

describe('initial state', () => {
  it('has default filter values', () => {
    const { filters } = useFilterStore.getState();
    expect(filters).toEqual(DEFAULT_FILTERS);
  });

  it('searchText defaults to empty string', () => {
    expect(useFilterStore.getState().filters.searchText).toBe('');
  });

  it('date defaults to "all"', () => {
    expect(useFilterStore.getState().filters.date).toBe('all');
  });

  it('deadline defaults to "all"', () => {
    expect(useFilterStore.getState().filters.deadline).toBe('all');
  });

  it('priorities defaults to ["all"]', () => {
    expect(useFilterStore.getState().filters.priorities).toEqual(['all']);
  });

  it('labels defaults to empty array', () => {
    expect(useFilterStore.getState().filters.labels).toEqual([]);
  });
});

describe('setFilters', () => {
  it('replaces the entire filters object', () => {
    const newFilters: KanbanFilterState = {
      searchText: 'test query',
      date: '2026-03-26',
      deadline: 'overdue',
      priorities: ['high', 'medium'],
      labels: ['bug', 'feature'],
    };
    useFilterStore.getState().setFilters(newFilters);
    expect(useFilterStore.getState().filters).toEqual(newFilters);
  });

  it('updates searchText', () => {
    useFilterStore.getState().setFilters({ ...DEFAULT_FILTERS, searchText: 'hello' });
    expect(useFilterStore.getState().filters.searchText).toBe('hello');
  });

  it('updates priorities to a multi-value array', () => {
    useFilterStore.getState().setFilters({ ...DEFAULT_FILTERS, priorities: ['high', 'critical'] });
    expect(useFilterStore.getState().filters.priorities).toEqual(['high', 'critical']);
  });
});

describe('resetFilters', () => {
  it('restores all filters to defaults after modification', () => {
    useFilterStore.getState().setFilters({
      searchText: 'modified',
      date: '2026-01-01',
      deadline: 'overdue',
      priorities: ['high'],
      labels: ['bug'],
    });
    useFilterStore.getState().resetFilters();
    expect(useFilterStore.getState().filters).toEqual(DEFAULT_FILTERS);
  });

  it('can be called multiple times without error', () => {
    useFilterStore.getState().resetFilters();
    useFilterStore.getState().resetFilters();
    expect(useFilterStore.getState().filters).toEqual(DEFAULT_FILTERS);
  });
});
