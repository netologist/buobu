import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// BookmarksBoard uses ScrollArea which requires ResizeObserver as a constructor
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/bookmarks',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) =>
    React.createElement('img', { alt, src }),
}));

vi.mock('@/stores/hooks/use-boards', () => ({
  useBoards: vi.fn(),
  useBoardsSubscription: vi.fn(),
}));

vi.mock('@/stores', () => ({
  useBookmarks: vi.fn().mockReturnValue([]),
  useBookmarksSubscription: vi.fn(),
}));

vi.mock('@/stores/db-store', () => ({
  useDbStore: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/db', () => ({
  getAllBookmarks: vi.fn().mockResolvedValue([]),
  putBookmark: vi.fn().mockResolvedValue(undefined),
  deleteBookmark: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/bookmarks', () => ({
  fetchBookmarkMetadata: vi.fn().mockResolvedValue({
    title: 'Fetched Title',
    description: '',
    favicon: '',
    previewImage: '',
  }),
  getDomainFromUrl: vi.fn((url: string) => new URL(url).hostname),
  makeFallbackMetadata: vi.fn((url: string) => ({ title: url, description: '', favicon: '', previewImage: '' })),
  normalizeBookmarkUrl: vi.fn((url: string) => url),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ middlePanel, rightPanel }: { middlePanel: React.ReactNode; rightPanel: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-layout' },
      React.createElement('div', { 'data-testid': 'middle' }, middlePanel),
      React.createElement('div', { 'data-testid': 'right' }, rightPanel),
    ),
}));

vi.mock('@/components/ui/swimlane-picker-modal', () => ({
  SwimlanePickerModal: () => null,
}));

vi.mock('@/stores/swimlane-selection-store', () => ({
  useSwimlaneSelectionStore: (() => {
    const state = { selections: [] as string[], clearSelection: vi.fn(), selectBoard: vi.fn() };
    return (selector?: (s: typeof state) => unknown) => selector ? selector(state) : state;
  })(),
  useSwimlaneSelectionDerived: () => ({
    selections: [],
    isAllSelected: true,
    selectedSwimlaneIds: new Set(),
    selectedBoardIds: new Set(),
    primaryBoardId: null,
    hasSelections: false,
    isSwimlaneSelected: vi.fn().mockReturnValue(false),
    isBoardSelected: vi.fn().mockReturnValue(false),
  }),
  filterSwimlanes: (s: unknown[]) => s,
  filterItems: (items: unknown[]) => items,
}));

vi.mock('@/stores/archive-filter-store', () => ({
  useArchiveFilterStore: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/naming', () => ({
  DEFAULT_NAMING: { task: 'Task', bookmark: 'Bookmark' },
}));

vi.mock('@/contexts/NamingContext', () => ({
  NamingProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  useNaming: () => ({ task: 'Task', bookmark: 'Bookmark' }),
}));

import { BookmarksBoard } from '../BookmarksBoard';
import { useBoards } from '@/stores/hooks/use-boards';
import { useBookmarks } from '@/stores';
import { fetchBookmarkMetadata } from '@/lib/bookmarks';
import { makeBoard, makeSwimlane, makeBookmark } from '@/test/factories';

function setupBoards() {
  const board = makeBoard({ name: 'Bookmarks Board' });
  const swimlane = makeSwimlane({ boardId: board.id, name: 'Resources' });
  vi.mocked(useBoards).mockReturnValue({
    boards: [board],
    swimlanes: [swimlane],
    activeBoards: [board],
    activeSwimlanes: [swimlane],
    filteredSwimlanes: [swimlane],
    board,
    labels: { task: 'Task' } as never,
    isLoading: false,
    isArchivedSelectionMode: false,
    selections: [],
    isAllSelected: true,
    selectedSwimlaneIds: new Set([swimlane.id]),
    selectedBoardIds: new Set([board.id]),
    primaryBoardId: board.id,
    hasSelections: false,
    isSwimlaneSelected: vi.fn().mockReturnValue(true),
    isBoardSelected: vi.fn().mockReturnValue(true),
    selectAll: vi.fn(),
    selectBoard: vi.fn(),
    toggleSwimlane: vi.fn(),
    clearSelection: vi.fn(),
    putBoard: vi.fn(),
    deleteBoard: vi.fn(),
    putSwimlane: vi.fn(),
    deleteSwimlane: vi.fn(),
    loadBoards: vi.fn(),
    reloadSwimlanes: vi.fn(),
  });
  return { board, swimlane };
}

