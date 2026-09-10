"use client";

import { useEffect, useState } from "react";

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

type PromptDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  submitText?: string;
  cancelText?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  onOpenChange?: (open: boolean) => void;
};

export function PromptDialog({
  open,
  title,
  description,
  placeholder,
  defaultValue,
  submitText = "Continue",
  cancelText = "Cancel",
  onSubmit,
  onCancel,
  onOpenChange,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue ?? "");

  useEffect(() => {
    if (open) {
      setValue(defaultValue ?? "");
    }
  }, [open, defaultValue]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange?.(nextOpen);
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(value);
          }}
          className="space-y-4"
        >
          <Input
            autoFocus
            placeholder={placeholder}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {cancelText}
            </Button>
            <Button type="submit">{submitText}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
