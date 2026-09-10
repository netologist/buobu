"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { STORAGE_KEYS } from "@/lib/constants";

/** Only these section prefixes are valid last-visited destinations. */
const VALID_SECTION_PREFIXES = [
  "/tasks",
  "/habits",
  "/notes",
  "/bookmarks",
  "/mindmaps",
  "/whiteboards",
  "/routines",
  "/timeblocks",
  "/home",
];

function shouldPersist(pathname: string): boolean {
  return VALID_SECTION_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function useLastVisitedPath(): void {
  const pathname = usePathname();

  useEffect(() => {
    if (shouldPersist(pathname)) {
      // Persist the full href (including query string) so deep links restore.
      // We intentionally avoid useSearchParams() here: this hook runs inside a
      // root-layout provider that wraps every page (including /404), and an
      // unsuspended useSearchParams() forces a static-export prerender failure.
      localStorage.setItem(STORAGE_KEYS.LAST_VISITED_PATH, globalThis.location.href);
    }
  }, [pathname]);
}
