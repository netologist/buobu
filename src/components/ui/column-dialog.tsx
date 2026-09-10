"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nanoid } from "nanoid";
import type { BoardColumn } from "@/lib/types";

export type ColumnDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column?: BoardColumn | null;
  onSave: (column: BoardColumn) => void | Promise<void>;
};

export function ColumnDialog({ open, onOpenChange, column, onSave }: ColumnDialogProps) {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(column?.title ?? "");
      setIsSubmitting(false);
    }
  }, [open, column]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const columnData: BoardColumn = {
        id: column?.id ?? nanoid(),
        title: title.trim(),
        order: column?.order ?? 0,
      };
      await onSave(columnData);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save column:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{column ? "Edit Column" : "Add Column"}</DialogTitle>
          <DialogDescription>
            {column ? "Update the column name." : "Create a new column for your board."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Column Name</Label>
              <Input
                id="title"
                placeholder="e.g., In Progress"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? "Saving..." : column ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
