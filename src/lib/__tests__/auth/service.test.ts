import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/lib/supabase';
import { makeSupabaseUser, makeSupabaseSession } from '@/test/mocks/supabase';
import { STORAGE_KEYS } from '@/lib/constants';

// Import the module under test AFTER mocks are set up (vi.mock is hoisted)
import {
  getUser,
  isAuthenticated,
  hasPersistedSession,
  getSessionUser,
  login,
  logout,
  register,
  updatePassword,
  updateEmail,
  getLinkedIdentities,
  linkGoogleAccount,
  unlinkGoogleAccount,
  uploadAvatar,
} from '@/lib/auth/service';

const USER_KEY = STORAGE_KEYS.USER;

type GetUserResponse = Awaited<ReturnType<typeof supabase.auth.getUser>>;
type SignInWithPasswordResponse = Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
type RpcResponse = Awaited<ReturnType<typeof supabase.rpc>>;

function mockGetUserResponse(user: ReturnType<typeof makeSupabaseUser> | null): GetUserResponse {
  return { data: { user: user as never }, error: null } as GetUserResponse;
}

function mockSignInResponse(
  user: ReturnType<typeof makeSupabaseUser> | null,
  session: ReturnType<typeof makeSupabaseSession> | null,
  error: unknown = null,
): SignInWithPasswordResponse {
  return {
    data: { user: user as never, session: session as never },
    error: error as never,
  } as SignInWithPasswordResponse;
}

function mockRpcResponse<T>(data: T, error: unknown = null): RpcResponse {
  return {
    data,
    error: error as never,
    count: null,
    status: 200,
    statusText: 'OK',
  } as unknown as RpcResponse;
}

// Helper: seed localStorage with a cached user
function seedCachedUser(id = 'user-1', email = 'test@example.com', avatarUrl = 'https://example.com/avatar.jpg') {
  localStorage.setItem(USER_KEY, JSON.stringify({ id, email, avatarUrl }));
}

describe('getUser', () => {
  it('returns null when localStorage is empty', () => {
    expect(getUser()).toBeNull();
  });

  it('strips legacy email data from localStorage cache', () => {
    seedCachedUser();

    const user = getUser();

    expect(user?.id).toBe('user-1');
    expect(user?.email).toBeUndefined();
    expect(user?.avatarUrl).toBe('https://example.com/avatar.jpg');
    expect(JSON.parse(localStorage.getItem(USER_KEY)!)).toEqual({
      id: 'user-1',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
  });
});

describe('isAuthenticated', () => {
  it('returns false when no user cached', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('returns true when user is cached', () => {
    seedCachedUser();
    expect(isAuthenticated()).toBe(true);
  });
});

describe('hasPersistedSession', () => {
  it('returns false when no Supabase session token in localStorage', () => {
    expect(hasPersistedSession()).toBe(false);
  });

  it('returns true when Supabase session token exists', () => {
    // NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321' (set in setup.ts)
    // ref = 'localhost' → key = 'sb-localhost-auth-token'
    localStorage.setItem(STORAGE_KEYS.supabaseAuthToken('localhost'), 'mock-token');
    expect(hasPersistedSession()).toBe(true);
  });
});

describe('getSessionUser', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.getUser).mockReset();
  });

  it('returns null and clears cache when no user returned', async () => {
    seedCachedUser();
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce(mockGetUserResponse(null));

    const user = await getSessionUser();
    expect(user).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it('returns mapped user and caches only non-PII fields when user exists', async () => {
    const supaUser = makeSupabaseUser({ id: 'supabase-uid', email: 'a@b.com' });
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce(mockGetUserResponse(supaUser));

    const user = await getSessionUser();
    expect(user?.id).toBe('supabase-uid');
    expect(user?.email).toBe('a@b.com');
    expect(JSON.parse(localStorage.getItem(USER_KEY)!)).toEqual({ id: 'supabase-uid' });
  });

  it('maps avatar_url from user_metadata', async () => {
    const supaUser = makeSupabaseUser({
      user_metadata: { avatar_url: 'https://example.com/avatar.jpg' },
    });
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce(mockGetUserResponse(supaUser));

    const user = await getSessionUser();
    expect(user?.avatarUrl).toBe('https://example.com/avatar.jpg');
  });
});

describe('login', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.signInWithPassword).mockReset();
  });

  it('returns mapped user on success', async () => {
    const supaUser = makeSupabaseUser({ id: 'u1', email: 'user@test.com' });
    const session = makeSupabaseSession({ user: supaUser });
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce(
      mockSignInResponse(supaUser, session),
    );

    const user = await login('user@test.com', 'password123');
    expect(user.id).toBe('u1');
    expect(user.email).toBe('user@test.com');
  });

  it('caches only user id in localStorage on success', async () => {
    const supaUser = makeSupabaseUser({ id: 'u1', email: 'user@test.com' });
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce(
      mockSignInResponse(supaUser, makeSupabaseSession()),
    );

    await login('user@test.com', 'password123');
    expect(JSON.parse(localStorage.getItem(USER_KEY)!)).toEqual({ id: 'u1' });
  });

  it('throws when supabase returns an error', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce(
      mockSignInResponse(null, null, { message: 'Invalid credentials', status: 400 }),
    );

    await expect(login('bad@email.com', 'wrong')).rejects.toThrow();
  });

  it('throws when user is null despite no error', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce(
      mockSignInResponse(null, null),
    );

    await expect(login('a@b.com', 'pw')).rejects.toThrow('Login failed');
  });
});

