import { Archive, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { NamingLabels } from "@/lib/types";

type BoardModalFooterProps = {
  isEditMode: boolean;
  isArchiving: boolean;
  canDeleteBoard: boolean;
  isSubmitting: boolean;
  defaultLabels: NamingLabels;
  onArchive: () => void;
  onOpenDeleteDialog: () => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export function BoardModalFooter({
  isEditMode,
  isArchiving,
  canDeleteBoard,
  isSubmitting,
  defaultLabels,
  onArchive,
  onOpenDeleteDialog,
  onCancel,
  onSubmit,
}: BoardModalFooterProps) {
  return (
    <div className="flex items-center gap-2 pt-4">
      {isEditMode && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onArchive}
            disabled={isArchiving}
            className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-950/50"
          >
            <Archive className="h-3.5 w-3.5" />
            {isArchiving ? "Archiving…" : "Archive"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenDeleteDialog}
            disabled={!canDeleteBoard}
            className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </>
      )}
      <div className="flex-1" />
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" disabled={isSubmitting} onClick={onSubmit}>
        {isEditMode
          ? isSubmitting
            ? "Saving…"
            : "Save Changes"
          : isSubmitting
            ? "Creating…"
            : `Create ${defaultLabels.board}`}
      </Button>
    </div>
  );
}
