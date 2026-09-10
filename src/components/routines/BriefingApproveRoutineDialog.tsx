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
import type { Routine } from "@/lib/types";

type BriefingApproveRoutineDialogProps = {
  open: boolean;
  routine: Routine | null;
  approveTaskTitle: string;
  processing: Set<string>;
  onOpenChange: (open: boolean) => void;
  onApproveTaskTitleChange: (value: string) => void;
  onConfirm: () => void;
};

export function BriefingApproveRoutineDialog({
  open,
  routine,
  approveTaskTitle,
  processing,
  onOpenChange,
  onApproveTaskTitleChange,
  onConfirm,
}: BriefingApproveRoutineDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Approve Routine</DialogTitle>
          <DialogDescription>
            Set the title for the task that will be created.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="approve-task-title">Task title</Label>
          <Input
            id="approve-task-title"
            value={approveTaskTitle}
            onChange={(event) => onApproveTaskTitleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void onConfirm();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!routine || !approveTaskTitle.trim() || (routine ? processing.has(routine.id) : false)}
          >
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
