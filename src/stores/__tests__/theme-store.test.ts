import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../theme-store';
import { STORAGE_KEYS } from '@/lib/constants';

const THEME_KEY = STORAGE_KEYS.THEME;

beforeEach(() => {
  useThemeStore.setState({ theme: 'system', resolvedTheme: 'light' });
  localStorage.clear();
});

describe('initial state', () => {
  it('theme defaults to "system"', () => {
    expect(useThemeStore.getState().theme).toBe('system');
  });

  it('resolvedTheme defaults to "light"', () => {
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
  });
});

describe('setTheme', () => {
  it('sets theme to "light"', () => {
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
  });

  it('sets theme to "dark"', () => {
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
  });

  it('persists theme to localStorage', () => {
    useThemeStore.getState().setTheme('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  it('persists "light" theme to localStorage', () => {
    useThemeStore.getState().setTheme('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('sets theme to "system" and resolves via matchMedia (mocked to light)', () => {
    useThemeStore.getState().setTheme('system');
    expect(useThemeStore.getState().theme).toBe('system');
    // matchMedia mock returns matches: false → system resolves to 'light'
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
  });
});

describe('toggleTheme', () => {
  it('cycles system → light', () => {
    // beforeEach sets theme to 'system'
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('cycles light → dark', () => {
    useThemeStore.getState().setTheme('light');
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('cycles dark → system', () => {
    useThemeStore.getState().setTheme('dark');
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('system');
  });

  it('completes a full cycle back to starting theme', () => {
    useThemeStore.getState().setTheme('light');
    useThemeStore.getState().toggleTheme(); // light → dark
    useThemeStore.getState().toggleTheme(); // dark → system
    useThemeStore.getState().toggleTheme(); // system → light
    expect(useThemeStore.getState().theme).toBe('light');
  });
});

describe('initTheme', () => {
  it('loads saved theme from localStorage', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    useThemeStore.getState().initTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
  });

  it('falls back to system when nothing is saved', () => {
    useThemeStore.getState().initTheme();
    expect(useThemeStore.getState().theme).toBe('system');
  });

  it('ignores invalid saved theme values', () => {
    localStorage.setItem(THEME_KEY, 'invalid-theme');
    useThemeStore.getState().initTheme();
    expect(useThemeStore.getState().theme).toBe('system');
  });
});
