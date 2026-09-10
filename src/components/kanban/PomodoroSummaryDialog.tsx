import type { Task } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PomodoroRow = {
  task: Task;
  pomodoros: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: PomodoroRow[];
};

export function PomodoroSummaryDialog({ open, onOpenChange, rows }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pomodoro Summary</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pomodoros for this swimlane yet.</p>
        ) : (
          <div className="space-y-3">
            {rows.map(({ task, pomodoros }) => (
              <Card key={task.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{task.title}</p>
                    {task.archived && (
                      <p className="mt-1 text-xs text-muted-foreground">Archived</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold">{pomodoros}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
