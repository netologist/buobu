"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { Note, NoteMetadataField, NoteMetadataType } from "@/lib/types";

type NoteMetadataPanelProps = {
  note: Note;
  pinned: boolean;
  references: string[];
  metadata: NoteMetadataField[];
  swimlaneName?: string;
  onPinnedChange: (val: boolean) => void;
  onReferencesChange: (refs: string[]) => void;
  onMetadataChange: (fields: NoteMetadataField[]) => void;
};

export default function NoteMetadataPanel({
  note,
  pinned,
  references,
  metadata,
  swimlaneName,
  onPinnedChange,
  onReferencesChange,
  onMetadataChange,
}: NoteMetadataPanelProps) {
  const copyId = () => {
    navigator.clipboard.writeText(note.id).catch(() => undefined);
  };

  const shortId = note.id.length > 12 ? `${note.id.slice(0, 12)}…` : note.id;

  return (
    <div className="flex h-full flex-col bg-background text-sm">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Properties
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Core fields ── */}
        <div className="px-4 py-3 space-y-1">
          <PropRow label="ID">
            <div className="flex items-center gap-1 min-w-0">
              <span className="truncate font-mono text-[11px] text-muted-foreground">
                {shortId}
              </span>
              <button
                type="button"
                title="Copy ID"
                onClick={copyId}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </PropRow>

          <PropRow label="Created">
            {new Date(note.createdAt).toLocaleString()}
          </PropRow>

          <PropRow label="Updated">
            {new Date(note.updatedAt).toLocaleString()}
          </PropRow>

          {swimlaneName && <PropRow label="Swimlane">{swimlaneName}</PropRow>}

          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground">Pinned</span>
            <Switch
              checked={pinned}
              onCheckedChange={onPinnedChange}
              aria-label="Pinned"
            />
          </div>
        </div>

        {/* ── Custom Metadata ── */}
        <SectionDivider label="Metadata">
          <MetadataFieldsSection
            fields={metadata}
            onChange={onMetadataChange}
          />
        </SectionDivider>

        {/* ── References ── */}
        <SectionDivider label="References">
          <EditableListSection
            items={references}
            onChange={onReferencesChange}
            placeholder="Note title or URL…"
            addLabel="Add reference"
          />
        </SectionDivider>
      </div>
    </div>
  );
}

// ─── Section divider wrapper ──────────────────────────────────────────────────

function SectionDivider({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t">
      <div className="px-4 pt-3 pb-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          {label}
        </span>
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

// ─── Property row ─────────────────────────────────────────────────────────────

function PropRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-xs text-foreground/80">
        {children}
      </span>
    </div>
  );
}

// ─── Custom metadata fields ──────────────────────────────────────────────────

function MetadataFieldsSection({
  fields,
  onChange,
}: {
  fields: NoteMetadataField[];
  onChange: (fields: NoteMetadataField[]) => void;
}) {
  const [draft, setDraft] = useState<NoteMetadataField[]>(fields);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const keyInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(fields);
  }, [fields]);

  const commitAll = useCallback(
    (next: NoteMetadataField[]) => {
      const cleaned = next
        .filter((f) => f.key.trim().length > 0)
        .map((f) => ({ ...f, key: f.key.trim().replace(/\s+/g, "_") }));
      setDraft(cleaned);
      onChange(cleaned);
    },
    [onChange],
  );

  const setDraftField = useCallback(
    (idx: number, patch: Partial<NoteMetadataField>) => {
      setDraft((prev) =>
        prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
      );
    },
    [],
  );

  const handleKeyBlur = useCallback(
    (idx: number) => {
      const current = draftRef.current;
      const field = current[idx];
      if (!field) return;
      if (!field.key.trim()) {
        commitAll(current.filter((_, i) => i !== idx));
      } else {
        commitAll(current);
      }
    },
    [commitAll],
  );

  const addField = useCallback(() => {
    setDraft((prev) => [...prev, { key: "", value: "", type: "text" }]);
    setTimeout(() => keyInputRef.current?.focus(), 0);
  }, []);

  const removeField = useCallback(
    (idx: number) => {
      commitAll(draftRef.current.filter((_, i) => i !== idx));
    },
    [commitAll],
  );

  const commitFieldValue = useCallback(
    (idx: number, value: string) => {
      const next = draftRef.current.map((f, i) =>
        i === idx ? { ...f, value } : f,
      );
      commitAll(next);
    },
    [commitAll],
  );

  return (
    <div className="space-y-2">
      {draft.length === 0 ? (
        <p className="py-1 text-[11px] italic text-muted-foreground/60">
          No fields yet.
        </p>
      ) : (
        draft.map((field, idx) => (
          <div key={idx} className="rounded-lg border bg-muted/30 px-3 py-2">
            {/* key row */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <input
                ref={idx === draft.length - 1 ? keyInputRef : undefined}
                value={field.key}
                onChange={(e) => setDraftField(idx, { key: e.target.value })}
                onBlur={() => handleKeyBlur(idx)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    (e.currentTarget as HTMLInputElement).blur();
                }}
                className="h-5 min-w-0 flex-1 bg-transparent text-[11px] font-semibold text-foreground outline-none placeholder:text-muted-foreground/40 border-b border-transparent focus:border-border"
                placeholder="field_name"
              />
              <select
                value={field.type}
                onChange={(e) => {
                  const t = e.target.value as NoteMetadataType;
                  const nextValue =
                    t === "list" && !field.value
                      ? '[""]'
                      : t === "boolean" &&
                          !["true", "false"].includes(field.value)
                        ? "false"
                        : field.value;
                  setDraftField(idx, {
                    type: t,
                    value: nextValue,
                  });
                }}
                onBlur={() => commitAll(draftRef.current)}
                className="h-5 rounded border bg-muted/50 px-1 text-[10px] text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="list">List</option>
                <option value="boolean">Boolean</option>
              </select>
              <button
                type="button"
                title="Remove field"
                onClick={() => removeField(idx)}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* value row */}
            {field.type === "list" ? (
              <MetadataListValue
                field={field}
                onCommitValue={(val) => commitFieldValue(idx, val)}
              />
            ) : field.type === "date" ? (
              <input
                type="date"
                value={field.value}
                onChange={(e) => setDraftField(idx, { value: e.target.value })}
                onBlur={() => commitAll(draftRef.current)}
                className="h-6 w-full rounded border bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            ) : field.type === "number" ? (
              <input
                type="number"
                value={field.value}
                onChange={(e) => setDraftField(idx, { value: e.target.value })}
                onBlur={() => commitAll(draftRef.current)}
                placeholder="0"
                className="h-6 w-full rounded border bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            ) : field.type === "boolean" ? (
              <div className="flex items-center justify-between rounded border bg-background px-2 py-1">
                <span className="text-xs text-muted-foreground">
                  {field.value === "true" ? "True" : "False"}
                </span>
                <Switch
                  checked={field.value === "true"}
                  onCheckedChange={(checked) =>
                    commitFieldValue(idx, checked ? "true" : "false")
                  }
                  aria-label="Boolean metadata value"
                />
              </div>
            ) : (
              <input
                value={field.value}
                onChange={(e) => setDraftField(idx, { value: e.target.value })}
                onBlur={() => commitAll(draftRef.current)}
                placeholder="value…"
                className="h-6 w-full rounded border bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            )}
          </div>
        ))
      )}

      <button
        type="button"
        onClick={addField}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
        Add field
      </button>
    </div>
  );
}

