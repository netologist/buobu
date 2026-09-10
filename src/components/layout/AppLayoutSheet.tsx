import type { ComponentProps, ReactNode } from "react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

type AppLayoutSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: ComponentProps<typeof SheetContent>["side"];
  title: string;
  className?: string;
  children: ReactNode;
};

export function AppLayoutSheet({
  open,
  onOpenChange,
  side = "left",
  title,
  className,
  children,
}: AppLayoutSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={className}>
        <SheetTitle className="sr-only">{title}</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
