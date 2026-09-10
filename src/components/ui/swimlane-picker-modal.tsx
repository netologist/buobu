"use client";

import type { Swimlane } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNaming } from "@/contexts/NamingContext";

interface SwimlanePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swimlanes: Swimlane[];
  selectedSwimlaneIds: Set<string>;
  onSelect: (swimlaneId: string) => void;
  title?: string;
}

export function SwimlanePickerModal({
  open,
  onOpenChange,
  swimlanes,
  selectedSwimlaneIds,
  onSelect,
  title,
}: SwimlanePickerModalProps) {
  const { labels } = useNaming();
  const defaultTitle = `Select ${labels.swimlane}`;
  const modalTitle = title ?? defaultTitle;
  const filteredSwimlanes = selectedSwimlaneIds.size === 0
    ? swimlanes
    : swimlanes.filter((s) => selectedSwimlaneIds.has(s.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-sm">{modalTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          {filteredSwimlanes.map((swimlane) => (
            <button
              key={swimlane.id}
              onClick={() => {
                onSelect(swimlane.id);
                onOpenChange(false);
              }}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: swimlane.color || "#888" }}
              />
              <span>{swimlane.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
