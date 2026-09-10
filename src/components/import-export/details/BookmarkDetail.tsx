"use client";

import type { Bookmark, Board, Swimlane } from "@/lib/types";
import { ExternalLink, Star, Tag, Link2, Bookmark as BookmarkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type BookmarkDetailProps = {
  bookmark: Bookmark;
  board?: Board;
  swimlane?: Swimlane;
};

const STATUS_CONFIG = {
  unread: { label: "Unread", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  reading: { label: "Reading", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  important: { label: "Important", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground" },
  favorite: { label: "Favorite", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
} as const;

const LINK_TYPE_LABELS: Record<string, string> = {
  note: "Note",
  kanban: "Task",
  mindmap: "Mindmap",
  whiteboard: "Whiteboard",
  event: "Calendar Event",
};

function formatDate(d?: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
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

export function BookmarkDetail({ bookmark, board, swimlane }: BookmarkDetailProps) {
  const statusCfg = STATUS_CONFIG[bookmark.status] ?? STATUS_CONFIG.unread;

  return (
    <div className="space-y-5 text-sm">
      {/* Preview image */}
      {bookmark.previewImage && (
        <div className="rounded-lg overflow-hidden border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bookmark.previewImage}
            alt={bookmark.title ?? ""}
            className="w-full h-36 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
          />
        </div>
      )}

      {/* Meta badges */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusCfg.className)}>
          {statusCfg.label}
        </span>
        {bookmark.pinned && (
          <span className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
            <BookmarkIcon className="size-3 fill-primary" /> Pinned
          </span>
        )}
        {bookmark.rating != null && bookmark.rating > 0 && (
          <span className="flex items-center gap-1 text-amber-500 text-xs">
            {Array.from({ length: bookmark.rating }).map((_, i) => (
              <Star key={i} className="size-3 fill-amber-500" />
            ))}
          </span>
        )}
        {board && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{board.name}</span>}
        {swimlane && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{swimlane.name}</span>}
        {bookmark.isBroken && (
          <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs">Broken URL</span>
        )}
        {bookmark.archived && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Archived</span>
        )}
      </div>

      {/* URL */}
      <Section title="URL">
        <div className="rounded-lg bg-muted/40 px-3 py-2.5 flex items-start gap-2 break-all">
          {bookmark.favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bookmark.favicon} alt="" className="size-4 shrink-0 mt-0.5 rounded object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <ExternalLink className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">{bookmark.domain}</p>
            {bookmark.siteName && (
              <p className="text-[11px] text-muted-foreground">{bookmark.siteName}</p>
            )}
            <p className="text-[11px] text-primary break-all mt-1">{bookmark.url}</p>
          </div>
        </div>
      </Section>

      {/* Description */}
      {bookmark.description && (
        <Section title="Description">
          <p className="text-sm text-muted-foreground leading-relaxed">{bookmark.description}</p>
        </Section>
      )}

      {/* Tags */}
      {bookmark.tags.length > 0 && (
        <Section title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {bookmark.tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                <Tag className="size-3" />{tag}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Cross-entity links */}
      {bookmark.links.length > 0 && (
        <Section title={`Linked Resources (${bookmark.links.length})`}>
          <div className="space-y-1.5">
            {bookmark.links.map((link) => (
              <div key={link.id} className="flex items-center gap-2.5 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                <Link2 className="size-3.5 text-muted-foreground shrink-0" />
                <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-medium">
                  {LINK_TYPE_LABELS[link.linkedType] ?? link.linkedType}
                </span>
                <span className="text-muted-foreground font-mono text-[10px]">{link.linkedId.slice(0, 12)}…</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Comments */}
      {bookmark.comments.length > 0 && (
        <Section title={`Comments (${bookmark.comments.length})`}>
          <div className="space-y-2">
            {bookmark.comments.map((c) => (
              <div key={c.id} className="rounded-lg border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground mb-1">{formatDate(c.createdAt)}</p>
                <p className="text-sm leading-relaxed">{c.content}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Metadata fetch info */}
      {bookmark.metadataLastFetchedAt && (
        <Section title="Metadata">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/50 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Last Fetched</p>
              <p className="text-xs">{formatDate(bookmark.metadataLastFetchedAt)}</p>
            </div>
            {bookmark.metadataFetchStatus && (
              <div className="rounded-lg bg-muted/50 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Fetch Status</p>
                <p className="text-xs">{bookmark.metadataFetchStatus}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Dates */}
      <Section title="Dates">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Created</p>
            <p className="text-xs">{formatDate(bookmark.createdAt)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Updated</p>
            <p className="text-xs">{formatDate(bookmark.updatedAt)}</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
