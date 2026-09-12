import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";
import { Archive, Link2, RotateCcw, Star, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getDomainFromUrl, normalizeBookmarkUrl } from "@/lib/bookmarks";
import type { Bookmark, BookmarkStatus } from "@/lib/types";

type MetadataState = "idle" | "loading" | "error";

const BOOKMARK_STATUSES: BookmarkStatus[] = ["unread", "reading", "important", "archived", "favorite"];

type BookmarkDetailPanelProps = {
  bookmark: Bookmark;
  currentSwimlaneName?: string;
  metadataState: MetadataState;
  tagInput: string;
  setTagInput: (value: string) => void;
  setBookmark: Dispatch<SetStateAction<Bookmark | null>>;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onHydrateMetadata: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onSave: () => void;
};

export function BookmarkDetailPanel({
  bookmark,
  currentSwimlaneName,
  metadataState,
  tagInput,
  setTagInput,
  setBookmark,
  onAddTag,
  onRemoveTag,
  onHydrateMetadata,
  onArchive,
  onRestore,
  onDelete,
  onSave,
}: BookmarkDetailPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="text-sm font-semibold">{bookmark.id ? "Edit Bookmark" : "New Bookmark"}</div>
        <div className="flex items-center gap-2">
          {currentSwimlaneName && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {currentSwimlaneName}
            </span>
          )}
          {bookmark.id && bookmark.archived && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRestore} title="Restore">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          {bookmark.id && !bookmark.archived && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onArchive} title="Archive">
              <Archive className="h-4 w-4" />
            </Button>
          )}
          {bookmark.id && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="Delete bookmark"
              aria-label="Delete bookmark"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-3 px-4 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">URL</label>
            <div className="flex gap-2">
              <Input
                value={bookmark.url}
                placeholder="https://..."
                className="flex-1"
                onChange={(event) =>
                  setBookmark((current) =>
                    current
                      ? {
                          ...current,
                          url: event.target.value,
                        }
                      : current
                  )
                }
                onBlur={() => {
                  let raw = bookmark.url?.trim();
                  if (!raw) return;
                  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
                    raw = `http://${raw}`;
                  }
                  try {
                    const normalized = normalizeBookmarkUrl(raw);
                    const domain = getDomainFromUrl(normalized);
                    setBookmark((current) =>
                      current
                        ? {
                            ...current,
                            url: raw,
                            urlNormalized: normalized,
                            domain,
                          }
                        : current
                    );
                  } catch {
                    // invalid URL handled by save guard
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-xs"
                onClick={onHydrateMetadata}
                disabled={metadataState === "loading" || !bookmark.url}
              >
                <Link2 className="mr-1.5 h-3.5 w-3.5" />
                {metadataState === "loading" ? "Fetching..." : "Fetch Details"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
              <Select
                value={bookmark.status}
                onValueChange={(value) =>
                  setBookmark((current) =>
                    current
                      ? {
                          ...current,
                          status: value as BookmarkStatus,
                        }
                      : current
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKMARK_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Rating</label>
              <div className="flex items-center gap-1 rounded-md border px-2 py-2">
                {Array.from({ length: 5 }, (_, index) => {
                  const value = index + 1;
                  const active = (bookmark.rating ?? 0) >= value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-label={`Set rating to ${value}`}
                      className="rounded p-1 text-muted-foreground transition hover:scale-105 hover:text-amber-500 dark:hover:text-amber-300"
                      onClick={() =>
                        setBookmark((current) =>
                          current
                            ? {
                                ...current,
                                rating: value,
                              }
                            : current
                        )
                      }
                    >
                      <Star
                        className={`h-4 w-4 ${active ? "fill-amber-400 text-amber-500 dark:fill-amber-300 dark:text-amber-300" : ""}`}
                      />
                    </button>
                  );
                })}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-7 px-2 text-xs"
                  onClick={() =>
                    setBookmark((current) =>
                      current
                        ? {
                            ...current,
                            rating: undefined,
                          }
                        : current
                    )
                  }
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
            <Input
              value={bookmark.title}
              onChange={(event) =>
                setBookmark((current) =>
                  current
                    ? {
                        ...current,
                        title: event.target.value,
                      }
                    : current
                )
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Description / Note</label>
            <Textarea
              rows={4}
              value={bookmark.description}
              onChange={(event) =>
                setBookmark((current) =>
                  current
                    ? {
                        ...current,
                        description: event.target.value,
                      }
                    : current
                )
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tags</label>
            <div className="rounded-md border">
              <Input
                placeholder="Add tag"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onAddTag();
                  }
                }}
                className="border-0 shadow-none focus-visible:ring-0"
              />
              {bookmark.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2">
                  {bookmark.tags.map((tag) => (
                    <Badge key={tag} className="flex items-center gap-2">
                      {tag}
                      <button
                        type="button"
                        className="text-xs text-muted-foreground"
                        onClick={() => onRemoveTag(tag)}
                      >
                        x
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <span className="text-xs font-medium text-muted-foreground">Metadata</span>
            {metadataState === "error" && (
              <p className="text-xs text-destructive">Metadata could not be fetched. You can still save manually.</p>
            )}
            {bookmark.previewImage && (
              <div className="relative h-28 w-full overflow-hidden rounded-md border">
                <Image
                  src={bookmark.previewImage}
                  alt={bookmark.title || "Bookmark preview"}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            )}
            <Input
              placeholder="Preview image URL"
              value={bookmark.previewImage ?? ""}
              onChange={(event) =>
                setBookmark((current) =>
                  current
                    ? {
                        ...current,
                        previewImage: event.target.value,
                      }
                    : current
                )
              }
            />
            <Input
              placeholder="Favicon URL"
              value={bookmark.favicon ?? ""}
              onChange={(event) =>
                setBookmark((current) =>
                  current
                    ? {
                        ...current,
                        favicon: event.target.value,
                      }
                    : current
                )
              }
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() =>
                setBookmark((current) =>
                  current
                    ? {
                        ...current,
                        pinned: !current.pinned,
                      }
                    : current
                )
              }
            >
              {bookmark.pinned ? "Unpin" : "Pin"}
            </Button>
            <Button onClick={onSave}>Save Bookmark</Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
