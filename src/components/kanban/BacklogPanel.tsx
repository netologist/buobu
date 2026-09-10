"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { BacklogItem } from "@/lib/types";

type BacklogPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  backlogInput: string;
  setBacklogInput: (value: string) => void;
  items: BacklogItem[];
  onAddItem: () => void | Promise<void>;
  onMoveToBoard: (item: BacklogItem) => void | Promise<void>;
  onRemoveItem: (itemId: string) => void | Promise<void>;
};

export function BacklogPanel({
  open,
  onOpenChange,
  title,
  backlogInput,
  setBacklogInput,
  items,
  onAddItem,
  onMoveToBoard,
  onRemoveItem,
}: BacklogPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add backlog item"
              value={backlogInput}
              onChange={(event) => setBacklogInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void onAddItem();
                }
              }}
            />
            <Button type="button" onClick={() => void onAddItem()}>
              Add
            </Button>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No backlog items yet.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-relaxed">{item.text}</p>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void onMoveToBoard(item)}
                      >
                        Move to board
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void onRemoveItem(item.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
