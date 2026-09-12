import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('@/lib/auth', () => ({
  updatePassword: vi.fn().mockResolvedValue(undefined),
  updateEmail: vi.fn().mockResolvedValue(undefined),
  uploadAvatar: vi.fn().mockResolvedValue('https://example.com/avatar.png'),
  getLinkedIdentities: vi.fn().mockResolvedValue([]),
  linkGoogleAccount: vi.fn().mockResolvedValue(undefined),
  unlinkGoogleAccount: vi.fn().mockResolvedValue(undefined),
}));

import { AccountSettingsModal } from '../AccountSettingsModal';
import {
  updatePassword,
  updateEmail,
  uploadAvatar,
  getLinkedIdentities,
  unlinkGoogleAccount,
} from '@/lib/auth';

const mockUser = { id: 'user-1', email: 'test@example.com', avatarUrl: undefined };

function renderModal(props?: Partial<React.ComponentProps<typeof AccountSettingsModal>>) {
  return render(
    <AccountSettingsModal
      open={true}
      onOpenChange={vi.fn()}
      user={mockUser}
      {...props}
    />
  );
}

beforeEach(() => {
  vi.mocked(getLinkedIdentities).mockResolvedValue([]);
  vi.mocked(updatePassword).mockResolvedValue(undefined);
  vi.mocked(updateEmail).mockResolvedValue(undefined);
  vi.mocked(uploadAvatar).mockResolvedValue('https://example.com/avatar.png');
  vi.mocked(unlinkGoogleAccount).mockResolvedValue(undefined);
});

describe('AccountSettingsModal — rendering', () => {
  it('renders the dialog when open is true', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());
  });

  it('does not render when open is false', () => {
    render(
      <AccountSettingsModal
        open={false}
        onOpenChange={vi.fn()}
        user={mockUser}
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('displays current user email', async () => {
    renderModal({ initialTab: 'account' });
    await waitFor(() => {
      expect(screen.getByText(/current:.*test@example\.com/i)).toBeDefined();
    });
  });

  it('loads linked identities on open', async () => {
    renderModal();
    await waitFor(() => expect(getLinkedIdentities).toHaveBeenCalledOnce());
  });

  it('does not render MCP settings content inside account settings', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());
    expect(screen.queryByText(/mcp api keys/i)).toBeNull();
  });
});

describe('AccountSettingsModal — Google account section', () => {
  it('shows Connect Google button when no Google identity linked', async () => {
    vi.mocked(getLinkedIdentities).mockResolvedValue([]);
    renderModal({ initialTab: 'connected' });
    await waitFor(() => {
      expect(screen.getByText(/^connect$/i)).toBeDefined();
    });
  });

  it('shows Disconnect button when Google identity is linked', async () => {
    vi.mocked(getLinkedIdentities).mockResolvedValue([
      { provider: 'google', identityId: 'gid-1', email: 'test@gmail.com' },
    ]);
    renderModal({ initialTab: 'connected' });
    await waitFor(() => {
      expect(screen.getByText(/disconnect/i)).toBeDefined();
    });
  });

  it('calls unlinkGoogleAccount when disconnect is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(getLinkedIdentities).mockResolvedValue([
      { provider: 'google', identityId: 'gid-1', email: 'test@gmail.com' },
    ]);
    renderModal({ initialTab: 'connected' });

    const disconnectBtn = await screen.findByText(/disconnect/i);
    await user.click(disconnectBtn);
    await waitFor(() => expect(unlinkGoogleAccount).toHaveBeenCalledWith('gid-1'));
  });

  it('shows success message after unlinking Google', async () => {
    const user = userEvent.setup();
    vi.mocked(getLinkedIdentities).mockResolvedValue([
      { provider: 'google', identityId: 'gid-1', email: 'test@gmail.com' },
    ]);
    renderModal({ initialTab: 'connected' });

    const disconnectBtn = await screen.findByText(/disconnect/i);
    await user.click(disconnectBtn);
    await waitFor(() => {
      expect(screen.getByText(/unlinked/i)).toBeDefined();
    });
  });

  it('shows error message when unlinkGoogleAccount fails', async () => {
    const user = userEvent.setup();
    vi.mocked(getLinkedIdentities).mockResolvedValue([
      { provider: 'google', identityId: 'gid-1', email: 'test@gmail.com' },
    ]);
    vi.mocked(unlinkGoogleAccount).mockRejectedValueOnce(new Error('Unlink failed'));
    renderModal({ initialTab: 'connected' });

    const disconnectBtn = await screen.findByText(/disconnect/i);
    await user.click(disconnectBtn);
    await waitFor(() => {
      expect(screen.getByText(/unlink failed/i)).toBeDefined();
    });
  });
});

