export type BoardColumn = {
  id: string;
  title: string;
  order?: number;
};

export type Board = {
  id: string;
  name: string;
  description?: string;
  columns: BoardColumn[];
  order?: number;
  weekStart?: number;
  archiveColumnId?: string;
  showArchiveColumn?: boolean;
  archived?: boolean;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  swimlanes?: Swimlane[];
  naming?: NamingLabels;
} & Partial<BaseEntity>;

export type Swimlane = {
  id: string;
  boardId?: string;
  name: string;
  description?: string;
  label?: string;
  currency: string;
  color?: string;
  durationHours?: number;
  pomodoroMinutes?: number;
  breakMinutes?: number;
  deadline?: string;
  order?: number;
  archived?: boolean;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
} & Partial<BaseEntity>;

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type Checklist = {
  id: string;
  title: string;
  items: ChecklistItem[];
};

export type TaskComment = {
  id: string;
  text: string;
  createdAt: string;
};

export type TaskWorklog = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  breakMinutes?: number;
};

export type TaskTransaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  note?: string;
  date?: string;
};

export type BaseEntity = {
  user_id: string;
  _modified: number;
  _version: number;
  _createdAt: string;
  _updatedAt: string;
  _deleted: boolean;
  _deviceId: string;
};

export type Task = {
  id: string;
  boardId: string;
  swimlaneId: string;
  columnId: string;
  title: string;
  description: string;
  labels: string[];
  comments: TaskComment[];
  checklists: Checklist[];
  transactions: TaskTransaction[];
  worklogs: TaskWorklog[];
  pomodoros?: number;
  order?: number;
  date?: string | null;
  deadline?: string | null;
  priority?: "low" | "medium" | "high";
  archived?: boolean;
  archivedAt?: string | null;
  completedAt?: string | null;
  routineId?: string | null; // per D-05, D-24
  time?: string | null; // HH:MM, per D-25
  timeboxMinutes?: number | null; // planned duration in minutes (time-box feature)
  createdAt: string;
  updatedAt: string;
} & Partial<BaseEntity>;

export type BacklogItem = {
  id: string;
  swimlaneId: string;
  text: string;
  archived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
} & Partial<BaseEntity>;

export type Habit = {
  id: string;
  boardId: string;
  swimlaneId: string;
  title: string;
  color?: string;
  order?: number;
  breakHabit?: boolean;
  frequencyDays?: number[];
  timeblockId?: string | null; // if set, frequencyDays is hidden in UI and overridden at runtime
  sourceType?: "timeblock" | null;
  sourceTimeblockId?: string | null;
  archived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
} & Partial<BaseEntity>;

export type HabitLog = {
  id: string;
  habitId: string;
  date: string;
  value: number;
  createdAt: string;
  updatedAt: string;
} & Partial<BaseEntity>;

export type RecurrenceRule = {
  type: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  interval: number;
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, ... 6=Saturday; used for weekly
  dayOfMonth?: number; // 1–31; used for monthly + yearly
  monthOfYear?: number; // 1–12; used for yearly
  endDate?: string; // ISO "YYYY-MM-DD"; optional termination date
};

export type Routine = {
  id: string;
  boardId: string;
  swimlaneId: string;
  columnId: string;
  title: string;
  description?: string | null;
  type: "task" | "event" | "payment";
  recurrence: RecurrenceRule;
  timeblockId?: string | null; // if set, recurrence is hidden in UI and overridden at runtime
  lastGeneratedAt?: string | null;
  nextDueDate?: string | null;
  eventTime?: string | null; // HH:MM — for event type (per D-07)
  paymentAmount?: number | null; // for payment type (per D-08)
  paymentCurrency?: string | null;
  paymentType?: "income" | "expense" | null;
  paymentNote?: string | null;
  order?: number;
  archived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
} & Partial<BaseEntity>;

export type RoutineLog = {
  id: string;
  routineId: string;
  date: string; // "YYYY-MM-DD"
  status: "approved" | "skipped" | "auto-processed";
  taskId?: string | null; // set when approved or auto-processed
  createdAt: string;
} & Partial<BaseEntity>;

