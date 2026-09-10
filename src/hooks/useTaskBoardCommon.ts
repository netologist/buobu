import { useMemo } from "react";
import { DEFAULT_ARCHIVE_COLUMN_ID } from "@/lib/constants";
import type { Board, NamingLabels, Routine, Swimlane } from "@/lib/types";

type UseTaskBoardCommonParams = {
  board: Board | undefined;
  labels: Pick<NamingLabels, "swimlane" | "swimlanePlural">;
  selectedSwimlaneIds: Set<string>;
  swimlanes: Swimlane[];
  routines: Routine[];
};

export function useTaskBoardCommon({
  board,
  labels,
  selectedSwimlaneIds,
  swimlanes,
  routines,
}: UseTaskBoardCommonParams) {
  const routineTitleById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const routine of routines) {
      map[routine.id] = routine.title;
    }
    return map;
  }, [routines]);

  const swimlaneCurrencyMap = useMemo(() => {
    const entries = swimlanes.map((lane) => [lane.id, lane.currency] as const);
    return Object.fromEntries(entries);
  }, [swimlanes]);

  const swimlanePomodoroMap = useMemo(() => {
    const entries = swimlanes.map((lane) => [
      lane.id,
      { work: lane.pomodoroMinutes ?? 25, rest: lane.breakMinutes ?? 5 },
    ] as const);
    return Object.fromEntries(entries);
  }, [swimlanes]);

  const archiveColumnId = useMemo(
    () => board?.archiveColumnId ?? DEFAULT_ARCHIVE_COLUMN_ID,
    [board?.archiveColumnId],
  );

  const middlePanelHeaderLabel = useMemo(() => {
    if (selectedSwimlaneIds.size === 0) {
      return board?.name ?? labels.swimlanePlural;
    }
    if (selectedSwimlaneIds.size === 1) {
      const selected = swimlanes.find((lane) => selectedSwimlaneIds.has(lane.id));
      return selected?.name ?? `Selected ${labels.swimlane}`;
    }
    return `${selectedSwimlaneIds.size} ${labels.swimlanePlural}`;
  }, [board?.name, labels.swimlane, labels.swimlanePlural, selectedSwimlaneIds, swimlanes]);

  return {
    routineTitleById,
    swimlaneCurrencyMap,
    swimlanePomodoroMap,
    archiveColumnId,
    middlePanelHeaderLabel,
  };
}