describe('logout', () => {
  it('calls supabase.auth.signOut', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });
    await logout();
    expect(supabase.auth.signOut).toHaveBeenCalledOnce();
  });

  it('clears user from localStorage', async () => {
    seedCachedUser();
    vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });
    await logout();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it('clears session tokens and storage even when signOut returns an error', async () => {
    seedCachedUser();
    localStorage.setItem('buobu_entitlements', JSON.stringify({ plus: true }));
    localStorage.setItem('sb-testproject-auth-token', 'mock-token');
    vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
      error: { message: 'Network error', name: 'AuthApiError', status: 500 } as any,
    });

    await expect(logout()).resolves.toBeUndefined();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(localStorage.getItem('buobu_entitlements')).toBeNull();
    expect(localStorage.getItem('sb-testproject-auth-token')).toBeNull();
  });
});

describe('register', () => {
  beforeEach(() => {
    vi.mocked(supabase.rpc).mockReset();
  });

  it('throws when invite code is empty', async () => {
    await expect(register('a@b.com', 'pw', '')).rejects.toThrow('Invite code is required');
  });

  it('rejects an invite code with invalid characters, without calling the server', async () => {
    await expect(register('a@b.com', 'pw', 'inv@lid!')).rejects.toThrow();
    expect(vi.mocked(supabase.rpc)).not.toHaveBeenCalled();
  });

  it('rejects an invite code that is too short, without calling the server', async () => {
    await expect(register('a@b.com', 'pw', 'ABC')).rejects.toThrow();
    expect(vi.mocked(supabase.rpc)).not.toHaveBeenCalled();
  });

  it('throws when invite code is invalid (server rejects)', async () => {
    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce(mockRpcResponse(false))  // validate_campaign_code
      .mockResolvedValueOnce(mockRpcResponse(false)); // validate_referral_code
    await expect(register('a@b.com', 'pw', 'VALIDCODE')).rejects.toThrow(
      'Invalid or expired invite code'
    );
  });
});

describe('updatePassword', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.signOut).mockClear();
  });

  it('calls supabase.auth.updateUser with new password', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: makeSupabaseUser() as never },
      error: null,
    });

    await updatePassword('newPassword123');
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newPassword123' });
  });

  it('throws when supabase returns an error', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: null as never },
      error: { message: 'Password too short' } as never,
    });

    await expect(updatePassword('pw')).rejects.toThrow();
  });

  // A password change is the only point at which a user can eject an attacker who
  // holds a session lifted from localStorage, so this has to be asserted rather
  // than assumed -- Supabase keeps other sessions alive by default.
  it('revokes every other session after a successful change', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: makeSupabaseUser() as never },
      error: null,
    });

    await updatePassword('newPassword123');

    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'others' });
  });

  it('leaves other sessions alone when the change failed', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: null as never },
      error: { message: 'Password too short' } as never,
    });

    await expect(updatePassword('pw')).rejects.toThrow();

    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });
});

describe('updateEmail', () => {
  it('calls supabase.auth.updateUser with new email', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: makeSupabaseUser() as never },
      error: null,
    });

    await updateEmail('new@email.com');
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ email: 'new@email.com' });
  });
});

describe('getLinkedIdentities', () => {
  it('returns empty array on error', async () => {
    vi.mocked(supabase.auth.getUserIdentities).mockResolvedValueOnce({
      data: null as never,
      error: { message: 'error' } as never,
    });

    const result = await getLinkedIdentities();
    expect(result).toEqual([]);
  });

  it('maps identities to simplified format', async () => {
    vi.mocked(supabase.auth.getUserIdentities).mockResolvedValueOnce({
      data: {
        identities: [
          {
            provider: 'google',
            identity_id: 'gid-123',
            identity_data: { email: 'user@gmail.com' },
          },
        ],
      } as never,
      error: null,
    });

    const result = await getLinkedIdentities();
    expect(result).toHaveLength(1);
    expect(result[0].provider).toBe('google');
    expect(result[0].identityId).toBe('gid-123');
    expect(result[0].email).toBe('user@gmail.com');
  });
});

describe('linkGoogleAccount', () => {
  it('calls supabase.auth.linkIdentity with google provider', async () => {
    vi.mocked(supabase.auth.linkIdentity).mockResolvedValueOnce({
      data: {} as never,
      error: null,
    });

    await linkGoogleAccount();
    expect(supabase.auth.linkIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' })
    );
  });

  it('throws when linkIdentity returns an error', async () => {
    vi.mocked(supabase.auth.linkIdentity).mockResolvedValueOnce({
      data: {} as never,
      error: { message: 'OAuth error' } as never,
    });

    await expect(linkGoogleAccount()).rejects.toThrow();
  });
});

