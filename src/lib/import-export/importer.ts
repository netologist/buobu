import type { Database } from '@/lib/rxdb';
import type { Board, Swimlane, Task, Habit, HabitLog, Note, VisionBoardItem, Mindmap, BacklogItem, Bookmark, Timeblock } from '@/lib/types';
import { generateChecksum } from './checksum';
import { generateId } from '@/lib/uuid';
import { type ExportFile, type ExportFileData, type ImportMode, type ImportPreview, type ImportProgress, type ImportResult, type ValidationError } from './types';
import { migrateToLatest, CURRENT_SCHEMA_VERSION } from './migrations';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

type DocWithMeta = {
  id: string;
  _updatedAt?: string;
  _version?: number;
};

function validateStructure(data: unknown): data is ExportFile {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  
  if (typeof obj.schemaVersion !== 'number') return false;
  if (typeof obj.exportedAt !== 'string') return false;
  if (typeof obj.appVersion !== 'string') return false;
  if (typeof obj.deviceId !== 'string') return false;
  if (!obj.data || typeof obj.data !== 'object') return false;
  if (!obj.meta || typeof obj.meta !== 'object') return false;
  
  const dataObj = obj.data as Record<string, unknown>;
  const collections = ['boards', 'swimlanes', 'tasks', 'habits', 'habitLogs', 'notes', 'bookmarks', 'visionItems', 'mindmaps', 'backlogs', 'timeblocks'];
  for (const col of collections) {
    if (col === 'bookmarks' || col === 'timeblocks') {
      if (dataObj[col] !== undefined && !Array.isArray(dataObj[col])) return false;
      continue;
    }
    if (!Array.isArray(dataObj[col])) return false;
  }
  
  return true;
}

