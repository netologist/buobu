import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/kanban',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock all store hooks
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
  getBacklogBySwimlane: vi.fn().mockResolvedValue([]),
  getBacklogCountsBySwimlane: vi.fn().mockResolvedValue({}),
  putBacklogItem: vi.fn(),
  deleteBacklogItem: vi.fn(),
}));

// Mock complex sub-components
vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ middlePanel, rightPanel }: { middlePanel: React.ReactNode; rightPanel: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-layout' },
      React.createElement('div', { 'data-testid': 'middle' }, middlePanel),
      React.createElement('div', { 'data-testid': 'right' }, rightPanel),
    ),
}));

vi.mock('@/components/kanban/KanbanSwimlanePanel', () => ({
  KanbanSwimlanePanel: ({ rows }: { rows: unknown[] }) =>
    React.createElement('div', { 'data-testid': 'swimlane-panel', 'data-rows': rows?.length ?? 0 }),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  DragOverlay: () => null,
  PointerSensor: class {},
  TouchSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn().mockReturnValue([]),
  useDroppable: vi.fn().mockReturnValue({ setNodeRef: vi.fn(), isOver: false }),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  useSortable: vi.fn().mockReturnValue({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock('@/hooks/useDeferredMount', () => ({
  useDeferredMount: () => ({
    containerRef: { current: null },
    shouldRender: true,
  }),
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

vi.mock('@/contexts/BoardConfigContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/contexts/BoardConfigContext')>();

  return {
    ...actual,
    useBoardConfig: () => ({
      routineTitleById: {},
      archiveColumnId: 'done',
    }),
  };
});

import { KanbanBoard } from '../KanbanBoard';
import { KanbanColumn } from '../KanbanColumn';
import { useBoards } from '@/stores/hooks/use-boards';
import { useTasks } from '@/stores';
import { deleteTask, getBacklogCountsBySwimlane, putTask, putTasks } from '@/lib/db';
import { makeBoard, makeSwimlane, makeTask } from '@/test/factories';

function makeDefaultBoards() {
  const board = makeBoard({ name: 'My Board' });
  const swimlane = makeSwimlane({ boardId: board.id, name: 'Sprint 1' });
  return { board, swimlane };
}

function setupMocks(boardOverrides?: Partial<ReturnType<typeof makeDefaultBoards>>) {
  const { board, swimlane } = { ...makeDefaultBoards(), ...boardOverrides };
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

async function renderBoardAndWaitForBacklog() {
  render(<KanbanBoard />);
  await waitFor(() => expect(getBacklogCountsBySwimlane).toHaveBeenCalled());
}

describe('KanbanBoard — rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
    vi.mocked(useTasks).mockReturnValue([]);
    vi.mocked(getBacklogCountsBySwimlane).mockResolvedValue({});
  });

  it('renders the app layout', async () => {
    await renderBoardAndWaitForBacklog();
    expect(screen.getByTestId('app-layout')).toBeDefined();
  });

  it('renders swimlane panel', async () => {
    await renderBoardAndWaitForBacklog();
    expect(screen.getByTestId('swimlane-panel')).toBeDefined();
  });

  it('renders with empty task list', async () => {
    vi.mocked(useTasks).mockReturnValue([]);
    await renderBoardAndWaitForBacklog();
    expect(screen.getByTestId('app-layout')).toBeDefined();
  });

  it('renders with tasks', async () => {
    const { board, swimlane } = setupMocks();
    const tasks = [
      makeTask({ boardId: board.id, swimlaneId: swimlane.id, columnId: 'todo' }),
      makeTask({ boardId: board.id, swimlaneId: swimlane.id, columnId: 'in-progress' }),
    ];
    vi.mocked(useTasks).mockReturnValue(tasks);
    await renderBoardAndWaitForBacklog();
    expect(screen.getByTestId('app-layout')).toBeDefined();
  });

  it('renders each column with a full-height drop zone', () => {
    const { container } = render(
      <KanbanColumn
        droppableId="lane-1::todo"
        tasks={[]}
        swimlaneCurrency="TRY"
        onOpenTask={vi.fn()}
        onStartPomodoro={vi.fn()}
        onArchiveTask={vi.fn()}
        onAddCard={vi.fn()}
      />,
    );

    const dropzone = container.querySelector('[data-kanban-dropzone="lane-1::todo"]');
    const addCardButton = screen.getByRole('button', { name: /\+ add card/i });

    expect(dropzone).not.toBeNull();
    expect(dropzone!).toHaveClass('h-full');
    expect(dropzone!).toHaveClass('w-full');
    expect(addCardButton).not.toHaveClass('mt-auto');
  });

  it('does not render + Add card in archive column', () => {
    render(
      <KanbanColumn
        droppableId="lane-1::done"
        tasks={[]}
        swimlaneCurrency="TRY"
        onOpenTask={vi.fn()}
        onStartPomodoro={vi.fn()}
        onArchiveTask={vi.fn()}
        onAddCard={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /\+ add card/i })).toBeNull();
  });

  it('applies a warm tone to archive column', () => {
    const { container } = render(
      <KanbanColumn
        droppableId="lane-1::done"
        tasks={[]}
        swimlaneCurrency="TRY"
        onOpenTask={vi.fn()}
        onStartPomodoro={vi.fn()}
        onArchiveTask={vi.fn()}
        onAddCard={vi.fn()}
      />,
    );

    expect(container.firstChild).toHaveClass('bg-amber-50/70');
  });
});

describe('KanbanBoard — loading state', () => {
  it('renders without crashing during loading', () => {
    vi.mocked(useBoards).mockReturnValue({
      ...vi.mocked(useBoards).getMockImplementation()?.() ?? {},
      boards: [],
      swimlanes: [],
      activeBoards: [],
      activeSwimlanes: [],
      filteredSwimlanes: [],
      board: null,
      isLoading: true,
    } as never);
    expect(() => render(<KanbanBoard />)).not.toThrow();
  });
});

describe('KanbanBoard — add card persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
    vi.mocked(useTasks).mockReturnValue([]);
    vi.mocked(getBacklogCountsBySwimlane).mockResolvedValue({});
  });

  it('does not persist new card until Save is clicked', async () => {
    await renderBoardAndWaitForBacklog();

    fireEvent.click(screen.getAllByRole('button', { name: /\+ add card/i })[0]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^save$/i })).toBeDefined();
    });
    expect(putTask).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    await waitFor(() => {
      expect(putTask).not.toHaveBeenCalled();
      expect(deleteTask).not.toHaveBeenCalled();
    });
  });

  it('persists new card on Save', async () => {
    await renderBoardAndWaitForBacklog();

    fireEvent.click(screen.getAllByRole('button', { name: /\+ add card/i })[0]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^save$/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => {
      expect(putTask).toHaveBeenCalledTimes(1);
    });
  });
});

