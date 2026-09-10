"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768; // matches Tailwind's `md`

/**
 * SSR-safe hook that returns `true` when the viewport is narrower than the
 * mobile breakpoint (< 768px, i.e. below Tailwind's `md`).
 *
 * Defaults to `false` on the server so hydration is consistent.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    // Set initial value after mount (client-only)
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
