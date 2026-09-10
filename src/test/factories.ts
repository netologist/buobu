/**
 * Test factories for all domain entities.
 *
 * Each factory returns a valid entity with sensible defaults.
 * Override specific fields by passing a partial object.
 *
 * Usage:
 *   const task = makeTask({ title: 'Write tests', priority: 'high' })
 *   const board = makeBoard({ name: 'Work' })
 */

import type {
  Board,
  BoardColumn,
  Swimlane,
  Task,
  TaskComment,
  Checklist,
  ChecklistItem,
  TaskTransaction,
  TaskWorklog,
  BacklogItem,
  Habit,
  HabitLog,
  RecurrenceRule,
  Routine,
  RoutineLog,
  Note,
  Bookmark,
  Mindmap,
  MindmapNode,
  VisionBoardItem,
  BaseEntity,
} from '@/lib/types';

let _seq = 0;
const seq = () => String(++_seq).padStart(6, '0');
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

// ── BaseEntity ────────────────────────────────────────────────────────────────

export const TEST_USER_ID = 'test-user-00000000';

function baseEntity(overrides: Partial<BaseEntity> = {}): BaseEntity {
  return {
    user_id: TEST_USER_ID,
    _modified: Date.now(),
    _version: 1,
    _createdAt: now(),
    _updatedAt: now(),
    _deleted: false,
    _deviceId: 'test-device',
    ...overrides,
  };
}

// ── Board ─────────────────────────────────────────────────────────────────────

export function makeBoardColumn(overrides: Partial<BoardColumn> = {}): BoardColumn {
  const id = `col-${seq()}`;
  return {
    id,
    title: 'To Do',
    order: 0,
    ...overrides,
  };
}

export function makeBoard(overrides: Partial<Board> = {}): Board {
  const id = `board-${seq()}`;
  const col1 = makeBoardColumn({ title: 'To Do', order: 0 });
  const col2 = makeBoardColumn({ title: 'In Progress', order: 1 });
  const col3 = makeBoardColumn({ title: 'Done', order: 2 });
  return {
    id,
    name: `Board ${id}`,
    columns: [col1, col2, col3],
    order: 0,
    weekStart: 1,
    archived: false,
    archivedAt: null,
    createdAt: now(),
    updatedAt: now(),
    ...baseEntity(),
    ...overrides,
  };
}

// ── Swimlane ──────────────────────────────────────────────────────────────────

export function makeSwimlane(
  overrides: Partial<Swimlane> = {}
): Swimlane & { boardId: string } {
  const id = `swimlane-${seq()}`;
  return {
    id,
    boardId: 'board-default',
    name: `Swimlane ${id}`,
    currency: 'USD',
    color: '#6366f1',
    order: 0,
    archived: false,
    archivedAt: null,
    createdAt: now(),
    updatedAt: now(),
    ...baseEntity(),
    ...overrides,
  };
}

// ── Task ──────────────────────────────────────────────────────────────────────

export function makeTaskComment(overrides: Partial<TaskComment> = {}): TaskComment {
  return {
    id: `comment-${seq()}`,
    text: 'A test comment',
    createdAt: now(),
    ...overrides,
  };
}

export function makeChecklistItem(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: `item-${seq()}`,
    text: 'Checklist item',
    done: false,
    ...overrides,
  };
}

export function makeChecklist(overrides: Partial<Checklist> = {}): Checklist {
  return {
    id: `checklist-${seq()}`,
    title: 'Checklist',
    items: [makeChecklistItem()],
    ...overrides,
  };
}

export function makeTaskTransaction(overrides: Partial<TaskTransaction> = {}): TaskTransaction {
  return {
    id: `txn-${seq()}`,
    type: 'expense',
    amount: 100,
    currency: 'USD',
    date: today(),
    ...overrides,
  };
}

export function makeTaskWorklog(overrides: Partial<TaskWorklog> = {}): TaskWorklog {
  return {
    id: `wl-${seq()}`,
    startedAt: now(),
    endedAt: now(),
    durationMinutes: 25,
    breakMinutes: 5,
    ...overrides,
  };
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  const id = `task-${seq()}`;
  return {
    id,
    boardId: 'board-default',
    swimlaneId: 'swimlane-default',
    columnId: 'col-default',
    title: `Task ${id}`,
    description: '',
    labels: [],
    comments: [],
    checklists: [],
    transactions: [],
    worklogs: [],
    pomodoros: 0,
    order: 0,
    date: null,
    deadline: null,
    priority: 'medium',
    archived: false,
    archivedAt: null,
    completedAt: null,
    routineId: null,
    time: null,
    createdAt: now(),
    updatedAt: now(),
    ...baseEntity(),
    ...overrides,
  };
}

export function buildKanbanPerformanceFixture({
  swimlaneCount = 12,
  tasksPerSwimlane = 30,
  boardOverrides = {},
}: {
  swimlaneCount?: number;
  tasksPerSwimlane?: number;
  boardOverrides?: Partial<Board>;
} = {}) {
  const board = makeBoard(boardOverrides);
  const swimlanes = Array.from({ length: swimlaneCount }, (_, index) =>
    makeSwimlane({
      id: `perf-lane-${index + 1}`,
      boardId: board.id,
      name: `Perf Lane ${index + 1}`,
      order: index,
    }),
  );

  const tasks = swimlanes.flatMap((swimlane) =>
    Array.from({ length: tasksPerSwimlane }, (_, index) => {
      const column = board.columns[index % board.columns.length] ?? board.columns[0];
      return makeTask({
        id: `perf-task-${swimlane.id}-${index + 1}`,
        boardId: board.id,
        swimlaneId: swimlane.id,
        columnId: column.id,
        order: Math.floor(index / board.columns.length),
        title: `Perf Task ${swimlane.name} #${index + 1}`,
      });
    }),
  );

  return {
    board,
    swimlanes,
    tasks,
  };
}

