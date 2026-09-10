'use client';

import { create } from 'zustand';
import { STORAGE_KEYS } from '@/lib/constants';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'system',
  resolvedTheme: 'light',

  setTheme: (theme: Theme) => {
    const resolvedTheme = resolveTheme(theme);
    set({ theme, resolvedTheme });
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.THEME, theme);
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  },

  toggleTheme: () => {
    const currentTheme = get().theme;
    const themeOrder: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themeOrder.indexOf(currentTheme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    get().setTheme(nextTheme);
  },

  initTheme: () => {
    if (typeof window === 'undefined') return;

    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null;
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        const resolved = resolveTheme(savedTheme);
        set({ theme: savedTheme, resolvedTheme: resolved });
      } else {
        const resolved = getSystemTheme();
        set({ theme: 'system', resolvedTheme: resolved });
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
      set({ theme: 'system', resolvedTheme: 'light' });
    }
  },
}));
