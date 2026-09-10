import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { VisionBoardItem } from '@/lib/types';
import { WhiteboardDetail } from '../WhiteboardDetail';

vi.mock('@excalidraw/excalidraw', () => ({
  exportToSvg: vi.fn(async () => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><text>Preview</text></svg>';
    return wrapper.firstElementChild as SVGElement;
  }),
}));

function makeWhiteboard(excalidrawData: string): VisionBoardItem {
  return {
    id: 'whiteboard-1',
    boardId: 'board-1',
    swimlaneId: 'swimlane-1',
    title: 'Unsafe preview',
    content: 'Example',
    excalidrawData,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('WhiteboardDetail', () => {
  it('sanitizes exported SVG content before injecting it', async () => {
    const { container } = render(
      <WhiteboardDetail
        whiteboard={makeWhiteboard(JSON.stringify({ elements: [{ type: 'rectangle' }], appState: {} }))}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('svg')).not.toBeNull();
    });

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('svg')?.getAttribute('onload')).toBeNull();
  });
});
