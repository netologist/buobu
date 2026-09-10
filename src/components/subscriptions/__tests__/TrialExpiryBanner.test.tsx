import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock dependencies before importing the component under test.
// ---------------------------------------------------------------------------

const mockStartCheckout = vi.fn();
vi.mock('@/lib/subscriptions/checkout', () => ({
  startCheckout: (...args: unknown[]) => mockStartCheckout(...args),
}));

// Mock trial-warning so we don't need fake timers and tests are fully
// deterministic regardless of when they run.
const mockShouldShow = vi.fn((trialEnd: string | null | undefined) => {
  void trialEnd;
  return false;
});
const mockGetDays = vi.fn((trialEnd: string | null | undefined): number | null => {
  void trialEnd;
  return null;
});

vi.mock('@/lib/subscriptions/trial-warning', () => ({
  shouldShowTrialWarning: (trialEnd: string | null | undefined) => mockShouldShow(trialEnd),
  getTrialDaysRemaining: (trialEnd: string | null | undefined) => mockGetDays(trialEnd),
}));

import { TrialExpiryBanner } from '../TrialExpiryBanner';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISMISS_KEY = 'buobu_trial_banner_dismissed';
// Arbitrary ISO string — only meaningful to the component as a prop passthrough.
const TRIAL_END_1_DAY = '2026-01-11T12:00:00Z';
const TRIAL_END_2_DAYS = '2026-01-12T12:00:00Z';
const TRIAL_END_TODAY = '2026-01-10T13:00:00Z';

// ---------------------------------------------------------------------------
// Reset state before each test.
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  mockStartCheckout.mockReset();
  mockStartCheckout.mockResolvedValue(undefined);
  mockShouldShow.mockReset();
  mockGetDays.mockReset();
});

// ---------------------------------------------------------------------------
// Not rendered cases
// ---------------------------------------------------------------------------

describe('TrialExpiryBanner — not rendered', () => {
  it('renders nothing when trialEnd is null', () => {
    mockShouldShow.mockReturnValue(false);
    const { container } = render(<TrialExpiryBanner trialEnd={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when trialEnd is undefined', () => {
    mockShouldShow.mockReturnValue(false);
    const { container } = render(<TrialExpiryBanner trialEnd={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when shouldShowTrialWarning returns false (>2 days away)', () => {
    mockShouldShow.mockReturnValue(false);
    const { container } = render(<TrialExpiryBanner trialEnd="2026-01-20T00:00:00Z" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when trial has already expired', () => {
    mockShouldShow.mockReturnValue(false);
    const { container } = render(<TrialExpiryBanner trialEnd="2026-01-01T00:00:00Z" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when banner was previously dismissed (localStorage)', () => {
    mockShouldShow.mockReturnValue(true);
    mockGetDays.mockReturnValue(1);
    localStorage.setItem(DISMISS_KEY, '1');
    const { container } = render(<TrialExpiryBanner trialEnd={TRIAL_END_1_DAY} />);
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Rendered cases — label text
// ---------------------------------------------------------------------------

describe('TrialExpiryBanner — label copy', () => {
  it('shows "ends today" when trial expires within 24 hours (0 days remaining)', () => {
    mockShouldShow.mockReturnValue(true);
    mockGetDays.mockReturnValue(0);
    render(<TrialExpiryBanner trialEnd={TRIAL_END_TODAY} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/ends today/i)).toBeTruthy();
  });

  it('shows "ends tomorrow" when trial ends in exactly 1 day', () => {
    mockShouldShow.mockReturnValue(true);
    mockGetDays.mockReturnValue(1);
    render(<TrialExpiryBanner trialEnd={TRIAL_END_1_DAY} />);
    expect(screen.getByText(/ends tomorrow/i)).toBeTruthy();
  });

  it('shows "ends in 2 days" when trial ends in exactly 2 days', () => {
    mockShouldShow.mockReturnValue(true);
    mockGetDays.mockReturnValue(2);
    render(<TrialExpiryBanner trialEnd={TRIAL_END_2_DAYS} />);
    expect(screen.getByText(/ends in 2 days/i)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Dismiss behaviour
// ---------------------------------------------------------------------------

describe('TrialExpiryBanner — dismiss', () => {
  it('hides the banner after clicking the dismiss button', () => {
    mockShouldShow.mockReturnValue(true);
    mockGetDays.mockReturnValue(1);
    render(<TrialExpiryBanner trialEnd={TRIAL_END_1_DAY} />);
    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissBtn);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('persists dismissal in localStorage', () => {
    mockShouldShow.mockReturnValue(true);
    mockGetDays.mockReturnValue(1);
    render(<TrialExpiryBanner trialEnd={TRIAL_END_1_DAY} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(localStorage.getItem(DISMISS_KEY)).toBe('1');
  });
});

// ---------------------------------------------------------------------------
// Upgrade CTA
// ---------------------------------------------------------------------------

describe('TrialExpiryBanner — upgrade CTA', () => {
  it('renders an "Upgrade to Plus" button', () => {
    mockShouldShow.mockReturnValue(true);
    mockGetDays.mockReturnValue(1);
    render(<TrialExpiryBanner trialEnd={TRIAL_END_1_DAY} />);
    expect(screen.getByRole('button', { name: /upgrade to plus/i })).toBeTruthy();
  });

  it('calls startCheckout when upgrade button is clicked', async () => {
    mockShouldShow.mockReturnValue(true);
    mockGetDays.mockReturnValue(1);
    render(<TrialExpiryBanner trialEnd={TRIAL_END_1_DAY} />);
    fireEvent.click(screen.getByRole('button', { name: /upgrade to plus/i }));
    await waitFor(() => {
      expect(mockStartCheckout).toHaveBeenCalledTimes(1);
    });
  });

  it('shows "Redirecting…" while checkout is in flight', async () => {
    mockShouldShow.mockReturnValue(true);
    mockGetDays.mockReturnValue(1);
    // Never resolves during this test.
    mockStartCheckout.mockReturnValue(new Promise(() => {}));

    render(<TrialExpiryBanner trialEnd={TRIAL_END_1_DAY} />);
    fireEvent.click(screen.getByRole('button', { name: /upgrade to plus/i }));

    await waitFor(() => {
      expect(screen.getByText(/redirecting/i)).toBeTruthy();
    });
  });
});
