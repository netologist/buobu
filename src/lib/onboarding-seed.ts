import { generateId } from '@/lib/uuid';
import { getDeviceId } from '@/lib/device-id';
import type { Database } from '@/lib/rxdb';
import type { Board, Swimlane } from '@/lib/types';
import presets from '@/data/onboarding-presets.json';
import { DEFAULT_ARCHIVE_COLUMN_ID, DEFAULT_CURRENCY } from '@/lib/constants';

type PresetSwimlane = {
  name: string;
  label?: string;
  currency?: string;
  color?: string;
  pomodoroMinutes?: number;
  breakMinutes?: number;
};

type PresetBoard = {
  name: string;
  columns?: Array<{ id: string; title: string }>;
  weekStart?: number;
  swimlanes?: PresetSwimlane[];
};

type OnboardingPreset = {
  id: string;
  label: string;
  description: string;
  boards: PresetBoard[];
};

export function getOnboardingPresets(): OnboardingPreset[] {
  return presets as OnboardingPreset[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function baseMeta(userId: string) {
  const now = nowIso();
  return {
    user_id: userId,
    _modified: Date.now(),
    _version: 1,
    _createdAt: now,
    _updatedAt: now,
    _deleted: false,
    _deviceId: getDeviceId(),
  };
}

function buildBoard(userId: string, boardInput: PresetBoard): Board {
  const now = nowIso();
  return {
    id: generateId(),
    name: boardInput.name,
    columns: boardInput.columns && boardInput.columns.length > 0
      ? boardInput.columns
      : [
          { id: 'todo', title: 'To Do' },
          { id: 'in-progress', title: 'In Progress' },
          { id: DEFAULT_ARCHIVE_COLUMN_ID, title: 'Done' },
        ],
    weekStart: boardInput.weekStart ?? 1,
    createdAt: now,
    updatedAt: now,
    ...baseMeta(userId),
  };
}

function buildSwimlane(userId: string, boardId: string, swimlaneInput: PresetSwimlane): Swimlane {
  const now = nowIso();
  return {
    id: generateId(),
    boardId,
    name: swimlaneInput.name,
    label: swimlaneInput.label,
    currency: swimlaneInput.currency ?? DEFAULT_CURRENCY,
    color: swimlaneInput.color ?? '#3b82f6',
    pomodoroMinutes: swimlaneInput.pomodoroMinutes ?? 25,
    breakMinutes: swimlaneInput.breakMinutes ?? 5,
    createdAt: now,
    updatedAt: now,
    ...baseMeta(userId),
  };
}

export async function seedFromPreset(presetId: string, db: Database, userId: string): Promise<void> {
  const preset = getOnboardingPresets().find((p) => p.id === presetId);
  if (!preset) {
    throw new Error('Preset not found');
  }

  for (const boardInput of preset.boards) {
    const board = buildBoard(userId, boardInput);
    await db.boards.insert(board);

    const swimlanes = boardInput.swimlanes && boardInput.swimlanes.length > 0
      ? boardInput.swimlanes
      : [{ name: 'Default Swimlane', label: 'Default' }];

    for (const swimlaneInput of swimlanes) {
      const swimlane = buildSwimlane(userId, board.id, swimlaneInput);
      await db.swimlanes.insert(swimlane);
    }
  }
}

export async function seedDefaultWorkspace(db: Database, userId: string): Promise<void> {
  await seedFromPreset('minimal', db, userId);
}
