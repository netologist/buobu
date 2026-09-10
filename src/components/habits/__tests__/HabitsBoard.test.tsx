import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// HabitsBoard uses scroll/resize observers via shadcn ScrollArea
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/habits',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/stores/hooks/use-boards', () => ({
  useBoards: vi.fn(),
  useBoardsSubscription: vi.fn(),
}));

vi.mock('@/stores', () => ({
  useHabits: vi.fn().mockReturnValue([]),
  useHabitLogs: vi.fn().mockReturnValue([]),
  useHabitsSubscription: vi.fn(),
  useHabitLogsSubscription: vi.fn(),
}));

vi.mock('@/stores/db-store', () => ({
  useDbStore: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/db', () => ({
  putHabit: vi.fn().mockResolvedValue(undefined),
  deleteHabit: vi.fn().mockResolvedValue(undefined),
  putHabitLog: vi.fn().mockResolvedValue(undefined),
  putTimeblock: vi.fn().mockResolvedValue(undefined),
  archiveTimeblock: vi.fn().mockResolvedValue(undefined),
  unarchiveTimeblock: vi.fn().mockResolvedValue(undefined),
  permanentDeleteTimeblock: vi.fn().mockResolvedValue(undefined),
  detachFromTimeblock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ middlePanel, rightPanel }: { middlePanel: React.ReactNode; rightPanel: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-layout' },
      React.createElement('div', { 'data-testid': 'middle' }, middlePanel),
      React.createElement('div', { 'data-testid': 'right' }, rightPanel),
    ),
}));

vi.mock('@/components/ui/swimlane-dialog', () => ({
  SwimlaneDialog: () => null,
}));

vi.mock('@/stores/swimlane-selection-store', () => ({
  useSwimlaneSelectionStore: () => ({ selections: [], clearSelection: vi.fn() }),
  useSwimlaneSelectionDerived: () => ({
    selections: [],
    isAllSelected: false,
    selectedSwimlaneIds: new Set(),
    selectedBoardIds: new Set(),
    primaryBoardId: null,
    hasSelections: false,
    isSwimlaneSelected: vi.fn().mockReturnValue(false),
    isBoardSelected: vi.fn().mockReturnValue(false),
  }),
  filterSwimlanes: (s: unknown[]) => s,
  filterItems: (items: unknown[]) => items,
}));

vi.mock('@/stores/archive-filter-store', () => ({
  useArchiveFilterStore: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/naming', () => ({
  DEFAULT_NAMING: { task: 'Task', habit: 'Habit' },
}));

vi.mock('@/contexts/NamingContext', () => ({
  NamingProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  useNaming: () => ({ task: 'Task', habit: 'Habit' }),
}));

// Seed data mock
vi.mock('@/data/habits.json', () => ({ default: [] }));

import { HabitsBoard } from '../HabitsBoard';
import { useBoards } from '@/stores/hooks/use-boards';
import { useHabits, useHabitLogs } from '@/stores';
import { makeBoard, makeSwimlane, makeHabit, makeHabitLog } from '@/test/factories';

function setupBoards() {
  const board = makeBoard({ name: 'Habits Board' });
  const swimlane = makeSwimlane({ boardId: board.id, name: 'Daily' });
  vi.mocked(useBoards).mockReturnValue({
    boards: [board],
    swimlanes: [swimlane],
    activeBoards: [board],
    activeSwimlanes: [swimlane],
    filteredSwimlanes: [swimlane],
    board,
    labels: { task: 'Task' } as never,
    isLoading: false,
    isArchivedSelectionMode: false,
    selections: [],
    isAllSelected: true,
    selectedSwimlaneIds: new Set([swimlane.id]),
    selectedBoardIds: new Set([board.id]),
    primaryBoardId: board.id,
    hasSelections: false,
    isSwimlaneSelected: vi.fn().mockReturnValue(true),
    isBoardSelected: vi.fn().mockReturnValue(true),
    selectAll: vi.fn(),
    selectBoard: vi.fn(),
    toggleSwimlane: vi.fn(),
    clearSelection: vi.fn(),
    putBoard: vi.fn(),
    deleteBoard: vi.fn(),
    putSwimlane: vi.fn(),
    deleteSwimlane: vi.fn(),
    loadBoards: vi.fn(),
    reloadSwimlanes: vi.fn(),
  });
  return { board, swimlane };
}

describe('HabitsBoard — rendering', () => {
  beforeEach(() => {
    setupBoards();
    vi.mocked(useHabits).mockReturnValue([]);
    vi.mocked(useHabitLogs).mockReturnValue([]);
  });

  it('renders the app layout', () => {
    render(<HabitsBoard />);
    expect(screen.getByTestId('app-layout')).toBeDefined();
  });

  it('renders with empty habits without crashing', () => {
    render(<HabitsBoard />);
    expect(screen.getByTestId('app-layout')).toBeDefined();
  });

  it('renders habit names in the grid', () => {
    const { board, swimlane } = setupBoards();
    const habit = makeHabit({ boardId: board.id, swimlaneId: swimlane.id, title: 'Morning Run' });
    vi.mocked(useHabits).mockReturnValue([habit]);
    render(<HabitsBoard />);
    expect(screen.getAllByText('Morning Run').length).toBeGreaterThan(0);
  });

  it('renders multiple habits', () => {
    const { board, swimlane } = setupBoards();
    const habits = [
      makeHabit({ boardId: board.id, swimlaneId: swimlane.id, title: 'Habit A' }),
      makeHabit({ boardId: board.id, swimlaneId: swimlane.id, title: 'Habit B' }),
    ];
    vi.mocked(useHabits).mockReturnValue(habits);
    render(<HabitsBoard />);
    expect(screen.getAllByText('Habit A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Habit B').length).toBeGreaterThan(0);
  });
});

describe('HabitsBoard — add habit button', () => {
  beforeEach(() => {
    setupBoards();
    vi.mocked(useHabits).mockReturnValue([]);
    vi.mocked(useHabitLogs).mockReturnValue([]);
  });

  it('shows add habit button', () => {
    render(<HabitsBoard />);
    expect(screen.getByText(/add habit/i)).toBeDefined();
  });

  it('opens habit dialog when add habit is clicked', async () => {
    const user = userEvent.setup();
    render(<HabitsBoard />);
    const addBtn = screen.getByText(/add habit/i);
    await user.click(addBtn);
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
    });
  });
});

describe('HabitsBoard — habit log display', () => {
  it('renders habit logs for current week', () => {
    const { board, swimlane } = setupBoards();
    const habit = makeHabit({ boardId: board.id, swimlaneId: swimlane.id, title: 'Yoga' });
    const today = new Date().toISOString().split('T')[0];
    const log = makeHabitLog({ habitId: habit.id, date: today, value: 2 });

    vi.mocked(useHabits).mockReturnValue([habit]);
    vi.mocked(useHabitLogs).mockReturnValue([log]);

    render(<HabitsBoard />);
    expect(screen.getAllByText('Yoga').length).toBeGreaterThan(0);
  });
});
