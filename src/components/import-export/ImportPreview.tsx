"use client";

import type { ImportPreview } from "@/lib/import-export/types";

type ImportPreviewProps = {
  preview: ImportPreview;
};

export function ImportPreviewComponent({ preview }: ImportPreviewProps) {
  const { file, counts, stats } = preview;
  
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3 text-sm">
        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
          <span>Schema Version:</span>
          <span className="text-right">{file.schemaVersion}</span>
          <span>Exported At:</span>
          <span className="text-right">{new Date(file.exportedAt).toLocaleString()}</span>
          <span>App Version:</span>
          <span className="text-right">{file.appVersion}</span>
        </div>
      </div>
      
      <div className="rounded-lg border p-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1 text-muted-foreground">Collection</th>
              <th className="text-right py-1 text-muted-foreground">Import</th>
              <th className="text-right py-1 text-muted-foreground">Local</th>
            </tr>
          </thead>
          <tbody>
            <PreviewRow label="Boards" importCount={counts.import.boards} localCount={counts.local.boards} />
            <PreviewRow label="Swimlanes" importCount={counts.import.swimlanes} localCount={counts.local.swimlanes} />
            <PreviewRow label="Tasks" importCount={counts.import.tasks} localCount={counts.local.tasks} />
            <PreviewRow label="Habits" importCount={counts.import.habits} localCount={counts.local.habits} />
            <PreviewRow label="Habit Logs" importCount={counts.import.habitLogs} localCount={counts.local.habitLogs} />
            <PreviewRow label="Notes" importCount={counts.import.notes} localCount={counts.local.notes} />
            <PreviewRow label="Bookmarks" importCount={counts.import.bookmarks} localCount={counts.local.bookmarks} />
            <PreviewRow label="Vision Items" importCount={counts.import.visionItems} localCount={counts.local.visionItems} />
            <PreviewRow label="Mindmaps" importCount={counts.import.mindmaps} localCount={counts.local.mindmaps} />
            <PreviewRow label="Backlog Items" importCount={counts.import.backlogs} localCount={counts.local.backlogs} />
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-center gap-4 text-sm">
        <span className="text-green-600">New: {stats.new}</span>
        <span className="text-amber-600">Conflicts: {stats.conflicts}</span>
      </div>
    </div>
  );
}

function PreviewRow({ label, importCount, localCount }: { label: string; importCount: number; localCount: number }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-1.5 text-muted-foreground">{label}</td>
      <td className="text-right py-1.5">{importCount}</td>
      <td className="text-right py-1.5">{localCount}</td>
    </tr>
  );
}
