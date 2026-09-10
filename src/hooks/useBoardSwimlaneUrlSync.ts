"use client";

import { useEffect, useRef } from "react";
import {
  useSwimlaneSelectionStore,
  parseSelection,
} from "@/stores/swimlane-selection-store";

/**
 * Syncs board/swimlane selection state to/from the URL.
 *
 * All section pages (query-param-based):
 *   ?board=<boardId>&swimlanes=<s1,s2>
 *
 * Priority: URL > localStorage. On mount the URL wins when a boardId is present.
 * All URL writes use window.history.replaceState (no new history entry).
 */
export function useBoardSwimlaneUrlSync(): void {
  const selectBoard = useSwimlaneSelectionStore((s) => s.selectBoard);
  const toggleSwimlane = useSwimlaneSelectionStore((s) => s.toggleSwimlane);
  const selections = useSwimlaneSelectionStore((s) => s.selections);

  // On mount: read boardId / swimlanes from URL.
  const hasSyncedFromUrl = useRef(false);
  useEffect(() => {
    if (hasSyncedFromUrl.current) return;
    hasSyncedFromUrl.current = true;

    const searchParams = new URLSearchParams(globalThis.location.search);
    const boardId = searchParams.get("board");

    if (!boardId) return;

    const swimlanesParam = searchParams.get("swimlanes");
    if (swimlanesParam) {
      const ids = swimlanesParam.split(",").filter(Boolean);
      selectBoard(boardId);
      for (const id of ids) {
        toggleSwimlane(boardId, id);
      }
    } else {
      selectBoard(boardId);
    }
  // Only run on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync store selection → URL whenever it changes.
  const hasUrlSyncHydrated = useRef(false);
  useEffect(() => {
    if (!hasUrlSyncHydrated.current) {
      hasUrlSyncHydrated.current = true;
      return;
    }

    const params = new URLSearchParams(globalThis.location.search);

    if (!selections.length || selections[0] === "*:*") {
      params.delete("board");
      params.delete("swimlanes");
    } else {
      const first = parseSelection(selections[0]);
      params.set("board", first.boardId);

      const swimlaneIds = selections
        .map(parseSelection)
        .filter((p) => p.swimlaneId !== "*")
        .map((p) => p.swimlaneId);

      if (swimlaneIds.length > 0) {
        params.set("swimlanes", swimlaneIds.join(","));
      } else {
        params.delete("swimlanes");
      }
    }

    const newSearch = params.toString();
    const currentSearch = globalThis.location.search.replace(/^\?/, "");
    if (newSearch !== currentSearch) {
      globalThis.history.replaceState(
        null,
        "",
        newSearch ? `?${newSearch}` : globalThis.location.pathname
      );
    }
  }, [selections]);
}

