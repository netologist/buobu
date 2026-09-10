"use client";

import type { Bookmark, Board, Swimlane } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Bookmark as BookmarkIcon, Star, ExternalLink, Tag, ChevronRight, Link2 } from "lucide-react";

type BookmarksSectionProps = {
  bookmarks: Bookmark[];
  boardMap: Map<string, Board>;
  swimlaneMap: Map<string, Swimlane>;
  onSelect?: (bookmark: Bookmark) => void;
};

const STATUS_CONFIG = {
  unread: { label: "Unread", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  reading: { label: "Reading", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  important: { label: "Important", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground" },
  favorite: { label: "Favorite", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
} as const;

export function BookmarksSection({ bookmarks, boardMap, swimlaneMap, onSelect }: BookmarksSectionProps) {
  if (bookmarks.length === 0) {
    return (
      <EmptyState
        icon={<BookmarkIcon className="size-8 text-muted-foreground/40" />}
        message="No bookmarks match the current filter"
      />
    );
  }

  // Group by board → swimlane
  const grouped = new Map<string, Map<string, Bookmark[]>>();
  for (const bookmark of bookmarks) {
    const bid = bookmark.boardId ?? "__unknown__";
    const sid = bookmark.swimlaneId ?? "__unknown__";
    if (!grouped.has(bid)) grouped.set(bid, new Map());
    const byBoard = grouped.get(bid)!;
    if (!byBoard.has(sid)) byBoard.set(sid, []);
    byBoard.get(sid)!.push(bookmark);
  }

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
                {Array.from(bySwimlane.values()).flat().length} bookmarks
              </span>
            </h3>

            <div className="space-y-4 pl-4 border-l border-border/60">
              {Array.from(bySwimlane.entries()).map(([swimlaneId, swimlaneBookmarks]) => {
                const swimlane = swimlaneMap.get(swimlaneId);
                return (
                  <div key={swimlaneId}>
                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <ChevronRight className="size-3" />
                      {swimlane?.name ?? "Unknown Swimlane"}
                      <span className="ml-1 font-normal normal-case">
                        ({swimlaneBookmarks.length})
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {swimlaneBookmarks.map((bookmark) => (
                        <BookmarkCard key={bookmark.id} bookmark={bookmark} onSelect={onSelect} />
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

function BookmarkCard({ bookmark, onSelect }: { bookmark: Bookmark; onSelect?: (bookmark: Bookmark) => void }) {
  const statusCfg = STATUS_CONFIG[bookmark.status] ?? STATUS_CONFIG.unread;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 text-sm shadow-xs transition-colors",
        "hover:border-primary/30 hover:bg-card/80",
        bookmark.archived && "opacity-60",
        bookmark.isBroken && "border-destructive/30",
        onSelect && "cursor-pointer"
      )}
      onClick={onSelect ? () => onSelect(bookmark) : undefined}
    >
      {/* Header: favicon + title */}
      <div className="flex items-start gap-2 mb-1.5">
        {bookmark.favicon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bookmark.favicon}
            alt=""
            loading="lazy"
            className="size-4 rounded shrink-0 mt-0.5 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <ExternalLink className="size-4 text-muted-foreground shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium line-clamp-1 text-foreground">
            {bookmark.title || bookmark.domain || "Untitled"}
          </p>
          <p className="text-[11px] text-muted-foreground line-clamp-1">
            {bookmark.domain}
          </p>
        </div>
        {bookmark.pinned && (
          <BookmarkIcon className="size-3.5 text-primary fill-primary shrink-0" />
        )}
      </div>

      {bookmark.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {bookmark.description}
        </p>
      )}

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            statusCfg.className
          )}
        >
          {statusCfg.label}
        </span>

        {bookmark.rating != null && bookmark.rating > 0 && (
          <span className="flex items-center gap-0.5 text-[11px] text-amber-500">
            <Star className="size-3 fill-amber-500" />
            {bookmark.rating}
          </span>
        )}

        {bookmark.links.length > 0 && (
          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
            <Link2 className="size-3" />
            {bookmark.links.length}
          </span>
        )}

        {bookmark.isBroken && (
          <span className="rounded-full bg-destructive/10 text-destructive px-1.5 py-0.5 text-[10px]">
            Broken
          </span>
        )}
      </div>

      {bookmark.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1 items-center">
          <Tag className="size-3 text-muted-foreground shrink-0" />
          {bookmark.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
          {bookmark.tags.length > 4 && (
            <span className="text-[10px] text-muted-foreground">
              +{bookmark.tags.length - 4}
            </span>
          )}
        </div>
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
