'use client';

import { Loader2, WifiOff, Database, Download, SkipForward, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ImportModal } from '@/components/import-export/ImportModal';
import { FirstLoginFlowStepInfo } from '@/components/onboarding/FirstLoginFlowStepInfo';
import type { Database as RxDatabase } from '@/lib/rxdb';
import type { OnboardingStep } from '@/lib/onboarding-state';

type Preset = {
  id: string;
  label: string;
  description: string;
};

type FirstLoginFlowProps = {
  step: OnboardingStep;
  error: string | null;
  presets: Preset[];
  importOpen: boolean;
  db: RxDatabase | null;
  retrySync: () => void;
  continueOffline: () => void;
  waitForOnline: () => void;
  chooseImport: () => void;
  onImportOpenChange: (open: boolean) => void;
  choosePreset: (presetId: string) => void;
  skipAll: () => void;
};

export function FirstLoginFlow(props: FirstLoginFlowProps) {
  const {
    step,
    error,
    presets,
    importOpen,
    db,
    retrySync,
    continueOffline,
    waitForOnline,
    chooseImport,
    onImportOpenChange,
    choosePreset,
    skipAll,
  } = props;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/95 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          {(step === 'preparing-db' || step === 'initial-sync') && (
            <FirstLoginFlowStepInfo
              title="Preparing Your Workspace"
              description="We are setting up local database and syncing your existing data."
            />
          )}
          {step === 'offline-choice' && (
            <FirstLoginFlowStepInfo
              title="You Are Offline"
              description="Choose whether to wait for internet or continue with offline setup."
            />
          )}
          {(step === 'fallback-options' || step === 'import' || step === 'preset-select' || step === 'seeding-default') && (
            <FirstLoginFlowStepInfo
              title="No Existing Data Found"
              description="You can import data, start from a preset, or continue with an automatic default setup."
            />
          )}
          {step === 'error' && (
            <FirstLoginFlowStepInfo
              title="Setup Needs Attention"
              description="We hit an issue while preparing your workspace."
            />
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {(step === 'preparing-db' || step === 'initial-sync') && (
            <div className="rounded-lg border p-4 flex items-start gap-3">
              <Loader2 className="h-5 w-5 animate-spin mt-0.5" />
              <div>
                <p className="font-medium">Sync in progress</p>
                <p className="text-sm text-muted-foreground">This may take a little longer on first login.</p>
              </div>
            </div>
          )}

          {step === 'offline-choice' && (
            <div className="space-y-3">
              <div className="rounded-lg border p-4 flex items-start gap-3">
                <WifiOff className="h-5 w-5 mt-0.5 text-amber-500" />
                <p className="text-sm text-muted-foreground">
                  We cannot run initial cloud sync right now. You can wait until online or continue offline.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={waitForOnline} className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Wait For Connection
                </Button>
                <Button variant="outline" onClick={continueOffline} className="flex-1">
                  Continue Offline
                </Button>
              </div>
            </div>
          )}

          {step === 'fallback-options' && (
            <div className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                <Button variant="outline" className="h-auto justify-start py-3" onClick={chooseImport}>
                  <Download className="mr-2 h-4 w-4" />
                  Import
                </Button>
                <Button variant="outline" className="h-auto justify-start py-3" onClick={skipAll}>
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip & Auto Setup
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Preset Options
                </p>
                <div className="grid gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      className="rounded-lg border p-3 text-left hover:bg-muted/60 transition-colors"
                      onClick={() => choosePreset(preset.id)}
                    >
                      <p className="font-medium">{preset.label}</p>
                      <p className="text-xs text-muted-foreground">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'preset-select' && (
            <div className="rounded-lg border p-4 flex items-start gap-3">
              <Loader2 className="h-5 w-5 animate-spin mt-0.5" />
              <div>
                <p className="font-medium">Applying preset</p>
                <p className="text-sm text-muted-foreground">Creating your initial workspace structure.</p>
              </div>
            </div>
          )}

          {step === 'seeding-default' && (
            <div className="rounded-lg border p-4 flex items-start gap-3">
              <Loader2 className="h-5 w-5 animate-spin mt-0.5" />
              <div>
                <p className="font-medium">Creating default workspace</p>
                <p className="text-sm text-muted-foreground">Setting up a starter board and swimlane.</p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5 text-destructive" />
                <p className="text-sm">{error ?? 'Unexpected setup error'}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={retrySync} className="flex-1">Retry Sync</Button>
                <Button variant="outline" onClick={continueOffline} className="flex-1">Continue Offline</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ImportModal
        open={importOpen}
        onOpenChange={(open) => {
          void onImportOpenChange(open);
        }}
        db={db}
        forcedMode="append"
      />
    </div>
  );
}
