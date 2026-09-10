import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/routines',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/stores/hooks/use-boards', () => ({
  useBoards: vi.fn(),
  useBoardsSubscription: vi.fn(),
}));

vi.mock('@/stores/hooks/use-routines', () => ({
  useRoutinesSubscription: vi.fn(),
  useRoutineLogsSubscription: vi.fn(),
  useActiveRoutines: vi.fn().mockReturnValue([]),
  routineActions: {
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    archive: vi.fn().mockResolvedValue(undefined),
    putLog: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/stores/db-store', () => ({
  useDbStore: vi.fn().mockReturnValue(null),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ middlePanel, rightPanel }: { middlePanel: React.ReactNode; rightPanel: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-layout' },
      React.createElement('div', { 'data-testid': 'middle' }, middlePanel),
      React.createElement('div', { 'data-testid': 'right' }, rightPanel),
    ),
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

vi.mock('@/components/ui/swimlane-picker-modal', () => ({
  SwimlanePickerModal: () => null,
}));

vi.mock('@/components/routines/RoutineDialog', () => ({
  RoutineDialog: ({ open }: { open: boolean; onOpenChange: (v: boolean) => void }) =>
    open ? React.createElement('div', { 'data-testid': 'routine-dialog' }) : null,
}));

vi.mock('@/components/routines/RoutineDetailView', () => ({
  RoutineDetailView: () => React.createElement('div', { 'data-testid': 'routine-detail' }),
}));

import { RoutinesBoard } from '../RoutinesBoard';
import { useBoards } from '@/stores/hooks/use-boards';
import { useActiveRoutines } from '@/stores/hooks/use-routines';
import { makeBoard, makeSwimlane, makeRoutine } from '@/test/factories';

function setupBoards() {
  const board = makeBoard({ name: 'Routines Board' });
  const swimlane = makeSwimlane({ boardId: board.id, name: 'Morning' });
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

describe('RoutinesBoard — rendering', () => {
  beforeEach(() => {
    setupBoards();
    vi.mocked(useActiveRoutines).mockReturnValue([]);
  });

  it('renders the app layout', () => {
    render(<RoutinesBoard />);
    expect(screen.getByTestId('app-layout')).toBeDefined();
  });

  it('renders without routines without crashing', () => {
    render(<RoutinesBoard />);
    expect(screen.getByTestId('app-layout')).toBeDefined();
  });

  it('renders routine names', () => {
    const { swimlane } = setupBoards();
    const routine = makeRoutine({ swimlaneId: swimlane.id, title: 'Morning Workout' });
    vi.mocked(useActiveRoutines).mockReturnValue([routine]);
    render(<RoutinesBoard />);
    expect(screen.getByText('Morning Workout')).toBeDefined();
  });

  it('renders multiple routines', () => {
    const { swimlane } = setupBoards();
    const routines = [
      makeRoutine({ swimlaneId: swimlane.id, title: 'Morning Routine' }),
      makeRoutine({ swimlaneId: swimlane.id, title: 'Evening Routine' }),
    ];
    vi.mocked(useActiveRoutines).mockReturnValue(routines);
    render(<RoutinesBoard />);
    expect(screen.getByText('Morning Routine')).toBeDefined();
    expect(screen.getByText('Evening Routine')).toBeDefined();
  });

  it('shows search input', () => {
    render(<RoutinesBoard />);
    expect(screen.getByPlaceholderText('Search…')).toBeDefined();
  });
});

describe('RoutinesBoard — add routine', () => {
  beforeEach(() => {
    setupBoards();
    vi.mocked(useActiveRoutines).mockReturnValue([]);
  });

  it('shows add routine button', () => {
    render(<RoutinesBoard />);
    expect(screen.getByText(/add routine/i)).toBeDefined();
  });

  it('opens routine dialog when add routine is clicked', async () => {
    const user = userEvent.setup();
    render(<RoutinesBoard />);
    const addBtn = screen.getByText(/add routine/i);
    await user.click(addBtn);
    await waitFor(() => {
      expect(screen.getByTestId('routine-dialog')).toBeDefined();
    });
  });
});

describe('RoutinesBoard — search', () => {
  beforeEach(() => {
    setupBoards();
  });

  it('filters routines by search term', async () => {
    const user = userEvent.setup();
    const { swimlane } = setupBoards();
    const routines = [
      makeRoutine({ swimlaneId: swimlane.id, title: 'Morning Yoga' }),
      makeRoutine({ swimlaneId: swimlane.id, title: 'Evening Walk' }),
    ];
    vi.mocked(useActiveRoutines).mockReturnValue(routines);

    render(<RoutinesBoard />);
    const searchInput = screen.getByPlaceholderText('Search…');
    await user.type(searchInput, 'Morning');

    await waitFor(() => {
      expect(screen.getByText('Morning Yoga')).toBeDefined();
      expect(screen.queryByText('Evening Walk')).toBeNull();
    });
  });
});
