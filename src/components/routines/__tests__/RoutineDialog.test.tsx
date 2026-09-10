import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoutineDialog } from '../RoutineDialog';

const useBoardsMock = vi.fn();

vi.mock('@/stores/hooks/use-boards', () => ({
  useBoards: () => useBoardsMock(),
}));

const boards = [
  {
    id: 'board-1',
    name: 'Operations',
    archived: false,
    columns: [{ id: 'todo', title: 'To Do', order: 0 }],
  },
];

const swimlanes = [
  {
    id: 'lane-1',
    boardId: 'board-1',
    name: 'General',
    archived: false,
    currency: 'USD',
  },
];

describe('RoutineDialog — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBoardsMock.mockReturnValue({ boards, swimlanes });
  });

  it('requires an event time before saving an event routine', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <RoutineDialog
        open={true}
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
    );

    await user.type(screen.getByLabelText(/title/i), 'Team sync');
    await user.click(screen.getByRole('button', { name: /^event$/i }));
    await user.click(screen.getByRole('button', { name: /create routine/i }));

    expect(await screen.findByText(/event time is required/i)).toBeDefined();
    expect(onSave).not.toHaveBeenCalled();
  });
});