describe('unlinkGoogleAccount', () => {
  it('throws when getUserIdentities fails', async () => {
    vi.mocked(supabase.auth.getUserIdentities).mockResolvedValueOnce({
      data: null as never,
      error: { message: 'fetch error' } as never,
    });

    await expect(unlinkGoogleAccount('any-id')).rejects.toThrow('Could not fetch identities');
  });

  it('throws when identity ID is not found', async () => {
    vi.mocked(supabase.auth.getUserIdentities).mockResolvedValueOnce({
      data: { identities: [] } as never,
      error: null,
    });

    await expect(unlinkGoogleAccount('missing-id')).rejects.toThrow('Google identity not found');
  });

  it('calls unlinkIdentity with the found identity object', async () => {
    const mockIdentity = {
      identity_id: 'gid-abc',
      provider: 'google',
      user_id: 'u1',
      identity_data: {},
      created_at: '',
      updated_at: '',
    };
    vi.mocked(supabase.auth.getUserIdentities).mockResolvedValueOnce({
      data: { identities: [mockIdentity] } as never,
      error: null,
    });
    vi.mocked(supabase.auth.unlinkIdentity).mockResolvedValueOnce({
      data: {} as never,
      error: null,
    });

    await unlinkGoogleAccount('gid-abc');
    expect(supabase.auth.unlinkIdentity).toHaveBeenCalledWith(mockIdentity);
  });
});

describe('uploadAvatar', () => {
  const makeFile = (name: string) => new File(['content'], name, { type: 'image/jpeg' });

  it('throws for disallowed extension (.svg)', async () => {
    const file = new File(['content'], 'avatar.svg', { type: 'image/svg+xml' });
    await expect(uploadAvatar('user-1', file)).rejects.toThrow('Only JPG, PNG, and WebP');
  });

  it('throws for disallowed extension (.exe)', async () => {
    const file = new File(['content'], 'malware.exe', { type: 'application/octet-stream' });
    await expect(uploadAvatar('user-1', file)).rejects.toThrow('Only JPG, PNG, and WebP');
  });

  it('throws for disallowed extension (.html)', async () => {
    const file = new File(['content'], 'page.html', { type: 'text/html' });
    await expect(uploadAvatar('user-1', file)).rejects.toThrow('Only JPG, PNG, and WebP');
  });

  it('accepts .jpg extension', async () => {
    const file = makeFile('avatar.jpg');
    vi.mocked(supabase.storage.from('avatars').upload).mockResolvedValueOnce({
      data: { path: 'user-1/avatar.jpg' } as never,
      error: null,
    });
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: makeSupabaseUser() as never },
      error: null,
    });

    const url = await uploadAvatar('user-1', file);
    expect(typeof url).toBe('string');
  });

  it('accepts .jpeg extension', async () => {
    const file = makeFile('avatar.jpeg');
    vi.mocked(supabase.storage.from('avatars').upload).mockResolvedValueOnce({
      data: { path: 'user-1/avatar.jpeg' } as never,
      error: null,
    });
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: makeSupabaseUser() as never },
      error: null,
    });

    const url = await uploadAvatar('user-1', file);
    expect(typeof url).toBe('string');
  });

  it('accepts .png extension', async () => {
    const file = new File(['content'], 'avatar.png', { type: 'image/png' });
    vi.mocked(supabase.storage.from('avatars').upload).mockResolvedValueOnce({
      data: { path: 'user-1/avatar.png' } as never,
      error: null,
    });
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: makeSupabaseUser() as never },
      error: null,
    });

    const url = await uploadAvatar('user-1', file);
    expect(typeof url).toBe('string');
  });

  it('accepts .webp extension', async () => {
    const file = new File(['content'], 'avatar.webp', { type: 'image/webp' });
    vi.mocked(supabase.storage.from('avatars').upload).mockResolvedValueOnce({
      data: { path: 'user-1/avatar.webp' } as never,
      error: null,
    });
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: makeSupabaseUser() as never },
      error: null,
    });

    const url = await uploadAvatar('user-1', file);
    expect(typeof url).toBe('string');
  });

  it('throws when storage upload fails', async () => {
    const file = makeFile('avatar.jpg');
    vi.mocked(supabase.storage.from('avatars').upload).mockResolvedValueOnce({
      data: null as never,
      error: { message: 'Storage quota exceeded' } as never,
    });

    await expect(uploadAvatar('user-1', file)).rejects.toThrow();
  });

  it('uploads to the correct path: userId/avatar.ext', async () => {
    const file = makeFile('photo.jpg');
    const uploadMock = vi.mocked(supabase.storage.from('avatars').upload);
    uploadMock.mockResolvedValueOnce({
      data: { path: 'user-42/avatar.jpg' } as never,
      error: null,
    });
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: makeSupabaseUser() as never },
      error: null,
    });

    await uploadAvatar('user-42', file);
    expect(uploadMock).toHaveBeenCalledWith(
      'user-42/avatar.jpg',
      file,
      expect.objectContaining({ upsert: true })
    );
  });
});
