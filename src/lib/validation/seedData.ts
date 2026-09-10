import { z } from 'zod';

const seedBoardColumnSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  order: z.number().optional(),
});

const seedSwimlaneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  label: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  pomodoroMinutes: z.number().optional(),
  breakMinutes: z.number().optional(),
  deadline: z.string().nullable().optional(),
});

const seedBoardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  weekStart: z.number().optional(),
  archiveColumnId: z.string().optional(),
  showArchiveColumn: z.boolean().optional(),
  columns: z.array(seedBoardColumnSchema),
  swimlanes: z.array(seedSwimlaneSchema).optional(),
});

const seedHabitSchema = z.object({
  id: z.string().min(1),
  boardId: z.string().min(1),
  swimlaneId: z.string().min(1),
  title: z.string().min(1),
  color: z.string().optional(),
  order: z.number().optional(),
  breakHabit: z.boolean().optional(),
  frequencyDays: z.array(z.number()).optional(),
  archived: z.boolean().optional(),
  archivedAt: z.string().nullable().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const seedBoardsSchema = z.array(seedBoardSchema);
export const seedHabitsSchema = z.array(seedHabitSchema);

export type SeedBoard = z.infer<typeof seedBoardSchema>;
export type SeedHabit = z.infer<typeof seedHabitSchema>;
