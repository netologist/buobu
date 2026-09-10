"use client";

import type { Note, Board, Swimlane } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FileText, Pin, ChevronRight, Tag } from "lucide-react";

type NotesSectionProps = {
  notes: Note[];
  boardMap: Map<string, Board>;
  swimlaneMap: Map<string, Swimlane>;
  onSelect?: (note: Note) => void;
};

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export function NotesSection({ notes, boardMap, swimlaneMap, onSelect }: NotesSectionProps) {
  if (notes.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="size-8 text-muted-foreground/40" />}
        message="No notes match the current filter"
      />
    );
  }

  // Group by board → swimlane
  const grouped = new Map<string, Map<string, Note[]>>();
  for (const note of notes) {
    const bid = note.boardId ?? "__unknown__";
    const sid = note.swimlaneId ?? "__unknown__";
    if (!grouped.has(bid)) grouped.set(bid, new Map());
    const byBoard = grouped.get(bid)!;
    if (!byBoard.has(sid)) byBoard.set(sid, []);
    byBoard.get(sid)!.push(note);
  }

  // Pinned notes float to top within each group
  const sortNotes = (arr: Note[]) => [
    ...arr.filter((n) => n.pinned),
    ...arr.filter((n) => !n.pinned),
  ];

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([boardId, bySwimlane]) => {
        const board = boardMap.get(boardId);
        return (
          <div key={boardId}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="inline-block size-2 rounded-full bg-primary" />
              {board?.name ?? "Unknown Board"}
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {Array.from(bySwimlane.values()).flat().length} notes
              </span>
            </h3>

            <div className="space-y-4 pl-4 border-l border-border/60">
              {Array.from(bySwimlane.entries()).map(([swimlaneId, swimlaneNotes]) => {
                const swimlane = swimlaneMap.get(swimlaneId);
                return (
                  <div key={swimlaneId}>
                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <ChevronRight className="size-3" />
                      {swimlane?.name ?? "Unknown Swimlane"}
                      <span className="ml-1 font-normal normal-case">
                        ({swimlaneNotes.length})
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {sortNotes(swimlaneNotes).map((note) => (
                        <NoteCard key={note.id} note={note} onSelect={onSelect} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NoteCard({ note, onSelect }: { note: Note; onSelect?: (note: Note) => void }) {
  const plain = stripHtml(note.content ?? "");
  const updated = formatDate(note.updatedAt);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 text-sm shadow-xs transition-colors",
        "hover:border-primary/30 hover:bg-card/80",
        note.pinned && "border-primary/40 bg-primary/5",
        note.archived && "opacity-60",
        onSelect && "cursor-pointer"
      )}
      onClick={onSelect ? () => onSelect(note) : undefined}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            {note.pinned && (
              <Pin className="size-3 text-primary shrink-0" />
            )}
            <p className="font-medium leading-snug line-clamp-1 text-foreground">
              {note.title || "Untitled Note"}
            </p>
          </div>
          {plain && (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {plain}
            </p>
          )}
        </div>
      </div>

      {note.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 items-center">
          <Tag className="size-3 text-muted-foreground shrink-0" />
          {note.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
          {note.tags.length > 4 && (
            <span className="text-[10px] text-muted-foreground">
              +{note.tags.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        {note.references.length > 0 && (
          <span>{note.references.length} wiki-link{note.references.length !== 1 ? "s" : ""}</span>
        )}
        {updated && <span className="ml-auto">{updated}</span>}
      </div>

      {note.archived && (
        <span className="mt-1.5 inline-block rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          Archived
        </span>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {icon}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
