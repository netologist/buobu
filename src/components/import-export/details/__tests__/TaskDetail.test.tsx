import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Task } from '@/lib/types';
import { TaskDetail } from '../TaskDetail';

function makeTask(description: string): Task {
  return {
    id: 'task-1',
    boardId: 'board-1',
    swimlaneId: 'swimlane-1',
    columnId: 'todo',
    title: 'Sanitize me',
    description,
    labels: [],
    comments: [],
    checklists: [],
    transactions: [],
    worklogs: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('TaskDetail', () => {
  it('sanitizes untrusted description HTML before rendering', () => {
    const { container } = render(
      <TaskDetail task={makeTask('<img src="x" onerror="alert(1)" /><p>Safe text</p><script>alert(1)</script>')} />,
    );

    expect(screen.getByText('Safe text')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('onerror')).toBeNull();
  });
});
