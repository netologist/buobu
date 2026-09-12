"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { DailyBriefingProvider } from "@/components/routines/DailyBriefingProvider";
import { ErrorBoundary } from "@/components/ui/error-boundary";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <OnboardingGate>
            <DailyBriefingProvider>{children}</DailyBriefingProvider>
          </OnboardingGate>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
