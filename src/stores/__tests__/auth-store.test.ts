import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useAuthStore } from '../auth-store';

const resetStore = () =>
  useAuthStore.setState({ user: null, isLoading: true, isAuthenticated: false });

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
});

describe('initial state', () => {
  it('user is null', () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('isLoading is true', () => {
    expect(useAuthStore.getState().isLoading).toBe(true);
  });

  it('isAuthenticated is false', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('setAuthState', () => {
  it('sets unauthenticated state when user is null', () => {
    useAuthStore.getState().setAuthState({ user: null, isLoading: false });
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('sets authenticated state when user exists', () => {
    const mockUser = { id: 'u1', email: 'a@b.com' };
    useAuthStore.getState().setAuthState({ user: mockUser, isLoading: false });
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});

describe('resetAuthState', () => {
  it('returns state back to initial values', () => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'a@b.com' },
      isLoading: false,
      isAuthenticated: true,
    });

    useAuthStore.getState().resetAuthState();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isLoading).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
