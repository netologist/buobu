import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getAllBoards, getBoardById } from '@/lib/db';
import { makeBoard } from '@/test/factories';
import { BoardModal } from '../board-modal';

const { putBoardMock, deleteBoardMock, archiveBoardMock, putSwimlaneMock } = vi.hoisted(() => ({
  putBoardMock: vi.fn().mockResolvedValue(undefined),
  deleteBoardMock: vi.fn().mockResolvedValue(undefined),
  archiveBoardMock: vi.fn().mockResolvedValue(undefined),
  putSwimlaneMock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/stores/board-store', () => ({
  useBoardStore: {
    getState: () => ({
      boards: [],
      putBoard: putBoardMock,
      deleteBoard: deleteBoardMock,
      archiveBoard: archiveBoardMock,
    }),
  },
}));

vi.mock('@/lib/db', () => ({
  getAllBoards: vi.fn().mockResolvedValue([]),
  getBoardById: vi.fn().mockResolvedValue(null),
  getSwimlanesByBoard: vi.fn().mockResolvedValue([]),
  putSwimlane: putSwimlaneMock,
}));

vi.mock('@/hooks/useUpgradeGuard', () => ({
  useUpgradeGuard: () => ({
    guard: () => true,
    blocked: null,
    dismissDialog: vi.fn(),
  }),
}));

vi.mock('@/stores/entitlements-store', () => ({
  useEntitlements: () => ({ isPlus: false, hasSyncAccess: false }),
}));

describe('BoardModal — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    putBoardMock.mockResolvedValue(undefined);
    putSwimlaneMock.mockResolvedValue(undefined);
  });

  it('shows a validation message when submitted without a board name', async () => {
    const user = userEvent.setup();

    render(
      <BoardModal
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /create board/i }));

    expect(await screen.findByText(/board name is required/i)).toBeDefined();
    expect(putBoardMock).not.toHaveBeenCalled();
    expect(putSwimlaneMock).not.toHaveBeenCalled();
  });

  it('trims the board name before creating a new board', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onCreated = vi.fn();

    putBoardMock.mockImplementation(async (board) => board);

    render(
      <BoardModal
        open={true}
        onOpenChange={onOpenChange}
        onCreated={onCreated}
      />,
    );

    await user.type(screen.getByLabelText(/board name/i), '  Product Roadmap  ');
    await user.click(screen.getByRole('button', { name: /create board/i }));

    await waitFor(() => {
      expect(putBoardMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Product Roadmap' }),
      );
    });
  });

  it('trims the board name before saving an existing board', async () => {
    const user = userEvent.setup();
    const board = makeBoard({ id: 'board-1', name: 'Existing Board' });

    vi.mocked(getBoardById).mockResolvedValue(board);
    vi.mocked(getAllBoards).mockResolvedValue([board, makeBoard({ id: 'board-2', name: 'Second Board' })]);
    putBoardMock.mockImplementation(async (nextBoard) => nextBoard);

    render(
      <BoardModal
        open={true}
        onOpenChange={vi.fn()}
        boardId={board.id}
      />,
    );

    const nameInput = await screen.findByLabelText(/board name/i);
    await user.clear(nameInput);
    await user.type(nameInput, '  Updated Board  ');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(putBoardMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: board.id, name: 'Updated Board' }),
      );
    });
  });

  it('normalizes a legacy archive column id before saving an existing board', async () => {
    const user = userEvent.setup();
    const board = makeBoard({
      id: 'board-1',
      name: 'Existing Board',
      columns: [
        { id: 'todo', title: 'To Do', order: 0 },
        { id: 'done', title: 'Done', order: 1 },
      ],
      archiveColumnId: 'archived',
    });

    vi.mocked(getBoardById).mockResolvedValue(board);
    vi.mocked(getAllBoards).mockResolvedValue([board, makeBoard({ id: 'board-2', name: 'Second Board' })]);
    putBoardMock.mockImplementation(async (nextBoard) => nextBoard);

    render(
      <BoardModal
        open={true}
        onOpenChange={vi.fn()}
        boardId={board.id}
      />,
    );

    await screen.findByLabelText(/board name/i);
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(putBoardMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: board.id, archiveColumnId: 'done' }),
      );
    });
  });
});
