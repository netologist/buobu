import type { ExportFile } from '../types';

export const CURRENT_SCHEMA_VERSION = 6;

type MigrationFn = (data: ExportFile) => ExportFile;

const migrations: Record<number, MigrationFn> = {
  1: (file) => ({
    ...file,
    schemaVersion: 2,
    data: {
      ...file.data,
      bookmarks: [],
    },
    meta: {
      ...file.meta,
      docCounts: {
        ...file.meta.docCounts,
        bookmarks: 0,
      },
    },
  }),
  // v2 → v3: add archived/archivedAt fields to all entity types
  2: (file) => ({
    ...file,
    schemaVersion: 3,
    data: {
      ...file.data,
      boards: file.data.boards.map((b) => ({ archived: false, ...b })),
      swimlanes: file.data.swimlanes.map((s) => ({ archived: false, ...s })),
      tasks: file.data.tasks.map((t) => ({ archived: false, ...t })),
      habits: file.data.habits.map((h) => ({ archived: false, ...h })),
      notes: file.data.notes.map((n) => ({ archived: false, ...n })),
      mindmaps: file.data.mindmaps.map((m) => ({ archived: false, ...m })),
      visionItems: file.data.visionItems.map((v) => ({ archived: false, ...v })),
      backlogs: file.data.backlogs.map((b) => ({ archived: false, ...b })),
      bookmarks: file.data.bookmarks.map((b) => ({ archived: false, ...b })),
    },
  }),
  // v3 → v4: add explicit order to boards (index-based from current list position)
  3: (file) => ({
    ...file,
    schemaVersion: 4,
    data: {
      ...file.data,
      boards: file.data.boards.map((b, i) => ({
        order: i,
        ...b,
      })),
    },
  }),
  // v4 → v5: add explicit order to swimlanes (index-based per board, grouped by boardId)
  4: (file) => {
    const boardOrder: Record<string, number> = {};
    const swimlanes = file.data.swimlanes.map((s) => {
      const boardId = (s as { boardId?: string }).boardId ?? '';
      const idx = boardOrder[boardId] ?? 0;
      boardOrder[boardId] = idx + 1;
      return { order: idx, ...s };
    });
    return {
      ...file,
      schemaVersion: 5,
      data: { ...file.data, swimlanes },
  // v5 → v6: add timeblocks array
  5: (file: ExportFile) => ({
    ...file,
    schemaVersion: 6,
    data: {
      ...file.data,
      timeblocks: [],
    },
    meta: {
      ...file.meta,
      docCounts: {
        ...file.meta.docCounts,
        timeblocks: 0,
      },
    },
  }),
};
  },
};

export function migrateToLatest(file: ExportFile): ExportFile {
  let current = file;
  
  while (current.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const migrator = migrations[current.schemaVersion];
    if (!migrator) {
      console.warn(`No migration found for schema version ${current.schemaVersion}`);
      break;
    }
    current = migrator(current);
  }
  
  return current;
}

export function registerMigration(fromVersion: number, fn: MigrationFn): void {
  migrations[fromVersion] = fn;
}
