import type { Board, BoardColumn, Swimlane, Task } from "@/lib/types";

export type ListSectionTask = {
  task: Task;
  board: Board | null;
  swimlane: Swimlane | null;
};

export type ListSection = {
  /** Unique column id used for the droppable target. */
  columnId: string;
  title: string;
  tasks: ListSectionTask[];
};

type BuildListSectionsArgs = {
  /** Boards currently in scope (e.g. activeBoards or [board] when single). */
  boards: Board[];
  /** Tasks already filtered by selection (board / swimlane / archived state). */
  tasks: Task[];
  /** All swimlanes (for swimlane lookup on each task). */
  swimlanes: Swimlane[];
  /** Column id used for the archive bucket — excluded from the section list. */
  archiveColumnId: string | null;
};

/**
 * Build Todoist-style sections grouped by deduplicated column id across the
 * provided boards. Tasks within a section come from any swimlane; their
 * board/swimlane context is preserved on `ListSectionTask`.
 */
export function buildListSections({
  boards,
  tasks,
  swimlanes,
  archiveColumnId,
}: BuildListSectionsArgs): ListSection[] {
  const orderedColumns: BoardColumn[] = [];
  const seenColumnIds = new Set<string>();

  for (const board of boards) {
    for (const column of board.columns ?? []) {
      if (archiveColumnId && column.id === archiveColumnId) continue;
      if (seenColumnIds.has(column.id)) continue;
      seenColumnIds.add(column.id);
      orderedColumns.push(column);
    }
  }

  const boardById = new Map(boards.map((board) => [board.id, board] as const));
  const swimlaneById = new Map(swimlanes.map((swimlane) => [swimlane.id, swimlane] as const));

  const tasksByColumn = new Map<string, ListSectionTask[]>();
  for (const task of tasks) {
    if (archiveColumnId && task.columnId === archiveColumnId) continue;
    if (!seenColumnIds.has(task.columnId)) continue;
    const list = tasksByColumn.get(task.columnId) ?? [];
    list.push({
      task,
      board: boardById.get(task.boardId) ?? null,
      swimlane: swimlaneById.get(task.swimlaneId) ?? null,
    });
    tasksByColumn.set(task.columnId, list);
  }

  for (const list of tasksByColumn.values()) {
    list.sort((a, b) => {
      const ao = a.task.order ?? 0;
      const bo = b.task.order ?? 0;
      if (ao !== bo) return ao - bo;
      return a.task.title.localeCompare(b.task.title);
    });
  }

  return orderedColumns.map((column) => ({
    columnId: column.id,
    title: column.title,
    tasks: tasksByColumn.get(column.id) ?? [],
  }));
}
