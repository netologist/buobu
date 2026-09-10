import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AppLayoutDeleteSwimlaneDialogProps = {
  open: boolean;
  canDelete: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void | Promise<void>;
};

export function AppLayoutDeleteSwimlaneDialog({
  open,
  canDelete,
  onOpenChange,
  onDelete,
}: AppLayoutDeleteSwimlaneDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Swimlane</DialogTitle>
          <DialogDescription>
            {canDelete
              ? "Are you sure you want to delete this swimlane? This will also delete all associated tasks and data."
              : "You cannot delete the last swimlane in this board. Create another swimlane first."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={!canDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
