import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { supabase } from '@/lib/supabase';
import { makeSupabaseSession } from '@/test/mocks/supabase';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: makeSupabaseSession() },
    error: null,
  } as never);

  vi.mocked(global.fetch).mockReset();
});

// Clipboard mock
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

// ---------------------------------------------------------------------------
// Test factory for successful referral info responses
// ---------------------------------------------------------------------------

function mockReferralInfo(overrides: Partial<{
  code: string;
  max_uses: number;
  uses_count: number;
  expires_at: string;
  expired: boolean;
  uses: { ordinal: number; used_at: string }[];
}> = {}) {
  const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  return {
    ok: true,
    code: 'AB3D7F9K',
    max_uses: 5,
    uses_count: 0,
    expires_at: future,
    expired: false,
    uses: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Import component AFTER mocks are set up
// ---------------------------------------------------------------------------

const { ReferralSection } = await import('../ReferralSection');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReferralSection', () => {
  it('shows loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => { /* never resolves */ }));
    render(<ReferralSection />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders the referral code after load', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockReferralInfo(),
    });

    render(<ReferralSection />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('AB3D7F9K')).toBeInTheDocument();
    });
  });

  it('shows usage bar with correct numbers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockReferralInfo({ uses_count: 2, uses: [
        { ordinal: 1, used_at: '2026-05-01T10:00:00Z' },
        { ordinal: 2, used_at: '2026-05-15T08:00:00Z' },
      ] }),
    });

    render(<ReferralSection />);

    await waitFor(() => {
      expect(screen.getByText('2 / 5')).toBeInTheDocument();
    });

    expect(screen.getByText(/user #1/i)).toBeInTheDocument();
    expect(screen.getByText(/user #2/i)).toBeInTheDocument();
  });

  it('copies the code to clipboard when copy button clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockReferralInfo(),
    });

    render(<ReferralSection />);

    await waitFor(() => screen.getByDisplayValue('AB3D7F9K'));

    const copyBtn = screen.getByRole('button', { name: /copy referral code/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('AB3D7F9K');
  });

  it('shows expired state and regenerate button when code is expired', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockReferralInfo({
        expired: true,
        expires_at: new Date(Date.now() - 1000).toISOString(),
      }),
    });

    render(<ReferralSection />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate new code/i })).toBeInTheDocument();
    });
  });

  it('shows not_expired error when trying to regenerate a live code', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockReferralInfo({ expired: true }),
    });

    render(<ReferralSection />);

    await waitFor(() => screen.getByRole('button', { name: /generate new code/i }));

    // regenerate returns not_expired
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, reason: 'not_expired' }),
    });

    fireEvent.click(screen.getByRole('button', { name: /generate new code/i }));

    await waitFor(() => {
      expect(screen.getByText(/hasn't expired yet/i)).toBeInTheDocument();
    });
  });

  it('shows error state on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ReferralSection />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no one has used the code yet', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockReferralInfo({ uses_count: 0, uses: [] }),
    });

    render(<ReferralSection />);

    await waitFor(() => {
      expect(screen.getByText(/nobody has used your code/i)).toBeInTheDocument();
    });
  });
});
