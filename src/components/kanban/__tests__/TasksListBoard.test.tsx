import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/kanban/list',
}));

vi.mock('@/stores/hooks/use-boards', () => ({
  useBoards: vi.fn(),
  useBoardsSubscription: vi.fn(),
}));

vi.mock('@/stores', () => ({
  useHabits: vi.fn().mockReturnValue([]),
  useBoardHabitsSubscription: vi.fn(),
  useActiveRoutines: vi.fn().mockReturnValue([]),
  useTasks: vi.fn().mockReturnValue([]),
  useBoardTasksSubscription: vi.fn(),
}));

vi.mock('@/stores/db-store', () => ({
  useDbStore: vi.fn().mockReturnValue(null),
}));

const boardStoreState = { boards: [] as import('@/lib/types').Board[], swimlanes: [] as import('@/lib/types').Swimlane[] };
vi.mock('@/stores/board-store', () => ({
  useBoardStore: (selector: (s: typeof boardStoreState) => unknown) => selector(boardStoreState),
}));

vi.mock('@/lib/db', () => ({
  putTask: vi.fn(),
  putTasks: vi.fn(),
  deleteTask: vi.fn(),
  getBacklogCountsBySwimlane: vi.fn().mockResolvedValue({}),
  putBacklogItem: vi.fn(),
  deleteBacklogItem: vi.fn(),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ middlePanel, rightPanel }: { middlePanel: React.ReactNode; rightPanel: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-layout' },
      React.createElement('div', { 'data-testid': 'middle' }, middlePanel),
      React.createElement('div', { 'data-testid': 'right' }, rightPanel),
    ),
}));

vi.mock('@/components/kanban/KanbanSwimlanePanel', () => ({
  KanbanSwimlanePanel: () => React.createElement('div', { 'data-testid': 'swimlane-panel' }),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  DragOverlay: () => null,
  PointerSensor: class {},
  TouchSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn().mockReturnValue([]),
  useDroppable: vi.fn().mockReturnValue({ setNodeRef: vi.fn(), isOver: false }),
  useDraggable: vi.fn().mockReturnValue({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  useSortable: vi.fn().mockReturnValue({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
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
}));

vi.mock('@/stores/archive-filter-store', () => ({
  useArchiveFilterStore: vi.fn().mockReturnValue(false),
}));

vi.mock('@/stores/filter-store', () => ({
  useFilterStore: vi.fn((selector?: (state: {
    filters: {
      searchText: string;
      priorities: string[];
      labels: string[];
      date: string;
      deadline: string;
    };
    setFilters: ReturnType<typeof vi.fn>;
    resetFilters: ReturnType<typeof vi.fn>;
  }) => unknown) => {
    const state = {
      filters: { searchText: '', priorities: ['all'], labels: [], date: 'all', deadline: 'all' },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

vi.mock('@/lib/naming', () => ({
  DEFAULT_NAMING: { task: 'Task', habit: 'Habit' },
}));

vi.mock('@/contexts/NamingContext', () => ({
  NamingProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  useNaming: () => ({ task: 'Task', habit: 'Habit' }),
}));

import { TasksListBoard } from '../TasksListBoard';
import { useBoards } from '@/stores/hooks/use-boards';
import { useTasks } from '@/stores';
import { makeBoard, makeSwimlane, makeTask } from '@/test/factories';

function setupBoards() {
  const board = makeBoard({ name: 'Work Board' });
  const swimlane = makeSwimlane({ boardId: board.id, name: 'Active' });
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
    selections: [`${board.id}:*`],
    isAllSelected: false,
    selectedSwimlaneIds: new Set([swimlane.id]),
    selectedBoardIds: new Set([board.id]),
    primaryBoardId: board.id,
    hasSelections: true,
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

function renderBoard() {
  render(<TasksListBoard />);
}

describe('TasksListBoard — rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupBoards();
    vi.mocked(useTasks).mockReturnValue([]);
  });

  it('renders the app layout wrapper', () => {
    renderBoard();
    expect(screen.getByTestId('app-layout')).toBeDefined();
  });

  it('renders the right panel', () => {
    renderBoard();
    expect(screen.getByTestId('right')).toBeDefined();
  });

  it('renders with empty task list without crashing', () => {
    vi.mocked(useTasks).mockReturnValue([]);
    renderBoard();
    expect(screen.getByTestId('app-layout')).toBeDefined();
  });

  it('renders with tasks without crashing', () => {
    const { board, swimlane } = setupBoards();
    const tasks = [
      makeTask({ boardId: board.id, swimlaneId: swimlane.id, title: 'First task' }),
      makeTask({ boardId: board.id, swimlaneId: swimlane.id, title: 'Second task' }),
    ];
    vi.mocked(useTasks).mockReturnValue(tasks);
    renderBoard();
    expect(screen.getByTestId('app-layout')).toBeDefined();
  });
});

describe('TasksListBoard — loading state', () => {
  it('renders without crashing when boards are loading', () => {
    vi.mocked(useBoards).mockReturnValue({
      boards: [],
      swimlanes: [],
      activeBoards: [],
      activeSwimlanes: [],
      filteredSwimlanes: [],
      board: null,
      isLoading: true,
      selectedSwimlaneIds: new Set(),
      selectedBoardIds: new Set(),
      primaryBoardId: null,
      hasSelections: false,
      isAllSelected: false,
      selections: [],
      isSwimlaneSelected: vi.fn().mockReturnValue(false),
      isBoardSelected: vi.fn().mockReturnValue(false),
      isArchivedSelectionMode: false,
      labels: { task: 'Task' },
    } as never);
    vi.mocked(useTasks).mockReturnValue([]);
    expect(() => render(<TasksListBoard />)).not.toThrow();
  });
});

describe('TasksListBoard — task detail interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupBoards();
  });

  it('allows adding checklist and comment in task modal', async () => {
    const user = userEvent.setup();
    const { board, swimlane } = setupBoards();
    const task = makeTask({
      boardId: board.id,
      swimlaneId: swimlane.id,
      columnId: board.columns?.[0]?.id,
      title: 'Modal test task',
      comments: [],
      checklists: [],
    });
    vi.mocked(useTasks).mockReturnValue([task]);

    render(<TasksListBoard />);

    await user.click(screen.getByText('Modal test task'));

    await user.click(screen.getByRole('tab', { name: 'Comments' }));
    await user.type(screen.getByPlaceholderText('Write a comment...'), 'first comment');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));
    expect(screen.getByText('first comment')).toBeDefined();

    await user.click(screen.getByRole('tab', { name: 'Checklists' }));
    await user.type(screen.getByPlaceholderText('New checklist title'), 'My list');
    await user.click(screen.getByRole('button', { name: 'Add list' }));
    expect(screen.getByText('My list')).toBeDefined();
  });
});
