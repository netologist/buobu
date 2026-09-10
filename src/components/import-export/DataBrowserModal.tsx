"use client";

import { useState, useEffect } from "react";
import { Database as DatabaseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Database } from "@/lib/rxdb";
import { createExportFile } from "@/lib/import-export/exporter";
import type { ExportFileData } from "@/lib/import-export/types";
import { DataBrowser } from "./DataBrowser";

type DataBrowserModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  db: Database | null;
};

export function DataBrowserModal({ open, onOpenChange, db }: DataBrowserModalProps) {
  const [data, setData] = useState<ExportFileData | null>(null);
  const [exportedAt, setExportedAt] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !db || data) return;

    createExportFile(db)
      .then((file) => {
        setData(file.data);
        setExportedAt(file.exportedAt);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load data");
      });
  }, [open, db, data]);

  const isLoading = open && !!db && data === null && error === null;

  // Reset when closed
  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setData(null);
      setExportedAt(undefined);
      setError(null);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <DatabaseIcon className="size-4" />
            Browse Data
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden" style={{ height: "75vh" }}>
          {isLoading && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading data...
            </div>
          )}
          {error && (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setData(null);
                  setExportedAt(undefined);
                  setError(null);
                }}
              >
                Retry
              </Button>
            </div>
          )}
          {data && !isLoading && (
            <DataBrowser data={data} exportedAt={exportedAt} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
