'use client';

import type { ReactNode } from 'react';
import { FirstLoginFlow } from '@/components/onboarding/FirstLoginFlow';
import { useFirstLoginOnboarding } from '@/lib/use-first-login-onboarding';

export function OnboardingGate({ children }: { children: ReactNode }) {
  const onboarding = useFirstLoginOnboarding();

  if (!onboarding.isActive) {
    return <>{children}</>;
  }

  return (
    <>
      <FirstLoginFlow
        step={onboarding.step}
        error={onboarding.error}
        presets={onboarding.presets}
        importOpen={onboarding.importOpen}
        db={onboarding.db}
        retrySync={onboarding.retrySync}
        continueOffline={onboarding.continueOffline}
        waitForOnline={onboarding.waitForOnline}
        chooseImport={onboarding.chooseImport}
        onImportOpenChange={onboarding.onImportOpenChange}
        choosePreset={onboarding.choosePreset}
        skipAll={onboarding.skipAll}
      />
      {children}
    </>
  );
}
