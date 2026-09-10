import type { Database } from '@/lib/rxdb';

export type OnboardingStep =
  | 'idle'
  | 'preparing-db'
  | 'initial-sync'
  | 'offline-choice'
  | 'fallback-options'
  | 'import'
  | 'preset-select'
  | 'seeding-default'
  | 'done'
  | 'error';

export async function hasAnyCoreData(db: Database): Promise<boolean> {
  const counts = await Promise.all([
    db.boards.find({ selector: { _deleted: false } }).exec(),
    db.swimlanes.find({ selector: { _deleted: false } }).exec(),
    db.tasks.find({ selector: { _deleted: false } }).exec(),
    db.backlogs.find({ selector: { _deleted: false } }).exec(),
    db.habits.find({ selector: { _deleted: false } }).exec(),
    db.habitLogs.find({ selector: { _deleted: false } }).exec(),
    db.notes.find({ selector: { _deleted: false } }).exec(),
    db.mindmaps.find({ selector: { _deleted: false } }).exec(),
    db.visionItems.find({ selector: { _deleted: false } }).exec(),
  ]);

  return counts.some((items) => items.length > 0);
}
