"use client";

import { useState, useEffect } from "react";
import { Download, Loader2, Database as DatabaseIcon, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Database } from "@/lib/rxdb";
import { exportToFile, getDocCounts } from "@/lib/import-export/exporter";
import { exportToZip } from "@/lib/import-export/zip-exporter";
import { DataBrowserModal } from "./DataBrowserModal";

type ExportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  db: Database | null;
};

type ExportingState = "idle" | "json" | "zip";

export function ExportModal({ open, onOpenChange, db }: ExportModalProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [exporting, setExporting] = useState<ExportingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(true);

  useEffect(() => {
    if (open && db) {
      setError(null);
      getDocCounts(db)
        .then(setCounts)
        .catch((err) => {
          setCounts({});
          setError(err instanceof Error ? err.message : "Failed to load export counts");
        });
    }
  }, [open, db]);

  const handleExportJson = async () => {
    if (!db) return;
    setExporting("json");
    setError(null);
    try {
      await exportToFile(db, includeArchived);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting("idle");
    }
  };

  const handleExportZip = async () => {
    if (!db) return;
    setExporting("zip");
    setError(null);
    try {
      await exportToZip(db, includeArchived);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting("idle");
    }
  };

  const totalDocs = Object.values(counts).reduce((a, b) => a + b, 0);
  const isExporting = exporting !== "idle";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Export Data</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Export your data for backup or migration, or browse it inline before downloading.
            </p>

            <div className="rounded-lg border p-3 space-y-1 text-sm">
              <CountRow label="Boards" count={counts.boards || 0} />
              <CountRow label="Swimlanes" count={counts.swimlanes || 0} />
              <CountRow label="Tasks" count={counts.tasks || 0} />
              <CountRow label="Habits" count={counts.habits || 0} />
              <CountRow label="Habit Logs" count={counts.habitLogs || 0} />
              <CountRow label="Notes" count={counts.notes || 0} />
              <CountRow label="Bookmarks" count={counts.bookmarks || 0} />
              <CountRow label="Vision Items" count={counts.visionItems || 0} />
              <CountRow label="Mindmaps" count={counts.mindmaps || 0} />
              <CountRow label="Backlog Items" count={counts.backlogs || 0} />
              <CountRow label="Time Blocks" count={counts.timeblocks || 0} />
              <div className="border-t pt-1 mt-2 font-medium">
                <CountRow label="Total" count={totalDocs} />
              </div>
            </div>

            {/* Export format options */}
            <div className="grid grid-cols-1 gap-2">
              <ExportOption
                icon={<DatabaseIcon className="size-4 shrink-0" />}
                title="Browse Data"
                description="Explore your data in an interactive viewer"
                onClick={() => setBrowserOpen(true)}
                disabled={!db || totalDocs === 0}
              />
              <ExportOption
                icon={<Download className="size-4 shrink-0" />}
                title="Export JSON"
                description="Download raw JSON — importable back into buobu"
                onClick={handleExportJson}
                disabled={isExporting || !db || totalDocs === 0}
                loading={exporting === "json"}
                loadingLabel="Exporting…"
              />
              <ExportOption
                icon={<Archive className="size-4 shrink-0" />}
                title="Export with Viewer (ZIP)"
                description="Download a ZIP containing data.json + a standalone HTML viewer"
                onClick={handleExportZip}
                disabled={isExporting || !db || totalDocs === 0}
                loading={exporting === "zip"}
                loadingLabel="Building ZIP…"
              />
            </div>

            <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <Switch
                id="export-include-archived"
                checked={includeArchived}
                onCheckedChange={setIncludeArchived}
                className="data-[state=checked]:bg-amber-500"
              />
              <Label htmlFor="export-include-archived" className="cursor-pointer flex items-center gap-1.5 text-sm">
                <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                Include archived items
              </Label>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DataBrowserModal
        open={browserOpen}
        onOpenChange={setBrowserOpen}
        db={db}
      />
    </>
  );
}

function ExportOption({
  icon,
  title,
  description,
  onClick,
  disabled,
  loading,
  loadingLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <span className="text-muted-foreground">{icon}</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">
          {loading && loadingLabel ? loadingLabel : title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  );
}

function CountRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span>{count}</span>
    </div>
  );
}
