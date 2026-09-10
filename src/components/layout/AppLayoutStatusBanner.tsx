import { Archive } from "lucide-react";

import { Button } from "@/components/ui/button";

type AppLayoutStatusBannerProps = {
  variant: "archive-view" | "archived-selection" | "search-context";
  onExitArchiveView?: () => void;
  searchContextLabel?: string;
  onResetSearchContext?: () => void;
};

export function AppLayoutStatusBanner({
  variant,
  onExitArchiveView,
  searchContextLabel,
  onResetSearchContext,
}: Readonly<AppLayoutStatusBannerProps>) {
  if (variant === "archive-view") {
    return (
      <div className="flex items-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
        <Archive className="h-4 w-4 shrink-0" />
        <span className="flex-1">You are viewing archived content. All changes are disabled.</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onExitArchiveView}
          className="h-7 gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
        >
          Exit Archive View
        </Button>
      </div>
    );
  }

  if (variant === "search-context") {
    return (
      <div className="flex items-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
        <Archive className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 truncate">
          Search filter active: {searchContextLabel ?? "scoped context"}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onResetSearchContext}
          className="h-6 border-amber-300 px-2 text-[11px] text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
        >
          Reset
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50/70 px-4 py-1.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
      <Archive className="h-3.5 w-3.5 shrink-0" />
      <span>Archived mode — showing archived items from the selected board/swimlane.</span>
    </div>
  );
}
