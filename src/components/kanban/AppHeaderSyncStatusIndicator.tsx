import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  CloudOff,
  HardDrive,
  LoaderCircle,
  Lock,
  PauseCircle,
  PlayCircle,
} from "lucide-react";

import { useAuthContext } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSyncSummary } from "@/lib/formatters/syncFormatter";
import { BILLING_ENABLED, LOCAL_MODE } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";
import {
  getSyncStatus as getReplicationSyncStatus,
  pauseSupabaseReplication,
  resumeSupabaseReplication,
  subscribeSyncStatus,
} from "@/lib/supabase-replication";
import type { SyncStatus } from "@/stores/sync-store";
import { useSyncStore } from "@/stores/sync-store";
import { useEntitlements } from "@/stores/entitlements-store";

const SYNC_COLORS: Record<SyncStatus, string> = {
  idle: "#9CA3AF",
  pending: "#F59E0B",
  syncing: "#3B82F6",
  synced: "#10B981",
  error: "#EF4444",
  offline: "#6B7280",
};

type AppHeaderSyncStatusIndicatorProps = {
  /** Opens the header's Export Data modal — the only way to keep a copy in Local Mode. */
  onExportRequest: () => void;
};

export function AppHeaderSyncStatusIndicator({ onExportRequest }: AppHeaderSyncStatusIndicatorProps) {
  const status = useSyncStore((state) => state.status);
  const hasPendingChanges = useSyncStore((state) => state.hasPendingChanges);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const errorMessage = useSyncStore((state) => state.errorMessage);
  const retry = useSyncStore((state) => state.retry);
  const { user } = useAuthContext();
  const { isPlus } = useEntitlements();
  const isSyncLocked = BILLING_ENABLED && !isPlus;
  const [isReplicationPaused, setIsReplicationPaused] = useState(
    () => (user?.id ? getReplicationSyncStatus(user.id).status === "paused" : false),
  );
  const [isIdleDetailsVisible, setIsIdleDetailsVisible] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    return subscribeSyncStatus(user.id, (syncState) => {
      setIsReplicationPaused(syncState.status === "paused");
    });
  }, [user?.id]);

  const handlePauseResume = () => {
    if (!user?.id) return;

    if (isReplicationPaused) {
      resumeSupabaseReplication(user.id);
      if (hasPendingChanges) {
        retry();
      }
      return;
    }

    pauseSupabaseReplication(user.id);
  };

  const baseIconClass = "h-4 w-4 shrink-0 transition-transform duration-200";
  const textClass =
    "text-xs font-medium transition-all duration-200 data-[status=synced]:opacity-100";
  const isIdle = status === "idle";
  const showIdleDetails = !isIdle || isIdleDetailsVisible;

  // Local Mode has no sync to report on, so say the true thing instead. Clicking
  // opens Export, because keeping a copy is the user's own job here.
  if (LOCAL_MODE) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onExportRequest}
              className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/95 px-2.5 py-1 shadow-xs transition-colors hover:bg-muted"
            >
              <HardDrive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Local only</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-medium">Your data lives only in this browser</p>
            <p className="mt-0.5 text-muted-foreground">
              It is not backed up anywhere. Click to export a copy.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isSyncLocked) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex cursor-default items-center gap-1.5 rounded-full border border-border/60 bg-background/95 px-2.5 py-1 opacity-50 shadow-xs"
              aria-disabled="true"
            >
              <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Sync</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-medium">Cloud sync is a Plus feature</p>
            <p className="mt-0.5 text-muted-foreground">Upgrade to Plus to sync across all your devices.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center rounded-full border border-border/60 bg-background/95 shadow-xs transition-all duration-200",
        showIdleDetails ? "gap-1 py-0.5 pl-2.5 pr-0.5" : "gap-0 p-0.5",
      )}
      title={getSyncSummary(status, lastSyncedAt, errorMessage)}
      onMouseEnter={() => setIsIdleDetailsVisible(true)}
      onMouseLeave={() => setIsIdleDetailsVisible(false)}
    >
      <div
        key={status}
        data-status={status}
        className={cn(
          "flex min-w-0 items-center gap-2 overflow-hidden transition-all duration-200 ease-out data-[status=synced]:opacity-100",
          showIdleDetails ? "max-w-40 opacity-100" : "max-w-0 opacity-0",
        )}
      >
        {status === "idle" && (
          <>
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: SYNC_COLORS.idle }}
            />
            <span className={cn(textClass, "text-muted-foreground")}>Saved</span>
          </>
        )}

        {status === "pending" && (
          <>
            <span
              className="h-2.5 w-2.5 animate-pulse rounded-full"
              style={{ backgroundColor: SYNC_COLORS.pending }}
            />
            <span className={textClass} style={{ color: SYNC_COLORS.pending }}>
              Unsaved changes
            </span>
          </>
        )}

        {status === "syncing" && (
          <>
            <LoaderCircle
              className={cn(baseIconClass, "animate-spin")}
              style={{ color: SYNC_COLORS.syncing }}
            />
            <span className={textClass} style={{ color: SYNC_COLORS.syncing }}>
              Syncing...
            </span>
          </>
        )}

        {status === "synced" && (
          <>
            <CheckCircle2 className={baseIconClass} style={{ color: SYNC_COLORS.synced }} />
            <span className={textClass} style={{ color: SYNC_COLORS.synced }}>
              Synced
            </span>
          </>
        )}

        {status === "error" && (
          <>
            <CircleAlert className={baseIconClass} style={{ color: SYNC_COLORS.error }} />
            <span className={textClass} style={{ color: SYNC_COLORS.error }}>
              Sync failed
            </span>
            <Button
              variant="ghost"
              size="xs"
              className="h-6 rounded-full px-2"
              onClick={retry}
            >
              Retry
            </Button>
          </>
        )}

        {status === "offline" && (
          <>
            <CloudOff className={baseIconClass} style={{ color: SYNC_COLORS.offline }} />
            <span className={textClass} style={{ color: SYNC_COLORS.offline }}>
              Offline
            </span>
          </>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        className="h-7 w-7 shrink-0 rounded-full"
        title={isReplicationPaused ? "Resume sync" : "Pause sync"}
        onClick={handlePauseResume}
      >
        {isReplicationPaused ? (
          <PlayCircle className="h-4 w-4 text-muted-foreground" />
        ) : (
          <PauseCircle className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}