describe('AccountSettingsModal — password change', () => {
  it('shows password validation error when password is too short', async () => {
    const user = userEvent.setup();
    renderModal({ initialTab: 'account' });

    await waitFor(() => screen.getByRole('dialog'));

    const passwordInput = screen.getByPlaceholderText(/min\.\s*8 characters/i);
    const confirmInput = screen.getByPlaceholderText(/repeat new password/i);
    await user.type(passwordInput, 'short');
    await user.type(confirmInput, 'short');

    const form = passwordInput.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeDefined();
    });
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    renderModal({ initialTab: 'account' });

    await waitFor(() => screen.getByRole('dialog'));

    const passwordInput = screen.getByPlaceholderText(/min\.\s*8 characters/i);
    const confirmInput = screen.getByPlaceholderText(/repeat new password/i);
    await user.type(passwordInput, 'password123');
    await user.type(confirmInput, 'different456');

    const form = passwordInput.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeDefined();
    });
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('calls updatePassword with valid matching passwords', async () => {
    const user = userEvent.setup();
    renderModal({ initialTab: 'account' });

    await waitFor(() => screen.getByRole('dialog'));

    const passwordInput = screen.getByPlaceholderText(/min\.\s*8 characters/i);
    const confirmInput = screen.getByPlaceholderText(/repeat new password/i);
    await user.type(passwordInput, 'newpassword123');
    await user.type(confirmInput, 'newpassword123');

    const form = passwordInput.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('newpassword123'));
  });

  it('shows success message after password update', async () => {
    const user = userEvent.setup();
    renderModal({ initialTab: 'account' });

    await waitFor(() => screen.getByRole('dialog'));

    const passwordInput = screen.getByPlaceholderText(/min\.\s*8 characters/i);
    const confirmInput = screen.getByPlaceholderText(/repeat new password/i);
    await user.type(passwordInput, 'newpassword123');
    await user.type(confirmInput, 'newpassword123');

    const form = passwordInput.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/password updated/i)).toBeDefined();
    });
  });
});

describe('AccountSettingsModal — email change', () => {
  it('calls updateEmail when email form is submitted', async () => {
    const user = userEvent.setup();
    renderModal({ initialTab: 'account' });

    await waitFor(() => screen.getByRole('dialog'));

    const emailInput = screen.getByPlaceholderText(/you@example\.com/i);
    await user.type(emailInput, 'new@example.com');

    const form = emailInput.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => expect(updateEmail).toHaveBeenCalledWith('new@example.com'));
  });

  it('shows confirmation message after email change', async () => {
    const user = userEvent.setup();
    renderModal({ initialTab: 'account' });

    await waitFor(() => screen.getByRole('dialog'));

    const emailInput = screen.getByPlaceholderText(/you@example\.com/i);
    await user.type(emailInput, 'new@example.com');

    const form = emailInput.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/confirmation sent/i)).toBeDefined();
    });
  });
});

describe('AccountSettingsModal — avatar upload', () => {
  it('rejects non-image files', async () => {
    renderModal();
    await waitFor(() => screen.getByRole('dialog'));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const pdfFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    await waitFor(() => {
      expect(screen.getByText(/select an image file/i)).toBeDefined();
    });
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it('rejects files larger than 2 MB', async () => {
    renderModal();
    await waitFor(() => screen.getByRole('dialog'));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    // Create a mock large file (> 2MB)
    const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/smaller than 2 mb/i)).toBeDefined();
    });
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it('accepts valid image files and shows upload button', async () => {
    renderModal();
    await waitFor(() => screen.getByRole('dialog'));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['imgdata'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      // Upload button should appear after file selection
      expect(screen.getByText(/upload/i)).toBeDefined();
    });
  });
});
