import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/kanban/calendar',
}));

vi.mock('@/stores/hooks/use-boards', () => ({
  useBoards: vi.fn(),
  useBoardsSubscription: vi.fn(),
}));

vi.mock('@/stores/db-store', () => ({
  useDbStore: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/db', () => ({
  getAllTasks: vi.fn().mockResolvedValue([]),
}));

// Mock FullCalendar which requires complex browser APIs
vi.mock('@fullcalendar/react', () => {
  const FullCalendarMock = React.forwardRef<HTMLDivElement, { events?: unknown[] }>(
    ({ events }, ref) =>
      React.createElement('div', {
        ref,
        'data-testid': 'fullcalendar',
        'data-events': events?.length ?? 0,
      }),
  );
  FullCalendarMock.displayName = 'FullCalendarMock';
  return { default: FullCalendarMock };
});

vi.mock('@fullcalendar/daygrid', () => ({ default: {} }));
vi.mock('@fullcalendar/timegrid', () => ({ default: {} }));
vi.mock('@fullcalendar/interaction', () => ({ default: {} }));

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

import TasksCalendar from '../TasksCalendar';
import { useBoards } from '@/stores/hooks/use-boards';
import { getAllTasks } from '@/lib/db';
import { makeBoard, makeSwimlane, makeTask } from '@/test/factories';

function setupBoards() {
  const board = makeBoard({ name: 'Calendar Board' });
  const swimlane = makeSwimlane({ boardId: board.id });
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
    isAllSelected: false,
    selectedSwimlaneIds: new Set(),
    selectedBoardIds: new Set(),
    primaryBoardId: board.id,
    hasSelections: false,
    isSwimlaneSelected: vi.fn().mockReturnValue(false),
    isBoardSelected: vi.fn().mockReturnValue(false),
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

describe('TasksCalendar — rendering', () => {
  beforeEach(() => {
    setupBoards();
    vi.mocked(getAllTasks).mockResolvedValue([]);
  });

  it('renders the app layout', async () => {
    render(<TasksCalendar />);
    await waitFor(() => expect(screen.getByTestId('app-layout')).toBeDefined());
  });

  it('renders FullCalendar component', async () => {
    render(<TasksCalendar />);
    await waitFor(() => expect(screen.getByTestId('fullcalendar')).toBeDefined());
  });

  it('fetches tasks on mount', async () => {
    render(<TasksCalendar />);
    await waitFor(() => expect(getAllTasks).toHaveBeenCalledOnce());
  });

  it('renders with no tasks without crashing', async () => {
    vi.mocked(getAllTasks).mockResolvedValue([]);
    render(<TasksCalendar />);
    await waitFor(() => expect(screen.getByTestId('fullcalendar')).toBeDefined());
    expect(screen.getByTestId('fullcalendar').getAttribute('data-events')).toBe('0');
  });

  it('renders without crashing when tasks have due dates', async () => {
    const { board, swimlane } = setupBoards();
    const taskDate = new Date().toISOString();
    const tasks = [
      makeTask({ boardId: board.id, swimlaneId: swimlane.id, date: taskDate }),
      makeTask({ boardId: board.id, swimlaneId: swimlane.id, date: taskDate }),
    ];
    vi.mocked(getAllTasks).mockResolvedValue(tasks);
    // Should render the calendar without throwing
    expect(() => render(<TasksCalendar />)).not.toThrow();
    await waitFor(() => expect(screen.getByTestId('fullcalendar')).toBeDefined());
  });
});
