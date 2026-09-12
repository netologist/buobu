// Must be set before any module that imports @/lib/supabase to prevent the
// "Missing Supabase environment variables" throw at module load time.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-anon-key';
// Enable billing in tests so billing-related test suites work correctly.
process.env.NEXT_PUBLIC_BILLING_ENABLED = 'true';

import '@testing-library/jest-dom/vitest';

// Polyfill IndexedDB for RxDB/Dexie in jsdom
import 'fake-indexeddb/auto';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return Array.from(this.data.keys())[index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
}

if (typeof window !== 'undefined') {
  const memLocal = new MemoryStorage();
  const memSession = new MemoryStorage();
  Object.defineProperty(window, 'localStorage', { value: memLocal, writable: true, configurable: true });
  Object.defineProperty(window, 'sessionStorage', { value: memSession, writable: true, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: memLocal, writable: true, configurable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: memSession, writable: true, configurable: true });
}

import { vi, beforeEach, afterEach } from 'vitest';
import { STORAGE_KEYS } from '@/lib/constants';

// ── Next.js stubs ──────────────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [k: string]: unknown }) => {
    return Object.assign(document.createElement('img'), { src, alt, ...props });
  },
}));

// ── Supabase stub ──────────────────────────────────────────────────────────────
// Individual tests can override specific methods via vi.mocked(supabase.auth.getUser).mockResolvedValue(...)
vi.mock('@/lib/supabase', async () => {
  const { createSupabaseMock } = await import('./mocks/supabase');
  return { supabase: createSupabaseMock() };
});

// ── Browser API stubs ──────────────────────────────────────────────────────────
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// next/link calls `new IntersectionObserver(...)` — must be a class, not an arrow fn
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  root = null;
  rootMargin = '';
  thresholds: ReadonlyArray<number> = [];
}
global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// URL.createObjectURL is used by file uploads
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// ── Per-test defaults ──────────────────────────────────────────────────────────
// Suppress the DailyBriefing toast by marking it as already dismissed today.
// Without this, the fixed-position overlay (z-[120]) can block pointer events
// and cause unrelated tests to fail intermittently.
beforeEach(() => {
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  localStorage.setItem(STORAGE_KEYS.DAILY_BRIEFING_DATE, key);
});

// ── Cleanup ────────────────────────────────────────────────────────────────────
afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});
