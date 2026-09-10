"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Task } from "@/lib/types";

type ArchiveViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  onRestore: (taskId: string) => void;
  title?: string;
  emptyMessage?: string;
};

export function ArchiveView({
  open,
  onOpenChange,
  tasks,
  onRestore,
  title = "Archived Tasks",
  emptyMessage = "No archived tasks yet.",
}: ArchiveViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.archivedAt ? `Archived at ${task.archivedAt}` : "Archived"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onRestore(task.id)}>
                    Restore
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
