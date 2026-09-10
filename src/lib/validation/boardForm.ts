import { z } from 'zod';

export const boardColumnSchema = z.object({
  id: z.string().trim().min(1, 'Column id is required'),
  title: z.string().trim().min(1, 'Column title is required'),
  order: z.number().int().nonnegative().optional(),
});

export const boardFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Board name is required'),
    description: z.string().trim().optional(),
    weekStart: z.enum(['0', '1', '2', '3', '4', '5', '6']),
    columns: z.array(boardColumnSchema).min(1, 'At least one column is required'),
    archiveColumnId: z.string().trim().min(1, 'Archive column is required'),
    showArchiveColumn: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const columnIds = new Set<string>();
    const columnTitles = new Set<string>();
    let hasDuplicateIds = false;
    let hasDuplicateTitles = false;

    for (const column of data.columns) {
      if (columnIds.has(column.id)) {
        hasDuplicateIds = true;
      } else {
        columnIds.add(column.id);
      }

      const normalizedTitle = column.title.toLocaleLowerCase();
      if (columnTitles.has(normalizedTitle)) {
        hasDuplicateTitles = true;
      } else {
        columnTitles.add(normalizedTitle);
      }
    }

    if (hasDuplicateIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['columns'],
        message: 'Column ids must be unique',
      });
    }

    if (hasDuplicateTitles) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['columns'],
        message: 'Column titles must be unique',
      });
    }

    if (!data.columns.some((column) => column.id === data.archiveColumnId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['archiveColumnId'],
        message: 'Archive column must match one of the configured columns',
      });
    }
  });

export type BoardFormValues = z.infer<typeof boardFormSchema>;