export async function parseExportFile(file: File): Promise<{ data: ExportFile | null; error: ValidationError | null }> {
  if (file.size > MAX_FILE_SIZE) {
    return {
      data: null,
      error: { code: 'file_too_large', message: 'File size exceeds 50MB limit' },
    };
  }

  try {
    const text = await file.text();
    let parsed: unknown;
    
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        data: null,
        error: { code: 'invalid_json', message: 'Invalid JSON file' },
      };
    }

    if (!validateStructure(parsed)) {
      return {
        data: null,
        error: { code: 'invalid_structure', message: 'Invalid export file structure' },
      };
    }

    const calculatedChecksum = await generateChecksum(JSON.stringify(parsed.data));
    if (calculatedChecksum !== parsed.meta.checksum) {
      return {
        data: null,
        error: { 
          code: 'checksum_mismatch', 
          message: 'File checksum does not match. File may be corrupted.',
          details: `Expected: ${parsed.meta.checksum}, Calculated: ${calculatedChecksum}`,
        },
      };
    }

    if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      return {
        data: null,
        error: { 
          code: 'unsupported_version', 
          message: `Unsupported schema version: ${parsed.schemaVersion}. Maximum supported: ${CURRENT_SCHEMA_VERSION}`,
        },
      };
    }

    const migrated = migrateToLatest(parsed);
    if (!Array.isArray(migrated.data.bookmarks)) {
      migrated.data.bookmarks = [];
    }
    if (typeof migrated.meta.docCounts.bookmarks !== 'number') {
      migrated.meta.docCounts.bookmarks = migrated.data.bookmarks.length;
    }
    if (!Array.isArray(migrated.data.timeblocks)) {
      migrated.data.timeblocks = [];
    }
    if (typeof migrated.meta.docCounts.timeblocks !== 'number') {
      migrated.meta.docCounts.timeblocks = migrated.data.timeblocks.length;
    }
    
    return { data: migrated, error: null };
  } catch (err) {
    return {
      data: null,
      error: { 
        code: 'invalid_json', 
        message: 'Failed to read file',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
}

export async function generateImportPreview(db: Database, importFile: ExportFile): Promise<ImportPreview> {
  const localCounts = await getLocalCounts(db);
  
  const importCounts: Record<string, number> = {
    boards: importFile.data.boards.length,
    swimlanes: importFile.data.swimlanes.length,
    tasks: importFile.data.tasks.length,
    habits: importFile.data.habits.length,
    habitLogs: importFile.data.habitLogs.length,
    notes: importFile.data.notes.length,
    bookmarks: importFile.data.bookmarks.length,
    visionItems: importFile.data.visionItems.length,
    mindmaps: importFile.data.mindmaps.length,
    backlogs: importFile.data.backlogs.length,
    timeblocks: importFile.data.timeblocks?.length ?? 0,
  };

  const localIds = await getLocalIds(db);
  const importIds = collectIds(importFile.data);
  
  let newCount = 0;
  let conflictCount = 0;
  
  for (const id of importIds) {
    if (!localIds.has(id)) {
      newCount++;
    } else {
      conflictCount++;
    }
  }

  return {
    file: {
      schemaVersion: importFile.schemaVersion,
      exportedAt: importFile.exportedAt,
      appVersion: importFile.appVersion,
      checksum: importFile.meta.checksum,
    },
    counts: {
      import: importCounts,
      local: localCounts,
    },
    stats: {
      new: newCount,
      conflicts: conflictCount,
    },
  };
}

async function getLocalCounts(db: Database): Promise<Record<string, number>> {
  const [boards, swimlanes, tasks, habits, habitLogs, notes, bookmarks, visionItems, mindmaps, backlogs, timeblocks] = await Promise.all([
    db.boards.find().exec(),
    db.swimlanes.find().exec(),
    db.tasks.find().exec(),
    db.habits.find().exec(),
    db.habitLogs.find().exec(),
    db.notes.find().exec(),
    db.bookmarks.find().exec(),
    db.visionItems.find().exec(),
    db.mindmaps.find().exec(),
    db.backlogs.find().exec(),
    db.timeblocks.find().exec(),
  ]);

  return {
    boards: boards.length,
    swimlanes: swimlanes.length,
    tasks: tasks.length,
    habits: habits.length,
    habitLogs: habitLogs.length,
    notes: notes.length,
    bookmarks: bookmarks.length,
    visionItems: visionItems.length,
    mindmaps: mindmaps.length,
    backlogs: backlogs.length,
    timeblocks: timeblocks.length,
  };
}

async function getLocalIds(db: Database): Promise<Set<string>> {
  const ids = new Set<string>();
  
  const collections = await Promise.all([
    db.boards.find().exec(),
    db.swimlanes.find().exec(),
    db.tasks.find().exec(),
    db.habits.find().exec(),
    db.habitLogs.find().exec(),
    db.notes.find().exec(),
    db.bookmarks.find().exec(),
    db.visionItems.find().exec(),
    db.mindmaps.find().exec(),
    db.backlogs.find().exec(),
    db.timeblocks.find().exec(),
  ]);

  for (const docs of collections) {
    for (const doc of docs) {
      const json = doc.toJSON();
      if (json.id) ids.add(json.id);
    }
  }

  return ids;
}

function collectIds(data: ExportFileData): Set<string> {
  const ids = new Set<string>();
  
  for (const doc of data.boards) if (doc.id) ids.add(doc.id);
  for (const doc of data.swimlanes) if (doc.id) ids.add(doc.id);
  for (const doc of data.tasks) if (doc.id) ids.add(doc.id);
  for (const doc of data.habits) if (doc.id) ids.add(doc.id);
  for (const doc of data.habitLogs) if (doc.id) ids.add(doc.id);
  for (const doc of data.notes) if (doc.id) ids.add(doc.id);
  for (const doc of data.bookmarks) if (doc.id) ids.add(doc.id);
  for (const doc of data.visionItems) if (doc.id) ids.add(doc.id);
  for (const doc of data.mindmaps) if (doc.id) ids.add(doc.id);
  for (const doc of data.backlogs) if (doc.id) ids.add(doc.id);
  for (const doc of (data.timeblocks ?? [])) if (doc.id) ids.add(doc.id);
  
  return ids;
}

function mergeCollection<T extends DocWithMeta>(
  local: T[],
  imported: T[]
): { merged: T[]; added: number; updated: number; unchanged: number } {
  const merged = new Map<string, T>();
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const doc of local) {
    merged.set(doc.id, doc);
  }

  for (const doc of imported) {
    const existing = merged.get(doc.id);
    if (!existing) {
      merged.set(doc.id, doc);
      added++;
    } else {
      const localTime = existing._updatedAt ? new Date(existing._updatedAt).getTime() : 0;
      const importTime = doc._updatedAt ? new Date(doc._updatedAt).getTime() : 0;
      
      if (importTime > localTime) {
        merged.set(doc.id, doc);
        updated++;
      } else {
        unchanged++;
      }
    }
  }

  return { merged: Array.from(merged.values()), added, updated, unchanged };
}

function remapIdsForAppend(data: ExportFileData): ExportFileData {
  const boardIdMap = new Map<string, string>();
  const swimlaneIdMap = new Map<string, string>();
  const taskIdMap = new Map<string, string>();
  const habitIdMap = new Map<string, string>();

  for (const board of data.boards) boardIdMap.set(board.id, generateId());
  for (const swimlane of data.swimlanes) swimlaneIdMap.set(swimlane.id, generateId());
  for (const task of data.tasks) taskIdMap.set(task.id, generateId());
  for (const habit of data.habits) habitIdMap.set(habit.id, generateId());

  return {
    boards: data.boards.map((board) => ({
      ...board,
      id: boardIdMap.get(board.id) ?? generateId(),
    })),
    swimlanes: data.swimlanes.map((swimlane) => ({
      ...swimlane,
      id: swimlaneIdMap.get(swimlane.id) ?? generateId(),
      boardId: swimlane.boardId
        ? (boardIdMap.get(swimlane.boardId) ?? swimlane.boardId)
        : swimlane.boardId,
    })),
    tasks: data.tasks.map((task) => ({
      ...task,
      id: taskIdMap.get(task.id) ?? generateId(),
      boardId: boardIdMap.get(task.boardId) ?? task.boardId,
      swimlaneId: swimlaneIdMap.get(task.swimlaneId) ?? task.swimlaneId,
    })),
    habits: data.habits.map((habit) => ({
      ...habit,
      id: habitIdMap.get(habit.id) ?? generateId(),
      boardId: boardIdMap.get(habit.boardId) ?? habit.boardId,
      swimlaneId: swimlaneIdMap.get(habit.swimlaneId) ?? habit.swimlaneId,
    })),
    habitLogs: data.habitLogs.map((log) => ({
      ...log,
      id: generateId(),
      habitId: habitIdMap.get(log.habitId) ?? log.habitId,
    })),
    notes: data.notes.map((note) => ({
      ...note,
      id: generateId(),
      boardId: boardIdMap.get(note.boardId) ?? note.boardId,
      swimlaneId: swimlaneIdMap.get(note.swimlaneId) ?? note.swimlaneId,
    })),
    bookmarks: data.bookmarks.map((bookmark) => ({
      ...bookmark,
      id: generateId(),
      boardId: boardIdMap.get(bookmark.boardId) ?? bookmark.boardId,
      swimlaneId: swimlaneIdMap.get(bookmark.swimlaneId) ?? bookmark.swimlaneId,
    })),
    visionItems: data.visionItems.map((item) => ({
      ...item,
      id: generateId(),
      boardId: boardIdMap.get(item.boardId) ?? item.boardId,
      swimlaneId: swimlaneIdMap.get(item.swimlaneId) ?? item.swimlaneId,
    })),
    mindmaps: data.mindmaps.map((mindmap) => ({
      ...mindmap,
      id: generateId(),
      boardId: boardIdMap.get(mindmap.boardId) ?? mindmap.boardId,
      swimlaneId: swimlaneIdMap.get(mindmap.swimlaneId) ?? mindmap.swimlaneId,
    })),
    backlogs: data.backlogs.map((backlog) => ({
      ...backlog,
      id: generateId(),
      swimlaneId: swimlaneIdMap.get(backlog.swimlaneId) ?? backlog.swimlaneId,
    })),
    timeblocks: (data.timeblocks ?? []).map((tb) => ({
      ...tb,
      id: generateId(),
      swimlaneId: swimlaneIdMap.get(tb.swimlaneId) ?? tb.swimlaneId,
    })),
  };
}

export async function executeImport(
  db: Database,
  importFile: ExportFile,
  mode: ImportMode,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const total = Object.values(importFile.meta.docCounts).reduce((a, b) => a + b, 0);
  
  try {
    onProgress?.({ phase: 'validating', current: 0, total, message: 'Validating data...' });
    
    if (mode === 'replace') {
      return await executeReplaceImport(db, importFile, total, onProgress);
    } else if (mode === 'append') {
      return await executeAppendImport(db, importFile, total, onProgress);
    } else {
      return await executeMergeImport(db, importFile, total, onProgress);
    }
  } catch (err) {
    onProgress?.({ phase: 'error', current: 0, total, message: err instanceof Error ? err.message : 'Import failed' });
    return {
      success: false,
      mode,
      stats: { added: 0, updated: 0, unchanged: 0 },
      error: err instanceof Error ? err.message : 'Import failed',
    };
  }
}

async function executeMergeImport(
  db: Database,
  importFile: ExportFile,
  total: number,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const stats = { added: 0, updated: 0, unchanged: 0 };
  let current = 0;

  const updateProgress = (message: string) => {
    onProgress?.({ phase: 'importing', current, total, message });
  };

  onProgress?.({ phase: 'importing', current: 0, total, message: 'Loading local data...' });

  const [localBoards, localSwimlanes, localTasks, localHabits, localHabitLogs, localNotes, localBookmarks, localVisionItems, localMindmaps, localBacklogs, localTimeblocks] = await Promise.all([
    db.boards.find().exec().then(docs => docs.map(d => d.toMutableJSON())),
    db.swimlanes.find().exec().then(docs => docs.map(d => d.toMutableJSON())),
    db.tasks.find().exec().then(docs => docs.map(d => d.toMutableJSON())),
    db.habits.find().exec().then(docs => docs.map(d => d.toMutableJSON())),
    db.habitLogs.find().exec().then(docs => docs.map(d => d.toMutableJSON())),
    db.notes.find().exec().then(docs => docs.map(d => d.toMutableJSON())),
    db.bookmarks.find().exec().then(docs => docs.map(d => d.toMutableJSON())),
    db.visionItems.find().exec().then(docs => docs.map(d => d.toMutableJSON())),
    db.mindmaps.find().exec().then(docs => docs.map(d => d.toMutableJSON())),
    db.backlogs.find().exec().then(docs => docs.map(d => d.toMutableJSON())),
    db.timeblocks.find().exec().then(docs => docs.map(d => d.toMutableJSON())),
  ]);

  current += localBoards.length + localSwimlanes.length + localTasks.length + 
             localHabits.length + localHabitLogs.length + localNotes.length + localBookmarks.length +
             localVisionItems.length + localMindmaps.length + localBacklogs.length + localTimeblocks.length;

  updateProgress('Merging boards...');
  const boardsResult = mergeCollection(localBoards, importFile.data.boards as Board[]);
  stats.added += boardsResult.added;
  stats.updated += boardsResult.updated;
  stats.unchanged += boardsResult.unchanged;
  current += importFile.data.boards.length;
  
  updateProgress('Merging swimlanes...');
  const swimlanesResult = mergeCollection(localSwimlanes, importFile.data.swimlanes as Swimlane[]);
  stats.added += swimlanesResult.added;
  stats.updated += swimlanesResult.updated;
  stats.unchanged += swimlanesResult.unchanged;
  current += importFile.data.swimlanes.length;

  updateProgress('Merging tasks...');
  const tasksResult = mergeCollection(localTasks, importFile.data.tasks as Task[]);
  stats.added += tasksResult.added;
  stats.updated += tasksResult.updated;
  stats.unchanged += tasksResult.unchanged;
  current += importFile.data.tasks.length;

  updateProgress('Merging habits...');
  const habitsResult = mergeCollection(localHabits, importFile.data.habits as Habit[]);
  stats.added += habitsResult.added;
  stats.updated += habitsResult.updated;
  stats.unchanged += habitsResult.unchanged;
  current += importFile.data.habits.length;

  updateProgress('Merging habit logs...');
  const habitLogsResult = mergeCollection(localHabitLogs, importFile.data.habitLogs as HabitLog[]);
  stats.added += habitLogsResult.added;
  stats.updated += habitLogsResult.updated;
  stats.unchanged += habitLogsResult.unchanged;
  current += importFile.data.habitLogs.length;

  updateProgress('Merging notes...');
  const notesResult = mergeCollection(localNotes, importFile.data.notes as Note[]);
  stats.added += notesResult.added;
  stats.updated += notesResult.updated;
  stats.unchanged += notesResult.unchanged;
  current += importFile.data.notes.length;

  updateProgress('Merging bookmarks...');
  const bookmarksResult = mergeCollection(localBookmarks, importFile.data.bookmarks as Bookmark[]);
  stats.added += bookmarksResult.added;
  stats.updated += bookmarksResult.updated;
  stats.unchanged += bookmarksResult.unchanged;
  current += importFile.data.bookmarks.length;

  updateProgress('Merging vision items...');
  const visionItemsResult = mergeCollection(localVisionItems, importFile.data.visionItems as VisionBoardItem[]);
  stats.added += visionItemsResult.added;
  stats.updated += visionItemsResult.updated;
  stats.unchanged += visionItemsResult.unchanged;
  current += importFile.data.visionItems.length;

  updateProgress('Merging mindmaps...');
  const mindmapsResult = mergeCollection(localMindmaps, importFile.data.mindmaps as Mindmap[]);
  stats.added += mindmapsResult.added;
  stats.updated += mindmapsResult.updated;
  stats.unchanged += mindmapsResult.unchanged;
  current += importFile.data.mindmaps.length;

  updateProgress('Merging backlog items...');
  const backlogsResult = mergeCollection(localBacklogs, importFile.data.backlogs as BacklogItem[]);
  stats.added += backlogsResult.added;
  stats.updated += backlogsResult.updated;
  stats.unchanged += backlogsResult.unchanged;

  updateProgress('Merging timeblocks...');
  const timeblocksResult = mergeCollection(localTimeblocks, (importFile.data.timeblocks ?? []) as Timeblock[]);
  stats.added += timeblocksResult.added;
  stats.updated += timeblocksResult.updated;
  stats.unchanged += timeblocksResult.unchanged;
  current = total;

  updateProgress('Saving to database...');
  await Promise.all([
    db.boards.bulkUpsert(boardsResult.merged),
    db.swimlanes.bulkUpsert(swimlanesResult.merged),
    db.tasks.bulkUpsert(tasksResult.merged),
    db.habits.bulkUpsert(habitsResult.merged),
    db.habitLogs.bulkUpsert(habitLogsResult.merged),
    db.notes.bulkUpsert(notesResult.merged),
    db.bookmarks.bulkUpsert(bookmarksResult.merged),
    db.visionItems.bulkUpsert(visionItemsResult.merged),
    db.mindmaps.bulkUpsert(mindmapsResult.merged),
    db.backlogs.bulkUpsert(backlogsResult.merged),
    db.timeblocks.bulkUpsert(timeblocksResult.merged),
  ]);

  onProgress?.({ phase: 'done', current: total, total, message: 'Import complete!' });

  return { success: true, mode: 'merge', stats };
}

async function executeReplaceImport(
  db: Database,
  importFile: ExportFile,
  total: number,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  onProgress?.({ phase: 'importing', current: 0, total, message: 'Clearing local data...' });
  
  await Promise.all([
    db.boards.find().remove(),
    db.swimlanes.find().remove(),
    db.tasks.find().remove(),
    db.habits.find().remove(),
    db.habitLogs.find().remove(),
    db.notes.find().remove(),
    db.bookmarks.find().remove(),
    db.visionItems.find().remove(),
    db.mindmaps.find().remove(),
    db.backlogs.find().remove(),
    db.timeblocks.find().remove(),
  ]);

  onProgress?.({ phase: 'importing', current: 0, total, message: 'Importing data...' });
  
  await Promise.all([
    importFile.data.boards.length ? db.boards.bulkUpsert(importFile.data.boards) : Promise.resolve(),
    importFile.data.swimlanes.length ? db.swimlanes.bulkUpsert(importFile.data.swimlanes) : Promise.resolve(),
    importFile.data.tasks.length ? db.tasks.bulkUpsert(importFile.data.tasks) : Promise.resolve(),
    importFile.data.habits.length ? db.habits.bulkUpsert(importFile.data.habits) : Promise.resolve(),
    importFile.data.habitLogs.length ? db.habitLogs.bulkUpsert(importFile.data.habitLogs) : Promise.resolve(),
    importFile.data.notes.length ? db.notes.bulkUpsert(importFile.data.notes) : Promise.resolve(),
    importFile.data.bookmarks.length ? db.bookmarks.bulkUpsert(importFile.data.bookmarks) : Promise.resolve(),
    importFile.data.visionItems.length ? db.visionItems.bulkUpsert(importFile.data.visionItems) : Promise.resolve(),
    importFile.data.mindmaps.length ? db.mindmaps.bulkUpsert(importFile.data.mindmaps) : Promise.resolve(),
    importFile.data.backlogs.length ? db.backlogs.bulkUpsert(importFile.data.backlogs) : Promise.resolve(),
    (importFile.data.timeblocks?.length ?? 0) > 0 ? db.timeblocks.bulkUpsert(importFile.data.timeblocks) : Promise.resolve(),
  ]);

  onProgress?.({ phase: 'done', current: total, total, message: 'Import complete!' });

  const totalDocs = Object.values(importFile.meta.docCounts).reduce((a, b) => a + b, 0);
  return {
    success: true,
    mode: 'replace',
    stats: { added: totalDocs, updated: 0, unchanged: 0 },
  };
}

async function executeAppendImport(
  db: Database,
  importFile: ExportFile,
  total: number,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const stats = { added: 0, updated: 0, unchanged: 0 };
  const remapped = remapIdsForAppend(importFile.data);

  onProgress?.({ phase: 'importing', current: 0, total, message: 'Loading local data...' });

  onProgress?.({ phase: 'importing', current: 0, total, message: 'Processing data with fresh IDs...' });

  onProgress?.({ phase: 'importing', current: total, total, message: 'Saving to database...' });

  await Promise.all([
    remapped.boards.length ? db.boards.bulkUpsert(remapped.boards as Board[]) : Promise.resolve(),
    remapped.swimlanes.length ? db.swimlanes.bulkUpsert(remapped.swimlanes as Swimlane[]) : Promise.resolve(),
    remapped.tasks.length ? db.tasks.bulkUpsert(remapped.tasks as Task[]) : Promise.resolve(),
    remapped.habits.length ? db.habits.bulkUpsert(remapped.habits as Habit[]) : Promise.resolve(),
    remapped.habitLogs.length ? db.habitLogs.bulkUpsert(remapped.habitLogs as HabitLog[]) : Promise.resolve(),
    remapped.notes.length ? db.notes.bulkUpsert(remapped.notes as Note[]) : Promise.resolve(),
    remapped.bookmarks.length ? db.bookmarks.bulkUpsert(remapped.bookmarks as Bookmark[]) : Promise.resolve(),
    remapped.visionItems.length ? db.visionItems.bulkUpsert(remapped.visionItems as VisionBoardItem[]) : Promise.resolve(),
    remapped.mindmaps.length ? db.mindmaps.bulkUpsert(remapped.mindmaps as Mindmap[]) : Promise.resolve(),
    remapped.backlogs.length ? db.backlogs.bulkUpsert(remapped.backlogs as BacklogItem[]) : Promise.resolve(),
    (remapped.timeblocks?.length ?? 0) > 0 ? db.timeblocks.bulkUpsert(remapped.timeblocks as Timeblock[]) : Promise.resolve(),
  ]);

  stats.added = Object.values(importFile.meta.docCounts).reduce((a, b) => a + b, 0);

  onProgress?.({ phase: 'done', current: total, total, message: 'Import complete!' });

  return { success: true, mode: 'append', stats };
}
