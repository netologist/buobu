import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Task } from "@/lib/types";

type BriefingMoveTaskDialogProps = {
  open: boolean;
  movingTask: Task | null;
  moveDate: string;
  onOpenChange: (open: boolean) => void;
  onMoveDateChange: (value: string) => void;
  onConfirm: () => void;
};

export function BriefingMoveTaskDialog({
  open,
  movingTask,
  moveDate,
  onOpenChange,
  onMoveDateChange,
  onConfirm,
}: BriefingMoveTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Move Task</DialogTitle>
          <DialogDescription>
            Choose a new date for &ldquo;{movingTask?.title}&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="move-task-date">New date</Label>
          <Input
            id="move-task-date"
            type="date"
            value={moveDate}
            onChange={(event) => onMoveDateChange(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!moveDate}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
