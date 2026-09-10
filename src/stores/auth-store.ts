'use client';

import { create } from 'zustand';
import type { User } from '@/lib/auth/service';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setAuthState: (next: { user: User | null; isLoading: boolean }) => void;
  resetAuthState: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setAuthState: ({ user, isLoading }) => {
    set({
      user,
      isLoading,
      isAuthenticated: !!user,
    });
  },

  resetAuthState: () => {
    set({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    });
  },
}));
