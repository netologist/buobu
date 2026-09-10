import type { Board, Swimlane, Task, Habit, HabitLog, Note, VisionBoardItem, Mindmap, BacklogItem, Bookmark, Timeblock } from '@/lib/types';

export const APP_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION || '0.1.0';

export type ExportFileData = {
  boards: Board[];
  swimlanes: Swimlane[];
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  notes: Note[];
  bookmarks: Bookmark[];
  visionItems: VisionBoardItem[];
  mindmaps: Mindmap[];
  backlogs: BacklogItem[];
  timeblocks: Timeblock[];
};

export type ExportFileMeta = {
  checksum: string;
  docCounts: Record<string, number>;
};

export type ExportFile = {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  deviceId: string;
  data: ExportFileData;
  meta: ExportFileMeta;
};

export type ImportMode = 'merge' | 'replace' | 'append';

export type ImportPreview = {
  file: {
    schemaVersion: number;
    exportedAt: string;
    appVersion: string;
    checksum: string;
  };
  counts: {
    import: Record<string, number>;
    local: Record<string, number>;
  };
  stats: {
    new: number;
    conflicts: number;
  };
};

export type ImportProgress = {
  phase: 'validating' | 'migrating' | 'importing' | 'done' | 'error';
  current: number;
  total: number;
  message: string;
};

export type ImportResult = {
  success: boolean;
  mode: ImportMode;
  stats: {
    added: number;
    updated: number;
    unchanged: number;
  };
  error?: string;
};

export type ValidationError = {
  code: 'invalid_json' | 'invalid_structure' | 'checksum_mismatch' | 'file_too_large' | 'unsupported_version' | 'missing_fields';
  message: string;
  details?: string;
};
