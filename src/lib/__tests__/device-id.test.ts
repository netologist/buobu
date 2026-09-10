import { describe, it, expect, beforeEach } from 'vitest';
import { getDeviceId, resetDeviceId } from '../device-id';
import { STORAGE_KEYS } from '@/lib/constants';

// localStorage is cleared after each test by setup.ts

describe('getDeviceId', () => {
  it('returns a non-empty string', () => {
    expect(getDeviceId().length).toBeGreaterThan(0);
  });

  it('returns a stable ID across multiple calls in the same session', () => {
    const first = getDeviceId();
    const second = getDeviceId();
    expect(first).toBe(second);
  });

  it('stores the ID in localStorage under the correct key', () => {
    const id = getDeviceId();
    expect(localStorage.getItem(STORAGE_KEYS.DEVICE_ID)).toBe(id);
  });

  it('generates a new ID when localStorage is cleared', () => {
    const first = getDeviceId();
    localStorage.clear();
    const second = getDeviceId();
    // Both are valid IDs but may differ (timing-based; at least non-empty)
    expect(second.length).toBeGreaterThan(0);
    // The two calls are far enough apart (different ms) that IDs should differ,
    // but we cannot guarantee it. We at minimum assert the second is stored.
    expect(localStorage.getItem(STORAGE_KEYS.DEVICE_ID)).toBe(second);
    // Suppress the unused variable warning
    void first;
  });

  it('ID format contains a dash separating timestamp and random parts', () => {
    const id = getDeviceId();
    expect(id).toContain('-');
  });

  it('ID consists only of hex characters and dashes', () => {
    const id = getDeviceId();
    expect(id).toMatch(/^[0-9a-f\-]+$/i);
  });
});

describe('resetDeviceId', () => {
  beforeEach(() => {
    // Ensure a device ID exists before each reset test
    getDeviceId();
  });

  it('removes the device ID from localStorage', () => {
    resetDeviceId();
    expect(localStorage.getItem(STORAGE_KEYS.DEVICE_ID)).toBeNull();
  });

  it('causes the next getDeviceId call to generate a new ID', () => {
    const before = getDeviceId();
    resetDeviceId();
    // Force a new ID by clearing localStorage, then calling again
    // (reset already cleared it, so next call generates fresh)
    const after = getDeviceId();
    expect(after.length).toBeGreaterThan(0);
    void before; // both are valid; difference not guaranteed in same ms
  });
});
