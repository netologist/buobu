import { describe, expect, it } from 'vitest';

import { boardFormSchema } from '../boardForm';

const validBoardForm = {
  name: 'Product Roadmap',
  weekStart: '1' as const,
  columns: [
    { id: 'todo', title: 'To Do', order: 0 },
    { id: 'done', title: 'Done', order: 1 },
  ],
  archiveColumnId: 'done',
  showArchiveColumn: false,
};

describe('boardFormSchema', () => {
  it('accepts a valid board form payload', () => {
    expect(boardFormSchema.parse(validBoardForm)).toMatchObject(validBoardForm);
  });

  it('rejects duplicate column titles after trimming and normalization', () => {
    const result = boardFormSchema.safeParse({
      ...validBoardForm,
      columns: [
        { id: 'todo', title: 'Done', order: 0 },
        { id: 'review', title: ' done ', order: 1 },
      ],
      archiveColumnId: 'review',
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['columns'],
          message: 'Column titles must be unique',
        }),
      ]),
    );
  });

  it('rejects an archive column id that is not present in the column list', () => {
    const result = boardFormSchema.safeParse({
      ...validBoardForm,
      archiveColumnId: 'archived',
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['archiveColumnId'],
          message: 'Archive column must match one of the configured columns',
        }),
      ]),
    );
  });
});
