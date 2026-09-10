import { vi } from 'vitest';

/**
 * Typed Supabase mock factory.
 *
 * Usage in a test:
 *   import { supabase } from '@/lib/supabase'
 *   vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({ data: { user: makeSupabaseUser() }, error: null })
 */

export type MockSupabaseUser = {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
  identities: MockIdentity[];
};

export type MockIdentity = {
  id: string;
  provider: string;
  user_id: string;
  identity_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MockSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: MockSupabaseUser;
};

export function makeSupabaseUser(overrides: Partial<MockSupabaseUser> = {}): MockSupabaseUser {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: { avatar_url: null },
    app_metadata: {},
    identities: [],
    ...overrides,
  };
}

export function makeSupabaseSession(overrides: Partial<MockSession> = {}): MockSession {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user: makeSupabaseUser(),
    ...overrides,
  };
}

// Builder for chained query mock: supabase.from('table').select().eq().single()
function createQueryBuilder(data: unknown = [], error: unknown = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn().mockImplementation((resolve: (v: unknown) => void) =>
      Promise.resolve({ data, error }).then(resolve),
    ),
  };
  return builder;
}

function createStorageMock() {
  return {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'avatars/test.jpg' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/avatars/test.jpg' } }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  };
}

export function createSupabaseMock() {
  const mock = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'https://accounts.google.com' }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      linkIdentity: vi.fn().mockResolvedValue({ data: {}, error: null }),
      unlinkIdentity: vi.fn().mockResolvedValue({ data: {}, error: null }),
      getUserIdentities: vi.fn().mockResolvedValue({ data: { identities: [] }, error: null }),
      reauthenticate: vi.fn().mockResolvedValue({ data: {}, error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
    from: vi.fn().mockImplementation(() => createQueryBuilder()),
    storage: createStorageMock(),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
    removeAllChannels: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return mock;
}

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;

/**
 * Helper to configure the mock with an authenticated user.
 * Use in beforeEach when the test subject requires an authenticated session.
 */
export function mockAuthenticatedUser(user: Partial<MockSupabaseUser> = {}) {
  const fullUser = makeSupabaseUser(user);
  const session = makeSupabaseSession({ user: fullUser });
  return { user: fullUser, session };
}
