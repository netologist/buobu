import { describe, it, expect, afterEach, vi } from 'vitest';

// src/test/setup.ts deliberately configures a Supabase URL and key, so every
// case below also proves that those values alone no longer select Local Mode.
async function loadFlags(localFlag?: string) {
  vi.resetModules();
  delete process.env.NEXT_PUBLIC_LOCAL_MODE;
  if (localFlag !== undefined) process.env.NEXT_PUBLIC_LOCAL_MODE = localFlag;

  return import('@/lib/feature-flags');
}

describe('operating mode', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_LOCAL_MODE;
    vi.resetModules();
  });

  it('runs in Cloud Mode when the flag is unset', async () => {
    const flags = await loadFlags();

    expect(flags.LOCAL_MODE).toBe(false);
    expect(flags.CLOUD_MODE).toBe(true);
  });

  it('runs in Local Mode when the flag is true', async () => {
    const flags = await loadFlags('true');

    expect(flags.LOCAL_MODE).toBe(true);
    expect(flags.CLOUD_MODE).toBe(false);
  });

  it('treats only the exact string "true" as Local Mode', async () => {
    for (const value of ['false', 'TRUE', '1', 'yes']) {
      const flags = await loadFlags(value);

      expect(flags.LOCAL_MODE, `NEXT_PUBLIC_LOCAL_MODE=${value}`).toBe(false);
    }
  });

  it('forces billing off in Local Mode whatever the billing flag says', async () => {
    process.env.NEXT_PUBLIC_BILLING_ENABLED = 'true';

    const local = await loadFlags('true');
    expect(local.BILLING_ENABLED).toBe(false);

    const cloud = await loadFlags();
    expect(cloud.BILLING_ENABLED).toBe(true);
  });
});
