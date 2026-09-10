import type { Database } from '@/lib/rxdb';
import { getDeviceId } from '@/lib/device-id';
import { generateChecksum } from './checksum';
import { APP_VERSION, type ExportFile, type ExportFileData, type ExportFileMeta } from './types';
import { CURRENT_SCHEMA_VERSION } from './migrations';

function getExportFileName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `buobu-backup-${year}-${month}-${day}.json`;
}

async function collectAllData(db: Database, includeArchived = true): Promise<ExportFileData> {
  const [
    tasks,
    backlogs,
    habits,
    habitLogs,
    visionItems,
    notes,
    bookmarks,
    mindmaps,
    boards,
    swimlanes,
    timeblocks,
  ] = await Promise.all([
    db.tasks.find().exec(),
    db.backlogs.find().exec(),
    db.habits.find().exec(),
    db.habitLogs.find().exec(),
    db.visionItems.find().exec(),
    db.notes.find().exec(),
    db.bookmarks.find().exec(),
    db.mindmaps.find().exec(),
    db.boards.find().exec(),
    db.swimlanes.find().exec(),
    db.timeblocks.find().exec(),
  ]);

  const f = <T extends { archived?: boolean }>(arr: T[]): T[] =>
    includeArchived ? arr : arr.filter((d) => !d.archived);

  const allBoards = boards.map(d => d.toMutableJSON());
  const allSwimlanes = swimlanes.map(d => d.toMutableJSON());
  const filteredBoards = f(allBoards);
  const filteredSwimlanes = f(allSwimlanes);
  const boardIds = new Set(filteredBoards.map((b) => b.id));
  const swimlaneIds = new Set(filteredSwimlanes.map((s) => s.id));

  const allHabits = f(habits.map(d => d.toMutableJSON()));
  const habitIds = new Set(allHabits.map((h) => h.id));

  return {
    boards: filteredBoards,
    swimlanes: filteredSwimlanes.filter((s) => boardIds.has(s.boardId ?? '')),
    tasks: f(tasks.map(d => d.toMutableJSON())).filter((t) => boardIds.has(t.boardId) && swimlaneIds.has(t.swimlaneId)),
    habits: allHabits.filter((h) => boardIds.has(h.boardId) && swimlaneIds.has(h.swimlaneId)),
    habitLogs: habitLogs.map(d => d.toMutableJSON()).filter((l) => habitIds.has(l.habitId)),
    notes: f(notes.map(d => d.toMutableJSON())).filter((n) => boardIds.has(n.boardId) && swimlaneIds.has(n.swimlaneId)),
    bookmarks: f(bookmarks.map(d => d.toMutableJSON())).filter((b) => boardIds.has(b.boardId) && swimlaneIds.has(b.swimlaneId)),
    visionItems: f(visionItems.map(d => d.toMutableJSON())).filter((i) => boardIds.has(i.boardId) && swimlaneIds.has(i.swimlaneId)),
    mindmaps: f(mindmaps.map(d => d.toMutableJSON())).filter((m) => boardIds.has(m.boardId) && swimlaneIds.has(m.swimlaneId)),
    backlogs: f(backlogs.map(d => d.toMutableJSON())),
    timeblocks: f(timeblocks.map(d => d.toMutableJSON())).filter((tb) => swimlaneIds.has((tb as { swimlaneId?: string }).swimlaneId ?? '')),
  };
}

function calculateDocCounts(data: ExportFileData): Record<string, number> {
  return {
    boards: data.boards.length,
    swimlanes: data.swimlanes.length,
    tasks: data.tasks.length,
    habits: data.habits.length,
    habitLogs: data.habitLogs.length,
    notes: data.notes.length,
    bookmarks: data.bookmarks.length,
    visionItems: data.visionItems.length,
    mindmaps: data.mindmaps.length,
    backlogs: data.backlogs.length,
    timeblocks: data.timeblocks.length,
  };
}

export async function createExportFile(db: Database, includeArchived = true): Promise<ExportFile> {
  const data = await collectAllData(db, includeArchived);
  const dataString = JSON.stringify(data);
  const checksum = await generateChecksum(dataString);
  
  const meta: ExportFileMeta = {
    checksum,
    docCounts: calculateDocCounts(data),
  };

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    deviceId: getDeviceId(),
    data,
    meta,
  };
}

export function getDocCounts(db: Database): Promise<Record<string, number>> {
  return Promise.all([
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
  ]).then(([boards, swimlanes, tasks, habits, habitLogs, notes, bookmarks, visionItems, mindmaps, backlogs, timeblocks]) => ({
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
  }));
}

export async function exportToFile(db: Database, includeArchived = true): Promise<{ filename: string; size: number }> {
  const exportFile = await createExportFile(db, includeArchived);
  const jsonString = JSON.stringify(exportFile, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const filename = getExportFileName();
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return {
    filename,
    size: blob.size,
  };
}
