import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('returns a single class unchanged', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('merges multiple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('ignores falsy values', () => {
    expect(cn('foo', false, null, undefined, 0 as unknown as string, 'bar')).toBe('foo bar');
  });

  it('handles conditional object syntax', () => {
    expect(cn({ active: true, disabled: false })).toBe('active');
  });

  it('merges conflicting Tailwind classes (last wins)', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8');
  });

  it('merges conflicting text color classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles array input', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('handles mixed conditional and static classes', () => {
    const isActive = true;
    expect(cn('base', isActive && 'active')).toBe('base active');
  });

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('');
  });

  it('deduplicates identical classes via tailwind-merge', () => {
    // tailwind-merge keeps the last duplicate class
    const result = cn('flex flex-col', 'flex-row');
    expect(result).toBe('flex flex-row');
  });
});
