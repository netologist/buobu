"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ReorderModalProps<TItem> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: TItem[];
  getItemId: (item: TItem) => string;
  renderItem: (item: TItem) => ReactNode;
  onSave: (orderedItems: TItem[]) => Promise<void>;
  emptyMessage: string;
  singleItemHint: string;
  saveLabel?: string;
  minItemsToEnableSave?: number;
};

export function ReorderModal<TItem>({
  open,
  onOpenChange,
  title,
  items,
  getItemId,
  renderItem,
  onSave,
  emptyMessage,
  singleItemHint,
  saveLabel = "Save Order",
  minItemsToEnableSave = 1,
}: ReorderModalProps<TItem>) {
  const [draftItems, setDraftItems] = useState<TItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraftItems(items);
    setError(null);
  }, [open, items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraftItems((prev) => {
      const oldIndex = prev.findIndex((item) => getItemId(item) === active.id);
      const newIndex = prev.findIndex((item) => getItemId(item) === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(draftItems);
      onOpenChange(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Order could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = draftItems.length >= minItemsToEnableSave;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto py-2 pr-1">
          {draftItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : draftItems.length === 1 ? (
            <>
              {renderItem(draftItems[0])}
              <p className="pt-2 text-center text-xs text-muted-foreground">{singleItemHint}</p>
            </>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={draftItems.map((item) => getItemId(item))}
                strategy={verticalListSortingStrategy}
              >
                {draftItems.map((item) => renderItem(item))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || !canSave}>
            {saving ? "Saving..." : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
