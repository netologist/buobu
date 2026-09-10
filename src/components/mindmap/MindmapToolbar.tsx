import { Archive, RotateCcw, Trash2, ZoomIn, ZoomOut, Maximize2, Brain } from "lucide-react";
import type { Mindmap } from "@/lib/types";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  swimlaneName?: string;
  zoom: number;
  mindmap: Mindmap | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToView: () => void;
  onRestore?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function MindmapToolbar({
  title,
  swimlaneName,
  zoom,
  mindmap,
  onZoomIn,
  onZoomOut,
  onFitToView,
  onRestore,
  onArchive,
  onDelete,
}: Props) {
  return (
    <div className="flex items-center gap-2 border-b px-5 py-2">
      <Brain className="h-4.5 w-4.5 text-indigo-500 dark:text-indigo-300" />
      <span className="text-sm font-semibold truncate max-w-xs">{title}</span>
      <div className="flex-1" />
      {swimlaneName && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          {swimlaneName}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onZoomIn}
        title="Zoom in"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
        {Math.round(zoom * 100)}%
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onZoomOut}
        title="Zoom out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onFitToView}
        title="Fit to view"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>

      {onRestore && mindmap?.id && mindmap.archived && (
        <>
          <div className="mx-1 h-5 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Restore mindmap"
            onClick={() => onRestore(mindmap.id)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </>
      )}
      {onArchive && mindmap?.id && !mindmap.archived && (
        <>
          <div className="mx-1 h-5 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Archive mindmap"
            onClick={() => onArchive(mindmap.id)}
          >
            <Archive className="h-4 w-4" />
          </Button>
        </>
      )}
      {onDelete && mindmap?.id && (
        <>
          {!onArchive && !onRestore && <div className="mx-1 h-5 w-px bg-border" />}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            title="Delete mindmap"
            onClick={() => onDelete(mindmap.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