describe('KanbanBoard — bulk move to archive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { board, swimlane } = setupMocks();
    vi.mocked(useTasks).mockReturnValue([
      makeTask({
        boardId: board.id,
        swimlaneId: swimlane.id,
        columnId: 'done',
        title: 'Done Task A',
        archived: false,
      }),
    ]);
    vi.mocked(getBacklogCountsBySwimlane).mockResolvedValue({});
  });

  it('asks for scope and archives selected done tasks on Yes', async () => {
    await renderBoardAndWaitForBacklog();

    fireEvent.click(screen.getByRole('button', { name: /move to archive/i }));
    await waitFor(() => {
      expect(screen.getByText(/move done column tasks to archive/i)).toBeDefined();
    });

    expect(screen.getByText(/all done tasks/i)).toBeDefined();
    expect(screen.getByText(/only filtered done tasks/i)).toBeDefined();
    expect(screen.getByText('Done Task A')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));
    await waitFor(() => {
      expect(putTasks).toHaveBeenCalledTimes(1);
    });

    const archivedBatch = vi.mocked(putTasks).mock.calls[0]?.[0] ?? [];
    expect(archivedBatch.length).toBeGreaterThan(0);
    expect(archivedBatch[0]?.archived).toBe(true);
  });

  it('does not archive when user clicks No', async () => {
    await renderBoardAndWaitForBacklog();

    fireEvent.click(screen.getByRole('button', { name: /move to archive/i }));
    await waitFor(() => {
      expect(screen.getByText(/move done column tasks to archive/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /^no$/i }));
    await waitFor(() => {
      expect(putTasks).not.toHaveBeenCalled();
    });
  });
});
