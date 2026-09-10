import type { SyncStatus } from "@/stores/sync-store";

export function getSyncSummary(
  status: SyncStatus,
  lastSyncedAt: Date | null,
  errorMessage: string | null,
) {
  switch (status) {
    case "pending":
      return "Unsaved changes";
    case "syncing":
      return "Syncing...";
    case "synced":
      return "Synced";
    case "error":
      return errorMessage ?? "Sync failed";
    case "offline":
      return "Offline";
    case "idle":
    default:
      return lastSyncedAt
        ? `Saved · ${lastSyncedAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : "Saved";
  }
}
