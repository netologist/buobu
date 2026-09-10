"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type DetailSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
};

export function DetailSheet({ open, onClose, title, icon, children }: DetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:w-[560px] sm:max-w-[560px] p-0 flex flex-col gap-0"
      >
        <SheetHeader className="px-5 py-4 border-b flex-row items-center gap-2 shrink-0">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <SheetTitle className="text-base font-semibold line-clamp-1 flex-1 text-left">
            {title}
          </SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="sm" className="size-7 p-0 shrink-0">
              <X className="size-4" />
            </Button>
          </SheetClose>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-4 space-y-5">
            {children}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
