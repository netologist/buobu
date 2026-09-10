/**
 * Custom render wrapper for integration tests.
 *
 * Wraps the component under test in all application-level providers
 * so tests run in a realistic environment without needing to set up
 * providers manually in every test file.
 *
 * Usage:
 *   import { renderWithProviders } from '@/test/helpers/render'
 *   const { getByText } = renderWithProviders(<MyComponent />)
 */

import React from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';

// Minimal auth context stub — avoids real Supabase calls during renders.
// Tests that exercise auth behaviour should set up the auth store directly.
function TestAuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <JotaiProvider>
      <TestAuthProvider>
        {children}
      </TestAuthProvider>
    </JotaiProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from RTL so tests only need one import
export * from '@testing-library/react';
export { renderWithProviders as render };
