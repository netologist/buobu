import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Bookmark } from "@/lib/types";
import { cn } from "@/lib/utils";

type BookmarkCardProps = {
  bookmark: Bookmark;
  accentColor?: string;
  isSelected: boolean;
  onSelect: () => void;
};

export function BookmarkCard({ bookmark, accentColor, isSelected, onSelect }: BookmarkCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col gap-1 border-l-[3px] px-3 py-2 text-left transition-colors hover:bg-muted/50",
        isSelected && "bg-muted/70"
      )}
      style={{ borderLeftColor: accentColor ?? "#6B7280" }}
    >
      <div className="flex items-center gap-2">
        <span className="line-clamp-1 text-sm font-medium">{bookmark.title || bookmark.url}</span>
        {bookmark.pinned && <Star className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" />}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{bookmark.domain}</span>
        <span>•</span>
        <span>{bookmark.status}</span>
        {!!bookmark.rating && (
          <>
            <span>•</span>
            <span>{bookmark.rating}/5</span>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {bookmark.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px]">
            {tag}
          </Badge>
        ))}
      </div>
    </button>
  );
}
