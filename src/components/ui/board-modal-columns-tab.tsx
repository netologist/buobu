"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ColumnDialog } from "@/components/ui/column-dialog";
import { ColumnListItem } from "@/components/ui/column-list-item";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  deleteTask,
} from "@/lib/db";
import type { BoardColumn } from "@/lib/types";
import {
  analyzeColumnTasksForBoard,
  type ColumnTaskGroup,
} from "@/lib/kanban/columnTaskAnalysis";

export interface ColumnsTabContentProps {
  boardId: string | null;
  isEditMode: boolean;
  columns: BoardColumn[];
  archiveColumnId: string;
  showArchiveColumn: boolean;
  columnsError?: string;
  archiveColumnError?: string;
  onColumnsChange: (columns: BoardColumn[]) => void;
  onArchiveColumnIdChange: (id: string) => void;
  onShowArchiveColumnChange: (show: boolean) => void;
  onSave?: (overrides?: {
    columns?: BoardColumn[];
    archiveColumnId?: string;
    showArchiveColumn?: boolean;
  }) => Promise<void>;
}

export function ColumnsTabContent({
  boardId,
  isEditMode,
  columns,
  archiveColumnId,
  showArchiveColumn,
  columnsError,
  archiveColumnError,
  onColumnsChange,
  onArchiveColumnIdChange,
  onShowArchiveColumnChange,
  onSave,
}: ColumnsTabContentProps) {
  const [editingColumn, setEditingColumn] = useState<BoardColumn | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);
  const [deleteColumnTaskGroups, setDeleteColumnTaskGroups] = useState<ColumnTaskGroup[]>([]);
  const [deleteColumnTaskIds, setDeleteColumnTaskIds] = useState<string[]>([]);
  const [isDeleteAnalysisLoading, setIsDeleteAnalysisLoading] = useState(false);
  const [isForceDeleting, setIsForceDeleting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: { active: { id: unknown }; over: { id: unknown } | null }) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = columns.findIndex((col) => col.id === active.id);
      const newIndex = columns.findIndex((col) => col.id === over.id);
      const reordered = arrayMove(columns, oldIndex, newIndex).map((col, idx) => ({
        ...col,
        order: idx,
      }));
      onColumnsChange(reordered);
      if (isEditMode && onSave) {
        void onSave({ columns: reordered, archiveColumnId, showArchiveColumn });
      }
    },
    [columns, archiveColumnId, showArchiveColumn, isEditMode, onColumnsChange, onSave],
  );

  async function analyzeColumnTasks(columnId: string) {
    if (!boardId) {
      setDeleteColumnTaskGroups([]);
      setDeleteColumnTaskIds([]);
      return;
    }
    setIsDeleteAnalysisLoading(true);
    try {
      const { taskGroups, taskIds } = await analyzeColumnTasksForBoard(boardId, columnId);
      setDeleteColumnTaskGroups(taskGroups);
      setDeleteColumnTaskIds(taskIds);
    } catch (error) {
      console.error("Failed to analyse column tasks:", error);
      setDeleteColumnTaskGroups([]);
      setDeleteColumnTaskIds([]);
    } finally {
      setIsDeleteAnalysisLoading(false);
    }
  }

  async function handleRequestDeleteColumn(columnId: string) {
    setDeleteColumnId(columnId);
    setDeleteColumnTaskGroups([]);
    setDeleteColumnTaskIds([]);
    if (isEditMode) await analyzeColumnTasks(columnId);
  }

  async function handleSaveColumn(columnData: BoardColumn) {
    let nextColumns: BoardColumn[];
    if (editingColumn) {
      nextColumns = columns.map((col) =>
        col.id === columnData.id ? { ...columnData, order: col.order } : col,
      );
    } else {
      nextColumns = [...columns, { ...columnData, order: columns.length }];
    }
    onColumnsChange(nextColumns);
    setIsDialogOpen(false);
    setEditingColumn(null);
    if (isEditMode && onSave) {
      await onSave({ columns: nextColumns, archiveColumnId, showArchiveColumn });
    }
  }

  async function handleDeleteColumn(columnId: string) {
    if (columns.length <= 1 || archiveColumnId === columnId) return;
    const nextColumns = columns.filter((col) => col.id !== columnId);
    onColumnsChange(nextColumns);
    setDeleteColumnId(null);
    if (isEditMode && onSave) {
      await onSave({ columns: nextColumns, archiveColumnId, showArchiveColumn });
    }
  }

  async function handleForceDeleteColumn(columnId: string) {
    if (!boardId || archiveColumnId === columnId) return;
    setIsForceDeleting(true);
    try {
      await Promise.all(deleteColumnTaskIds.map((id) => deleteTask(id)));
      await handleDeleteColumn(columnId);
    } catch (error) {
      console.error("Failed to force delete column:", error);
    } finally {
      setIsForceDeleting(false);
    }
  }

  async function handleArchiveColumnChange(next: string) {
    onArchiveColumnIdChange(next);
    if (isEditMode && onSave) await onSave({ columns, archiveColumnId: next, showArchiveColumn });
  }

  async function handleShowArchiveColumnChange(checked: boolean) {
    onShowArchiveColumnChange(checked);
    if (isEditMode && onSave) await onSave({ columns, archiveColumnId, showArchiveColumn: checked });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Kanban Columns</h3>
          <p className="text-sm text-muted-foreground">Drag to reorder</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingColumn(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Column
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Archive Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-4">
              <Label htmlFor="archiveColumn" className="min-w-32.5 text-sm">
                Archive Column
              </Label>
              <Select value={archiveColumnId} onValueChange={handleArchiveColumnChange}>
                <SelectTrigger id="archiveColumn" className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {archiveColumnError && (
              <p className="text-xs text-destructive">{archiveColumnError}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Label htmlFor="showArchive" className="min-w-32.5 text-sm">
              Show Archive Column
            </Label>
            <Checkbox
              id="showArchive"
              checked={showArchiveColumn}
              onCheckedChange={(checked) => {
                void handleShowArchiveColumnChange(checked === true);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={columns.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="max-h-75 space-y-2 overflow-y-auto">
              {columns.map((column) => (
                <ColumnListItem
                  key={column.id}
                  column={column}
                  isArchiveColumn={column.id === archiveColumnId}
                  onEdit={(col) => {
                    setEditingColumn(col);
                    setIsDialogOpen(true);
                  }}
                  onDelete={(id) => {
                    void handleRequestDeleteColumn(id);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {columnsError && <p className="text-xs text-destructive">{columnsError}</p>}
      </div>

      <ColumnDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        column={editingColumn}
        onSave={handleSaveColumn}
      />

      <Dialog
        open={!!deleteColumnId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteColumnId(null);
            setDeleteColumnTaskGroups([]);
            setDeleteColumnTaskIds([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Column</DialogTitle>
            <DialogDescription>
              {deleteColumnId === archiveColumnId
                ? "This column is the archive column and cannot be deleted."
                : isDeleteAnalysisLoading
                  ? "Checking tasks in this column…"
                  : deleteColumnTaskIds.length > 0
                    ? "This column has active tasks. Force-delete will remove the column and all listed tasks."
                    : "Are you sure you want to delete this column?"}
            </DialogDescription>
          </DialogHeader>

          {!isDeleteAnalysisLoading && deleteColumnTaskGroups.length > 0 && (
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border p-3">
              {deleteColumnTaskGroups.map((group) => (
                <div key={group.swimlaneId}>
                  <p className="text-sm font-medium">
                    {group.swimlaneName} ({group.tasks.length})
                  </p>
                  <ul className="ml-4 list-disc text-sm text-muted-foreground">
                    {group.tasks.map((task) => (
                      <li key={task.id}>{task.title}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteColumnId(null)}>
              {deleteColumnId === archiveColumnId ? "Close" : "Cancel"}
            </Button>
            {deleteColumnId !== archiveColumnId && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (!deleteColumnId) return;
                  if (deleteColumnTaskIds.length > 0) {
                    void handleForceDeleteColumn(deleteColumnId);
                  } else {
                    void handleDeleteColumn(deleteColumnId);
                  }
                }}
                disabled={columns.length <= 1 || isDeleteAnalysisLoading || isForceDeleting}
              >
                {isForceDeleting
                  ? "Deleting…"
                  : deleteColumnTaskIds.length > 0
                    ? `Force Delete (${deleteColumnTaskIds.length} tasks)`
                    : "Delete"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