describe('BookmarksBoard — rendering', () => {
  beforeEach(() => {
    setupBoards();
    vi.mocked(useBookmarks).mockReturnValue([]);
  });

  it('renders the app layout', () => {
    render(<BookmarksBoard />);
    expect(screen.getByTestId('app-layout')).toBeDefined();
  });

  it('renders with no bookmarks without crashing', () => {
    render(<BookmarksBoard />);
    expect(screen.getByTestId('app-layout')).toBeDefined();
  });

  it('renders bookmark titles', () => {
    const { swimlane } = setupBoards();
    const bookmark = makeBookmark({
      swimlaneId: swimlane.id,
      title: 'React Docs',
      url: 'https://react.dev',
    });
    vi.mocked(useBookmarks).mockReturnValue([bookmark]);
    render(<BookmarksBoard />);
    expect(screen.getByText('React Docs')).toBeDefined();
  });

  it('renders multiple bookmarks', () => {
    const { swimlane } = setupBoards();
    const bookmarks = [
      makeBookmark({ swimlaneId: swimlane.id, title: 'TypeScript Handbook', url: 'https://typescriptlang.org' }),
      makeBookmark({ swimlaneId: swimlane.id, title: 'MDN Web Docs', url: 'https://mdn.org' }),
    ];
    vi.mocked(useBookmarks).mockReturnValue(bookmarks);
    render(<BookmarksBoard />);
    expect(screen.getByText('TypeScript Handbook')).toBeDefined();
    expect(screen.getByText('MDN Web Docs')).toBeDefined();
  });

  it('shows add bookmark button', () => {
    render(<BookmarksBoard />);
    expect(screen.getByText(/\+ add bookmark/i)).toBeDefined();
  });
});

describe('BookmarksBoard — add bookmark', () => {
  beforeEach(() => {
    setupBoards();
    vi.mocked(useBookmarks).mockReturnValue([]);
  });

  it('shows URL input when add bookmark is clicked', async () => {
    const user = userEvent.setup();
    render(<BookmarksBoard />);
    const addBtn = screen.getByText(/\+ add bookmark/i);
    await user.click(addBtn);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://...')).toBeDefined();
    });
  });

  it('fetches metadata when Fetch Details is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchBookmarkMetadata).mockResolvedValueOnce({
      title: 'Fetched Title',
      description: 'A description',
      favicon: '',
      previewImage: '',
    });

    render(<BookmarksBoard />);
    await user.click(screen.getByText(/\+ add bookmark/i));

    const urlInput = await screen.findByPlaceholderText('https://...');
    await user.type(urlInput, 'https://example.com');
    await user.click(screen.getByText(/fetch details/i));

    await waitFor(() => expect(fetchBookmarkMetadata).toHaveBeenCalled());
  });
});

describe('BookmarksBoard — search', () => {
  beforeEach(() => {
    setupBoards();
  });

  it('shows search input', () => {
    render(<BookmarksBoard />);
    expect(screen.getByPlaceholderText('Search...')).toBeDefined();
  });

  it('filters bookmarks by title search', async () => {
    const user = userEvent.setup();
    const { swimlane } = setupBoards();
    const bookmarks = [
      makeBookmark({ swimlaneId: swimlane.id, title: 'React Guide', url: 'https://react.dev' }),
      makeBookmark({ swimlaneId: swimlane.id, title: 'Vue Handbook', url: 'https://vuejs.org' }),
    ];
    vi.mocked(useBookmarks).mockReturnValue(bookmarks);

    render(<BookmarksBoard />);
    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'React');

    await waitFor(() => {
      expect(screen.getByText('React Guide')).toBeDefined();
      expect(screen.queryByText('Vue Handbook')).toBeNull();
    });
  });
});
