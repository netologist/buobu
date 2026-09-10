"use client";

import Link from "next/link";
import { MonitorSmartphone } from "lucide-react";

import { useIsMobile } from "@/hooks/useIsMobile";

/**
 * Wraps content that should only be shown on desktop.
 * On mobile (< md) renders a friendly "desktop only" placeholder.
 *
 * Usage:
 *   <MobileResourceGate>
 *     <YourDesktopOnlyBoard />
 *   </MobileResourceGate>
 *
 * The children are hidden via CSS on mobile so they don't mount on the server
 * in a broken state — they simply aren't visible.
 */
export function MobileResourceGate({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <>
      {/* Mobile placeholder — only shown on mobile */}
      {isMobile && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center md:hidden">
          <MonitorSmartphone className="h-12 w-12 text-muted-foreground/50" strokeWidth={1.5} />
          <div className="space-y-1.5">
            <p className="text-base font-medium text-foreground">
              Bu görünüm masaüstü için tasarlanmıştır
            </p>
            <p className="text-sm text-muted-foreground">
              Daha iyi bir deneyim için bilgisayarından aç.
            </p>
          </div>
          <Link
            href="/tasks/list-view"
            className="inline-flex h-11 items-center rounded-lg bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-80"
          >
            Tasks&apos;a git
          </Link>
        </div>
      )}

      {/* Desktop content — hidden on mobile */}
      <div className={isMobile ? "hidden" : "contents"}>{children}</div>
    </>
  );
}
