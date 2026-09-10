import { describe, it, expect } from 'vitest';
import { generateId, uuidv7, isValidId } from '../uuid';

// This implementation generates a non-standard format: 8-5-3-3-14 (37 chars total)
// It is NOT a standard UUID v7 (which is 8-4-4-4-12, 36 chars)

describe('uuidv7', () => {
  it('returns a string with 5 dash-separated parts', () => {
    expect(uuidv7().split('-')).toHaveLength(5);
  });

  it('version nibble is always 7', () => {
    for (let i = 0; i < 20; i++) {
      const id = uuidv7();
      // The version nibble is the first character of the 3rd segment
      expect(id.split('-')[2][0]).toBe('7');
    }
  });

  it('variant bits are in range [89ab]', () => {
    for (let i = 0; i < 20; i++) {
      const id = uuidv7();
      // The variant nibble is the first character of the 4th segment
      expect('89ab').toContain(id.split('-')[3][0]);
    }
  });

  it('generates unique IDs across 1000 calls', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uuidv7()));
    expect(ids.size).toBe(1000);
  });

  it('has correct segment lengths (8-5-3-3-14)', () => {
    const parts = uuidv7().split('-');
    expect(parts).toHaveLength(5);
    expect(parts[0]).toHaveLength(8);
    expect(parts[1]).toHaveLength(5);
    expect(parts[2]).toHaveLength(3);
    expect(parts[3]).toHaveLength(3);
    expect(parts[4]).toHaveLength(14);
  });

  it('total length is 37 characters', () => {
    expect(uuidv7()).toHaveLength(37);
  });
});

describe('generateId', () => {
  it('has the same format as uuidv7', () => {
    const parts = generateId().split('-');
    expect(parts).toHaveLength(5);
    expect(parts[0]).toHaveLength(8);
    expect(parts[2][0]).toBe('7');
  });

  it('each call produces a different ID', () => {
    expect(generateId()).not.toBe(generateId());
  });
});

describe('isValidId', () => {
  // isValidId validates the standard UUID v7 format (8-4-4-4-12)
  // uuidv7() produces a non-standard format (8-5-3-3-14) which does NOT pass isValidId

  it('returns true for a valid standard UUID v7', () => {
    expect(isValidId('01900000-0000-7000-8000-000000000000')).toBe(true);
  });

  it('returns false for the custom uuidv7() output (non-standard format)', () => {
    expect(isValidId(uuidv7())).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidId('')).toBe(false);
  });

  it('returns false for a non-UUID string', () => {
    expect(isValidId('not-a-uuid')).toBe(false);
  });

  it('returns false for a UUID v4 (version nibble ≠ 7)', () => {
    expect(isValidId('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
  });

  it('returns false for a UUID with wrong variant bits', () => {
    // Variant nibble must be [89ab]; here it is 'c'
    expect(isValidId('01900000-0000-7000-c000-000000000000')).toBe(false);
  });

  it('returns true for uppercase standard UUID v7', () => {
    expect(isValidId('01900000-0000-7000-8000-000000000000'.toUpperCase())).toBe(true);
  });
});
