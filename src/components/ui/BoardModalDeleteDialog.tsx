import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NamingLabels } from "@/lib/types";

type BoardModalDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: NamingLabels;
  canDeleteBoard: boolean;
  boardName: string;
  onDelete: () => void;
};

export function BoardModalDeleteDialog({
  open,
  onOpenChange,
  labels,
  canDeleteBoard,
  boardName,
  onDelete,
}: BoardModalDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {labels.board}</DialogTitle>
          <DialogDescription>
            {canDeleteBoard
              ? `Are you sure you want to delete "${boardName}"? All associated ${labels.swimlanePlural.toLowerCase()}, tasks, and data will be permanently removed.`
              : `You cannot delete the last ${labels.board.toLowerCase()}. Create another one first.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={!canDeleteBoard}>
            Delete {labels.board}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
