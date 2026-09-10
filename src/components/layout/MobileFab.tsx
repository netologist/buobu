"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface MobileFabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label describing the action */
  "aria-label": string;
  icon: React.ReactNode;
}

/**
 * Floating action button — visible only on mobile (< md).
 * Positioned above the bottom navigation bar (bottom-20 = 80px).
 * Size 56×56px, round, with shadow.
 */
export const MobileFab = forwardRef<HTMLButtonElement, MobileFabProps>(
  function MobileFab({ icon, className, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "fixed bottom-20 right-4 z-30",
          "flex h-14 w-14 items-center justify-center rounded-full shadow-lg",
          "bg-foreground text-background",
          "transition-transform active:scale-95",
          "md:hidden",
          className,
        )}
        {...props}
      >
        {icon}
      </button>
    );
  },
);