// ─── List value editor ───────────────────────────────────────────────────────

function MetadataListValue({
  field,
  onCommitValue,
}: {
  field: NoteMetadataField;
  onCommitValue: (val: string) => void;
}) {
  const parseListValue = useCallback((raw: string) => {
    try {
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed.map(String)
        : [""];
    } catch {
      return [""];
    }
  }, []);

  const [draft, setDraft] = useState<string[]>(() =>
    parseListValue(field.value),
  );
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const listInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(parseListValue(field.value));
  }, [field.value, parseListValue]);

  const commitList = useCallback(
    (next: string[]) => {
      const cleaned = next.map((v) => v.trim()).filter((v) => v.length > 0);
      setDraft(cleaned.length > 0 ? cleaned : [""]);
      onCommitValue(JSON.stringify(cleaned.length > 0 ? cleaned : []));
    },
    [onCommitValue],
  );

  const handleBlur = useCallback(() => {
    commitList(draftRef.current);
  }, [commitList]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitList(draftRef.current);
      }
    },
    [commitList],
  );

  const removeItem = useCallback(
    (i: number) => {
      const next = draftRef.current.filter((_, j) => j !== i);
      commitList(next);
    },
    [commitList],
  );

  const addItem = useCallback(() => {
    setDraft((prev) => [...prev, ""]);
    setTimeout(() => listInputRef.current?.focus(), 0);
  }, []);

  return (
    <div className="mt-0.5 space-y-1">
      {draft.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="w-4 shrink-0 text-[10px] text-muted-foreground/50 text-right">
            {i + 1}.
          </span>
          <input
            ref={i === draft.length - 1 ? listInputRef : undefined}
            value={item}
            onChange={(e) =>
              setDraft((prev) => {
                const next = [...prev];
                next[i] = e.target.value;
                return next;
              })
            }
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="h-5 flex-1 rounded border bg-background px-1.5 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring"
            placeholder={`item ${i + 1}`}
          />
          {draft.length > 1 && (
            <button
              type="button"
              title="Remove item"
              onClick={() => removeItem(i)}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="ml-5 flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
        add item
      </button>
    </div>
  );
}

// ─── Shared editable list section (references) ───────────────────────────────

function EditableListSection({
  items,
  onChange,
  placeholder = "…",
  addLabel = "+ Add",
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const [draft, setDraft] = useState<string[]>(items);
  const addInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(items);
  }, [items]);

  const commit = useCallback(
    (next: string[]) => {
      const deduped = [...new Set(next.map((v) => v.trim()).filter(Boolean))];
      setDraft(deduped);
      onChange(deduped);
    },
    [onChange],
  );

  return (
    <div className="space-y-1.5">
      {draft.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <input
            ref={idx === draft.length - 1 ? addInputRef : undefined}
            value={item}
            onChange={(e) => {
              const next = [...draft];
              next[idx] = e.target.value;
              setDraft(next);
            }}
            onBlur={() => {
              const val = draft[idx]?.trim();
              commit(val ? draft : draft.filter((_, i) => i !== idx));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            className="h-6 flex-1 rounded border bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
            placeholder={placeholder}
          />
          <button
            type="button"
            title="Remove"
            onClick={() => commit(draft.filter((_, i) => i !== idx))}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => {
          setDraft((prev) => [...prev, ""]);
          setTimeout(() => addInputRef.current?.focus(), 0);
        }}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
        {addLabel}
      </button>
    </div>
  );
}
