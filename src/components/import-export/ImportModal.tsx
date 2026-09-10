"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, AlertCircle, CheckCircle2, FileJson, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Database } from "@/lib/rxdb";
import { parseExportFile, generateImportPreview, executeImport } from "@/lib/import-export/importer";
import type { ExportFile, ImportMode, ImportPreview, ImportProgress, ValidationError } from "@/lib/import-export/types";
import { ImportPreviewComponent } from "./ImportPreview";

type ImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  db: Database | null;
  forcedMode?: ImportMode;
};

type ImportState = 
  | { phase: 'select' }
  | { phase: 'validating' }
  | { phase: 'preview'; importFile: ExportFile; preview: ImportPreview }
  | { phase: 'importing'; progress: ImportProgress }
  | { phase: 'done'; mode: ImportMode; stats: { added: number; updated: number; unchanged: number } }
  | { phase: 'error'; error: string };

function filterExportFileArchived(importFile: ExportFile): ExportFile {
  const f = <T extends { archived?: boolean }>(arr: T[]): T[] => arr.filter((d) => !d.archived);
  const filteredBoards = f(importFile.data.boards);
  const filteredSwimlanes = f(importFile.data.swimlanes);
  const boardIds = new Set(filteredBoards.map((b) => b.id));
  const swimlaneIds = new Set(filteredSwimlanes.map((s) => s.id));
  const filteredHabits = f(importFile.data.habits).filter((h) => boardIds.has(h.boardId) && swimlaneIds.has(h.swimlaneId));
  const habitIds = new Set(filteredHabits.map((h) => h.id));
  const data = {
    ...importFile.data,
    boards: filteredBoards,
    swimlanes: filteredSwimlanes.filter((s) => boardIds.has(s.boardId ?? '')),
    tasks: f(importFile.data.tasks).filter((t) => boardIds.has(t.boardId) && swimlaneIds.has(t.swimlaneId)),
    habits: filteredHabits,
    habitLogs: importFile.data.habitLogs.filter((l) => habitIds.has(l.habitId)),
    notes: f(importFile.data.notes).filter((n) => boardIds.has(n.boardId) && swimlaneIds.has(n.swimlaneId)),
    bookmarks: f(importFile.data.bookmarks).filter((b) => boardIds.has(b.boardId) && swimlaneIds.has(b.swimlaneId)),
    visionItems: f(importFile.data.visionItems).filter((i) => boardIds.has(i.boardId) && swimlaneIds.has(i.swimlaneId)),
    mindmaps: f(importFile.data.mindmaps).filter((m) => boardIds.has(m.boardId) && swimlaneIds.has(m.swimlaneId)),
    backlogs: f(importFile.data.backlogs),
  };
  return { ...importFile, data };
}

