"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChecklistSection } from "@/components/kanban/task-detail/ChecklistSection";
import { CommentsSection } from "@/components/kanban/task-detail/CommentsSection";
import { TaskMetadataSection } from "@/components/kanban/task-detail/TaskMetadataSection";
import { TaskDetailProvider } from "@/components/kanban/task-detail/TaskDetailContext";
import { TransactionsSection } from "@/components/kanban/task-detail/TransactionsSection";
import { WorklogSection } from "@/components/kanban/task-detail/WorklogSection";
import type { TaskDetailModel } from "@/components/kanban/task-detail/types";
import { useBoardConfig } from "@/contexts/BoardConfigContext";
import type { Board, Swimlane } from "@/lib/types";

type TaskDetailPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: TaskDetailModel;
  isReadOnly: boolean;
  swimlaneCurrency: string;
  /** All boards available for selection in the board combobox. */
  boards: Board[];
  /** All swimlanes available for selection in the swimlane combobox. */
  swimlanes: Swimlane[];
  onArchiveTask?: () => void;
  onDeleteTask?: () => void;
  onCancel?: () => void;
  onSave: () => void;
  saveLabel?: string;
};

export function TaskDetailPanel({
  open,
  onOpenChange,
  model,
  isReadOnly,
  swimlaneCurrency,
  boards,
  swimlanes,
  onArchiveTask,
  onDeleteTask,
  onCancel,
  onSave,
  saveLabel = "Save",
}: TaskDetailPanelProps) {
  const { archiveColumnId } = useBoardConfig();
  const draftTask = model.draftTask;
  const canArchive =
    Boolean(onArchiveTask) &&
    draftTask?.columnId === archiveColumnId &&
    !draftTask?.archived;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[98vw] max-w-[98vw] overflow-y-auto sm:w-175 sm:max-w-175">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
        </DialogHeader>
        {!draftTask ? (
          <div className="text-sm text-muted-foreground">Task not found.</div>
        ) : (
          <TaskDetailProvider
            model={model}
            isReadOnly={isReadOnly}
            swimlaneCurrency={swimlaneCurrency}
            boards={boards}
            swimlanes={swimlanes}
          >
            <div className="space-y-6">
              <Tabs defaultValue="details" className="min-h-140">
                <TabsList className="grid w-full grid-cols-5 rounded-lg bg-muted/40 p-1">
                  <TabsTrigger
                    value="details"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="checklists"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Checklists
                  </TabsTrigger>
                  <TabsTrigger
                    value="comments"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Comments
                  </TabsTrigger>
                  <TabsTrigger
                    value="worklog"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Worklog
                  </TabsTrigger>
                  <TabsTrigger
                    value="transactions"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Transactions
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-4 space-y-6">
                  <TaskMetadataSection />
                </TabsContent>
                <TabsContent value="checklists" className="mt-4 space-y-6">
                  <ChecklistSection />
                </TabsContent>
                <TabsContent value="comments" className="mt-4 space-y-6">
                  <CommentsSection />
                </TabsContent>
                <TabsContent value="worklog" className="mt-4 space-y-6">
                  <WorklogSection />
                </TabsContent>
                <TabsContent value="transactions" className="mt-4 space-y-6">
                  <TransactionsSection />
                </TabsContent>
              </Tabs>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  {canArchive && (
                    <Button
                      onClick={onArchiveTask}
                      className="bg-amber-500 text-amber-950 hover:bg-amber-400 dark:bg-amber-600 dark:text-amber-50 dark:hover:bg-amber-500"
                    >
                      Move to Archive
                    </Button>
                  )}
                  {!isReadOnly && onDeleteTask && (
                    <Button variant="destructive" onClick={onDeleteTask}>
                      Delete
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {onCancel && (
                    <Button variant="ghost" onClick={onCancel}>
                      Cancel
                    </Button>
                  )}
                  <Button onClick={onSave} disabled={isReadOnly}>
                    {saveLabel}
                  </Button>
                </div>
              </div>
            </div>
          </TaskDetailProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