export type Timeblock = {
  id: string;
  boardId: string;
  swimlaneId: string;
  title: string;
  description?: string | null;
  color?: string;
  startTime: string; // "HH:MM" 24h — required
  endTime: string; // "HH:MM" 24h — required
  recurrence: RecurrenceRule; // two-weekly = { type: 'weekly', interval: 2 }
  showAsHabit?: boolean;
  order?: number;
  archived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
} & Partial<BaseEntity>;

export type VisionBoardItem = {
  id: string;
  boardId: string;
  swimlaneId: string;
  title: string;
  content?: string;
  excalidrawData?: string;
  archived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
} & Partial<BaseEntity>;

export type NoteMetadataType = "text" | "number" | "date" | "list" | "boolean";

export type NoteMetadataField = {
  key: string;
  value: string;
  type: NoteMetadataType;
};

export type Note = {
  id: string;
  boardId: string;
  swimlaneId: string;
  title: string;
  content: string;
  tags: string[];
  references: string[];
  metadata?: NoteMetadataField[];
  pinned?: boolean;
  archived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
} & Partial<BaseEntity>;

export type BookmarkStatus =
  | "unread"
  | "reading"
  | "important"
  | "archived"
  | "favorite";

export type BookmarkComment = {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
};

export type BookmarkLink = {
  id: string;
  linkedType: "note" | "kanban" | "mindmap" | "whiteboard" | "event";
  linkedId: string;
};

export type Bookmark = {
  id: string;
  boardId: string;
  swimlaneId: string;
  url: string;
  urlNormalized: string;
  domain: string;
  title: string;
  description: string;
  previewImage?: string;
  favicon?: string;
  siteName?: string;
  tags: string[];
  comments: BookmarkComment[];
  links: BookmarkLink[];
  status: BookmarkStatus;
  rating?: number;
  pinned?: boolean;
  archived?: boolean;
  archivedAt?: string | null;
  metadataFetchStatus?: "pending" | "success" | "failed" | "timeout";
  metadataLastFetchedAt?: string;
  isBroken?: boolean;
  createdAt: string;
  updatedAt: string;
} & Partial<BaseEntity>;

export type MindmapNode = {
  id: string;
  parentId: string | null;
  label: string;
  color: string;
  x: number;
  y: number;
  order: number;
  collapsed?: boolean;
  direction?: "right" | "left" | "up" | "down";
};

export type Mindmap = {
  id: string;
  boardId: string;
  swimlaneId: string;
  title: string;
  nodes: MindmapNode[];
  archived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
} & Partial<BaseEntity>;

export type ExportPayload = {
  exportedAt: string;
  boards: Board[];
  swimlanes: Swimlane[];
  tasks: Task[];
  backlogs: BacklogItem[];
};

export type EntityType =
  | "task"
  | "habit"
  | "habitLog"
  | "backlog"
  | "note"
  | "mindmap"
  | "visionItem"
  | "bookmark"
  | "board"
  | "swimlane";

export type ArchiveSearchResult = {
  entityType: EntityType;
  entityId: string;
  title: string;
  parentBoard?: string;
  parentSwimlane?: string;
  archivedAt: string;
  matchField: string;
};

export type Operation = "create" | "update" | "delete";

export type VectorClock = Record<string, number>;

export type ChangeLog = {
  id: string;
  user_id: string;
  entityType: EntityType;
  entityId: string;
  operation: Operation;
  payload: unknown;
  timestamp: string;
  vectorClock: VectorClock;
  synced: boolean;
  syncTarget: "google-drive" | "icloud" | "dropbox" | null;
} & Partial<BaseEntity>;

export type SyncMeta = {
  id: string;
  user_id: string;
  lastSyncAt: string;
  lastLocalChangeAt: string;
  updatedAt: string;
} & Partial<BaseEntity>;

export type NamingLabels = {
  board: string;
  boardPlural: string;
  swimlane: string;
  swimlanePlural: string;
};