export function ImportModal({ open, onOpenChange, db, forcedMode }: ImportModalProps) {
  const [state, setState] = useState<ImportState>({ phase: 'select' });
  const [importMode, setImportMode] = useState<ImportMode>(forcedMode ?? 'merge');
  const [includeArchived, setIncludeArchived] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !db) return;
    
    setState({ phase: 'validating' });
    
    const result = await parseExportFile(selectedFile);
    
    if (result.error) {
      setState({ phase: 'error', error: formatError(result.error) });
      return;
    }
    
    if (!result.data) {
      setState({ phase: 'error', error: 'Failed to parse file' });
      return;
    }
    
    const importFile = includeArchived ? result.data : filterExportFileArchived(result.data);
    const preview = await generateImportPreview(db, importFile);
    setState({ phase: 'preview', importFile, preview });
  };

  const handleImport = async () => {
    if (state.phase !== 'preview' || !db) return;
    const effectiveMode = forcedMode ?? importMode;
    
    setState({ phase: 'importing', progress: { phase: 'importing', current: 0, total: 0, message: 'Starting...' } });
    
    const result = await executeImport(db, state.importFile, effectiveMode, (progress) => {
      setState(prev => prev.phase === 'importing' ? { ...prev, progress } : prev);
    });
    
    if (result.success) {
      setState({ phase: 'done', mode: effectiveMode, stats: result.stats });
    } else {
      setState({ phase: 'error', error: result.error || 'Import failed' });
    }
  };

  const handleClose = () => {
    setState({ phase: 'select' });
    setImportMode(forcedMode ?? 'merge');
    setIncludeArchived(false);
    onOpenChange(false);
  };

  const renderContent = () => {
    switch (state.phase) {
      case 'select':
        return (
          <div className="py-6 space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <FileJson className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">Click to select a file</p>
              <p className="text-xs text-muted-foreground">or drag and drop</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <Switch
                id="import-include-archived"
                checked={includeArchived}
                onCheckedChange={setIncludeArchived}
                className="data-[state=checked]:bg-amber-500"
              />
              <Label htmlFor="import-include-archived" className="cursor-pointer flex items-center gap-1.5 text-sm">
                <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                Include archived items
              </Label>
            </div>
          </div>
        );
        
      case 'validating':
        return (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Validating file...</p>
          </div>
        );
        
      case 'preview':
        return (
          <div className="py-4 space-y-4">
            <ImportPreviewComponent preview={state.preview} />
            
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Import Mode:</h4>
              {forcedMode ? (
                <div className="rounded-lg border p-3">
                  <span className="font-medium">Append (generate new IDs)</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Onboarding import always creates fresh records with new IDs.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${importMode === 'merge' ? 'border-primary bg-primary/5' : ''}`}>
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium">Merge (Recommended)</span>
                      <p className="text-xs text-muted-foreground">Combines local and imported data, keeps newer versions on conflicts</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${importMode === 'replace' ? 'border-primary bg-primary/5' : ''}`}>
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium">Replace all local data</span>
                      <p className="text-xs text-muted-foreground">Clears all local data and imports the file (for new device setup)</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${importMode === 'append' ? 'border-primary bg-primary/5' : ''}`}>
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium">Append (generate new IDs)</span>
                      <p className="text-xs text-muted-foreground">Adds all imported items as fresh records with new unique IDs</p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'importing':
        const percent = state.progress.total > 0 
          ? Math.round((state.progress.current / state.progress.total) * 100) 
          : 0;
        return (
          <div className="py-6">
            <p className="text-sm mb-3">{state.progress.message}</p>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {state.progress.current} / {state.progress.total}
            </p>
          </div>
        );
        
      case 'done':
        return (
          <div className="py-6">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-center mb-4">Import Complete!</h3>
            
            <div className="rounded-lg border p-3 space-y-1 text-sm">
              <CountRow label="Added" count={state.stats.added} />
              <CountRow label="Updated" count={state.stats.updated} />
              <CountRow label="Unchanged" count={state.stats.unchanged} />
            </div>
          </div>
        );
        
      case 'error':
        return (
          <div className="py-6">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-medium text-center mb-2">Import Failed</h3>
            <p className="text-sm text-muted-foreground text-center">{state.error}</p>
          </div>
        );
    }
  };

  const renderFooter = () => {
    switch (state.phase) {
      case 'select':
        return (
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        );
      case 'preview':
        return (
          <>
            <Button variant="outline" onClick={() => { setState({ phase: 'select' }); }}>
              Back
            </Button>
            <Button onClick={handleImport} disabled={!db}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          </>
        );
      case 'done':
      case 'error':
        return (
          <Button onClick={handleClose}>
            Done
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {state.phase === 'importing' ? 'Importing...' : 
             state.phase === 'done' ? 'Import Complete' :
             'Import Data'}
          </DialogTitle>
        </DialogHeader>
        
        {renderContent()}
        
        <DialogFooter>
          {renderFooter()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CountRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{count}</span>
    </div>
  );
}

function formatError(error: ValidationError): string {
  switch (error.code) {
    case 'invalid_json':
      return 'Invalid file format. Please select a valid JSON file.';
    case 'invalid_structure':
      return 'Invalid export file structure. This file may be corrupted.';
    case 'checksum_mismatch':
      return 'File checksum mismatch. The file may be corrupted or modified.';
    case 'file_too_large':
      return 'File is too large. Maximum size is 50MB.';
    case 'unsupported_version':
      return error.message;
    case 'missing_fields':
      return `Missing required fields: ${error.details}`;
    default:
      return error.message;
  }
}
