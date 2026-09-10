"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Note, NoteMetadataField } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Archive,
  PanelRight,
  PanelRightClose,
  Pin,
  PinOff,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
  Tag,
} from "lucide-react";
import NoteMetadataPanel from "@/components/notes/NoteMetadataPanel";
import { serializeFrontmatter, slugifyTitle } from "@/lib/frontmatter";
import dynamic from "next/dynamic";

const TiptapEditor = dynamic(() => import("@/components/notes/TiptapEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      Loading editor…
    </div>
  ),
});

type NoteEditorProps = {
  note: Note | null;
  isCreating?: boolean;
  allNotes: Note[];
  onSave: (note: Partial<Note>) => void;
  onDelete?: (noteId: string) => void;
  onArchive?: (noteId: string) => void;
  onRestore?: (noteId: string) => void;
  boardName?: string;
  swimlaneName?: string;
  onNavigateToNote?: (note: Note) => void;
};

export default function NoteEditor({
  note,
  isCreating,
  allNotes,
  onSave,
  onDelete,
  onArchive,
  onRestore,
  swimlaneName,
  onNavigateToNote,
}: NoteEditorProps) {
  if (!note && !isCreating) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a note or create a new one
      </div>
    );
  }

  return (
    <NoteEditorContent
      key={note?.id ?? (isCreating ? "new-note" : "empty-note")}
      note={note}
      isCreating={isCreating}
      allNotes={allNotes}
      onSave={onSave}
      onDelete={onDelete}
      onArchive={onArchive}
      onRestore={onRestore}
      swimlaneName={swimlaneName}
      onNavigateToNote={onNavigateToNote}
    />
  );
}

function NoteEditorContent({
  note,
  allNotes,
  onSave,
  onDelete,
  onArchive,
  onRestore,
  swimlaneName,
  onNavigateToNote,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [references, setReferences] = useState<string[]>(
    note?.references ?? [],
  );
  const [metadata, setMetadata] = useState<NoteMetadataField[]>(
    note?.metadata ?? [],
  );
  const [isMetaOpen, setIsMetaOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentContentRef = useRef<string>(note?.content ?? "");

  const handleEditorUpdate = useCallback((markdown: string) => {
    currentContentRef.current = markdown;
    setIsDirty(true);
  }, []);

  const handleEditorReady = useCallback(() => {
    setEditorReady(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!title.trim()) return;
    onSave({
      ...(note ?? {}),
      title: title.trim(),
      content: currentContentRef.current,
      tags,
      pinned,
      references,
      metadata,
    });
    setIsDirty(false);
  }, [note, title, tags, pinned, references, metadata, onSave]);

  const handleExport = useCallback(() => {
    if (!note?.id) return;
    const fm = serializeFrontmatter({
      title: note.title,
      tags: note.tags ?? [],
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      metadata: note.metadata ?? [],
    });
    const content = fm + currentContentRef.current;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugifyTitle(note.title || "untitled")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [note]);

  // Autosave
  useEffect(() => {
    if (!isDirty || !editorReady) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 2000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [isDirty, handleSave, editorReady]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setIsDirty(true);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setIsDirty(true);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
    setIsDirty(true);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Title + actions */}
      <div className="flex items-center gap-2 border-b px-5 py-3">
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title..."
          className="flex-1 border-none bg-transparent text-xl font-bold shadow-none focus-visible:ring-0"
        />
        {swimlaneName && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {swimlaneName}
          </span>
        )}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setPinned(!pinned);
              setIsDirty(true);
            }}
            title={pinned ? "Unpin" : "Pin"}
          >
            {pinned ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleSave}
            disabled={!title.trim()}
            title="Save"
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMetaOpen((o) => !o)}
            title={isMetaOpen ? "Hide properties" : "Show properties"}
          >
            {isMetaOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRight className="h-4 w-4" />
            )}
          </Button>
          {note?.id && note.archived && onRestore && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onRestore(note.id)}
              title="Restore"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          {note?.id && !note.archived && onArchive && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onArchive(note.id)}
              title="Archive"
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
          {note?.id && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleExport}
              title="Export as .md"
            >
              <Upload className="h-4 w-4" />
            </Button>
          )}
          {note?.id && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm("Delete this note?")) onDelete(note.id);
              }}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tags bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b px-5 py-1.5">
        <Tag className="h-3 w-3 text-muted-foreground" />
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="cursor-pointer gap-1 rounded-full px-2 py-0 text-[11px]"
            onClick={() => removeTag(tag)}
          >
            #{tag}
            <X className="h-2.5 w-2.5" />
          </Badge>
        ))}
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="add tag…"
          className="h-5 w-20 border-none bg-transparent text-[11px] shadow-none focus-visible:ring-0"
        />
      </div>

      {/* Editor + optional metadata panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden">
          <TiptapEditor
            key={note?.id ?? "new"}
            content={note?.content ?? ""}
            onUpdate={handleEditorUpdate}
            onReady={handleEditorReady}
            allNotes={allNotes}
            currentNoteId={note?.id}
            onNavigateToNote={onNavigateToNote}
          />
        </div>
        {isMetaOpen && note?.id && (
          <aside className="w-72 shrink-0 border-l overflow-hidden">
            <NoteMetadataPanel
              note={note}
              pinned={pinned}
              references={references}
              metadata={metadata}
              swimlaneName={swimlaneName}
              onPinnedChange={(val) => {
                setPinned(val);
                setIsDirty(true);
              }}
              onReferencesChange={(refs) => {
                setReferences(refs);
                setIsDirty(true);
              }}
              onMetadataChange={(fields) => {
                setMetadata(fields);
                setIsDirty(true);
              }}
            />
          </aside>
        )}
      </div>

      {/* Status bar */}
      <div className="border-t px-5 py-1 text-[11px] text-muted-foreground">
        {isDirty ? "Unsaved changes…" : "Saved"}
        {note?.updatedAt && (
          <span className="ml-2">
            {new Date(note.updatedAt).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