// ── BacklogItem ───────────────────────────────────────────────────────────────

export function makeBacklogItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  const id = `backlog-${seq()}`;
  return {
    id,
    swimlaneId: 'swimlane-default',
    text: `Backlog item ${id}`,
    archived: false,
    archivedAt: null,
    createdAt: now(),
    ...baseEntity(),
    ...overrides,
  };
}

// ── Habit ─────────────────────────────────────────────────────────────────────

export function makeHabit(overrides: Partial<Habit> = {}): Habit {
  const id = `habit-${seq()}`;
  return {
    id,
    boardId: 'board-default',
    swimlaneId: 'swimlane-default',
    title: `Habit ${id}`,
    color: '#22c55e',
    order: 0,
    breakHabit: false,
    frequencyDays: [1, 2, 3, 4, 5],
    archived: false,
    archivedAt: null,
    createdAt: now(),
    updatedAt: now(),
    ...baseEntity(),
    ...overrides,
  };
}

export function makeHabitLog(overrides: Partial<HabitLog> = {}): HabitLog {
  const id = `habitlog-${seq()}`;
  return {
    id,
    habitId: 'habit-default',
    date: today(),
    value: 1,
    createdAt: now(),
    updatedAt: now(),
    ...baseEntity(),
    ...overrides,
  };
}

// ── Recurrence ────────────────────────────────────────────────────────────────

export function makeRecurrenceRule(overrides: Partial<RecurrenceRule> = {}): RecurrenceRule {
  return {
    type: 'daily',
    interval: 1,
    ...overrides,
  };
}

// ── Routine ───────────────────────────────────────────────────────────────────

export function makeRoutine(overrides: Partial<Routine> = {}): Routine {
  const id = `routine-${seq()}`;
  return {
    id,
    boardId: 'board-default',
    swimlaneId: 'swimlane-default',
    columnId: 'col-default',
    title: `Routine ${id}`,
    description: null,
    type: 'task',
    recurrence: makeRecurrenceRule(),
    lastGeneratedAt: null,
    nextDueDate: today(),
    eventTime: null,
    paymentAmount: null,
    paymentCurrency: null,
    paymentType: null,
    paymentNote: null,
    order: 0,
    archived: false,
    archivedAt: null,
    createdAt: now(),
    updatedAt: now(),
    ...baseEntity(),
    ...overrides,
  };
}

export function makeRoutineLog(overrides: Partial<RoutineLog> = {}): RoutineLog {
  const id = `routinelog-${seq()}`;
  return {
    id,
    routineId: 'routine-default',
    date: today(),
    status: 'approved',
    taskId: null,
    createdAt: now(),
    ...baseEntity(),
    ...overrides,
  };
}

// ── Note ──────────────────────────────────────────────────────────────────────

export function makeNote(overrides: Partial<Note> = {}): Note {
  const id = `note-${seq()}`;
  return {
    id,
    boardId: 'board-default',
    swimlaneId: 'swimlane-default',
    title: `Note ${id}`,
    content: '<p>Test content</p>',
    tags: [],
    references: [],
    pinned: false,
    archived: false,
    archivedAt: null,
    createdAt: now(),
    updatedAt: now(),
    ...baseEntity(),
    ...overrides,
  };
}

// ── Bookmark ──────────────────────────────────────────────────────────────────

export function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  const id = `bookmark-${seq()}`;
  return {
    id,
    boardId: 'board-default',
    swimlaneId: 'swimlane-default',
    url: 'https://example.com',
    urlNormalized: 'https://example.com',
    domain: 'example.com',
    title: 'Example',
    description: 'An example bookmark',
    previewImage: undefined,
    favicon: undefined,
    siteName: undefined,
    tags: [],
    comments: [],
    links: [],
    status: 'unread',
    rating: undefined,
    pinned: false,
    archived: false,
    archivedAt: null,
    metadataFetchStatus: 'success',
    isBroken: false,
    createdAt: now(),
    updatedAt: now(),
    ...baseEntity(),
    ...overrides,
  };
}

// ── Mindmap ───────────────────────────────────────────────────────────────────

export function makeMindmapNode(overrides: Partial<MindmapNode> = {}): MindmapNode {
  return {
    id: `node-${seq()}`,
    parentId: null,
    label: 'Root',
    color: '#6366f1',
    x: 0,
    y: 0,
    order: 0,
    collapsed: false,
    direction: 'right',
    ...overrides,
  };
}

export function makeMindmap(overrides: Partial<Mindmap> = {}): Mindmap {
  const id = `mindmap-${seq()}`;
  return {
    id,
    boardId: 'board-default',
    swimlaneId: 'swimlane-default',
    title: `Mindmap ${id}`,
    nodes: [makeMindmapNode()],
    archived: false,
    archivedAt: null,
    createdAt: now(),
    updatedAt: now(),
    ...baseEntity(),
    ...overrides,
  };
}

// ── VisionBoardItem ───────────────────────────────────────────────────────────

export function makeVisionBoardItem(overrides: Partial<VisionBoardItem> = {}): VisionBoardItem {
  const id = `vision-${seq()}`;
  return {
    id,
    boardId: 'board-default',
    swimlaneId: 'swimlane-default',
    title: `Vision ${id}`,
    content: '',
    excalidrawData: undefined,
    archived: false,
    archivedAt: null,
    createdAt: now(),
    updatedAt: now(),
    ...baseEntity(),
    ...overrides,
  };
}
