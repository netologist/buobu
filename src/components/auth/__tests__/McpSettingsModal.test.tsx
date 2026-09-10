import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// Control isPlus per-test
// ---------------------------------------------------------------------------
const mockIsPlus = vi.hoisted(() => ({ value: false }));

vi.mock('@/stores/entitlements-store', () => ({
  useEntitlements: () => ({ isPlus: mockIsPlus.value }),
}));

vi.mock('@/lib/mcp/api-keys', () => ({
  createApiKey: vi.fn(),
  listApiKeys: vi.fn().mockResolvedValue([]),
  revokeApiKey: vi.fn(),
}));

vi.mock('@/lib/subscriptions/checkout', () => ({
  startCheckout: vi.fn().mockResolvedValue(undefined),
}));

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_YEARLY = 'price_yearly_test';
});

import { McpSettingsModal } from '../McpSettingsModal';
import { listApiKeys } from '@/lib/mcp/api-keys';
import { startCheckout } from '@/lib/subscriptions/checkout';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderModal(userId: string | null | undefined = 'user-1') {
  return render(
    <McpSettingsModal open={true} onOpenChange={vi.fn()} userId={userId} />,
  );
}

beforeEach(() => {
  mockIsPlus.value = false;
  vi.mocked(listApiKeys).mockResolvedValue([]);
  vi.mocked(startCheckout).mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// M5 — Plus-gated UI (Free user)
// ---------------------------------------------------------------------------

describe('McpSettingsModal — Free user (Plus gate)', () => {
  beforeEach(() => { mockIsPlus.value = false; });

  it('renders the dialog when open', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());
  });

  it('shows "Plus feature" heading for Free users', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText(/plus feature/i)).toBeDefined());
  });

  it('shows upgrade CTA copy mentioning MCP', async () => {
    renderModal();
    await waitFor(() =>
      expect(screen.getByText(/mcp integration/i)).toBeDefined(),
    );
  });

  it('shows an "Upgrade to Plus" button', async () => {
    renderModal();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /upgrade to plus/i })).toBeDefined(),
    );
  });

  it('does NOT render the API keys manager for a Free user', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());
    expect(screen.queryByText(/mcp api keys/i)).toBeNull();
  });

  it('does not call listApiKeys when user is Free', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());
    expect(listApiKeys).not.toHaveBeenCalled();
  });

  it('calls startCheckout with the yearly price ID when Upgrade is clicked', async () => {
    renderModal();
    const btn = await screen.findByRole('button', { name: /upgrade to plus/i });
    await userEvent.click(btn);
    expect(startCheckout).toHaveBeenCalledWith('price_yearly_test');
  });
});

// ---------------------------------------------------------------------------
// M5 — Plus user sees ApiKeysManager
// ---------------------------------------------------------------------------

describe('McpSettingsModal — Plus user', () => {
  beforeEach(() => { mockIsPlus.value = true; });

  it('renders the MCP settings title', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText(/mcp settings/i)).toBeDefined());
  });

  it('renders API keys section for Plus users', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText(/mcp api keys/i)).toBeDefined());
  });

  it('does NOT show the Plus-gate lock for Plus users', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());
    expect(screen.queryByText(/plus feature/i)).toBeNull();
  });

  it('does NOT show Upgrade to Plus button for Plus users', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());
    expect(screen.queryByRole('button', { name: /upgrade to plus/i })).toBeNull();
  });

  it('does not load keys when userId is null', async () => {
    renderModal(null);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());
    expect(listApiKeys).not.toHaveBeenCalled();
  });
});
