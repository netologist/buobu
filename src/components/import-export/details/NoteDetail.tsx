"use client";

import type { Note, Board, Swimlane } from "@/lib/types";
import { Pin, Tag, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { markdownToHtml } from "@/components/notes/extensions/markdown-serializer";

type NoteDetailProps = {
  note: Note;
  board?: Board;
  swimlane?: Swimlane;
};

function formatDate(d?: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return d; }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</h3>
      {children}
    </div>
  );
}

export function NoteDetail({ note, board, swimlane }: NoteDetailProps) {
  return (
    <div className="space-y-5 text-sm">
      {/* Meta */}
      <div className="flex flex-wrap gap-2 items-center">
        {note.pinned && (
          <span className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
            <Pin className="size-3" /> Pinned
          </span>
        )}
        {board && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{board.name}</span>}
        {swimlane && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{swimlane.name}</span>}
        {note.archived && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Archived</span>
        )}
      </div>

      {/* Content — full rich-text HTML render */}
      <Section title="Content">
        {note.content ? (
          <div
            className={cn(
              "prose prose-sm dark:prose-invert max-w-none",
              "text-foreground",
              "[&_p]:my-1.5 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm",
              "[&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0",
              "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
              "[&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs",
              "[&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto",
              "[&_table]:w-full [&_th]:border [&_td]:border [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1",
              "[&_hr]:border-border",
              "[&_a]:text-primary [&_a]:underline"
            )}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(note.content) }}
          />
        ) : (
          <p className="text-muted-foreground italic">No content</p>
        )}
      </Section>

      {/* Tags */}
      {note.tags.length > 0 && (
        <Section title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {note.tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                <Tag className="size-3" />{tag}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Wiki-links / references */}
      {note.references.length > 0 && (
        <Section title={`Wiki Links (${note.references.length})`}>
          <div className="space-y-1">
            {note.references.map((ref, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-1.5 text-xs">
                <Link2 className="size-3 text-muted-foreground shrink-0" />
                <span className="text-primary">{ref}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Dates */}
      <Section title="Dates">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Created</p>
            <p className="text-xs">{formatDate(note.createdAt)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Last Updated</p>
            <p className="text-xs">{formatDate(note.updatedAt)}</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
