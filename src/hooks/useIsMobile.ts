import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768; // matches Tailwind's `md`

function subscribe(callback: () => void) {
  const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
}

function getServerSnapshot() {
  return false;
}

/**
 * SSR-safe hook that returns `true` when the viewport is narrower than the
 * mobile breakpoint (< 768px, i.e. below Tailwind's `md`).
 *
 * Defaults to `false` on the server so hydration is consistent.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

