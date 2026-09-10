import { useCallback, useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

import { applyTaskDrop } from "@/lib/kanban/taskUtils";
import type { Task } from "@/lib/types";

type UseTaskBoardDragAndDropArgs = {
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  archiveColumnId: string;
  persistTask: (task: Task) => Promise<unknown> | unknown;
  persistTasks?: (tasks: Task[]) => Promise<unknown> | unknown;
  primaryScrollRef?: RefObject<HTMLDivElement | null>;
  secondaryScrollRef?: RefObject<HTMLDivElement | null>;
};

export function useTaskBoardDragAndDrop({
  tasks,
  setTasks,
  archiveColumnId,
  persistTask,
  persistTasks,
  primaryScrollRef,
  secondaryScrollRef,
}: UseTaskBoardDragAndDropArgs) {
  const [activeDragTaskId, setActiveDragTaskId] = useState<string | null>(null);
  const savedScrollTop = useRef(0);
  const pendingPersistMap = useRef(new Map<string, Task>());
  const scheduledFlushId = useRef<ReturnType<typeof setTimeout> | number | null>(null);
  const scheduledWithIdleCallback = useRef(false);

  const restoreScrollPosition = () => {
    const scrollTop = savedScrollTop.current;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (primaryScrollRef?.current) {
          primaryScrollRef.current.scrollTop = scrollTop;
        }
        if (secondaryScrollRef?.current) {
          secondaryScrollRef.current.scrollTop = scrollTop;
        }
      });
    });
  };

  const flushPersistQueue = useCallback(() => {
    if (scheduledFlushId.current !== null) {
      if (scheduledWithIdleCallback.current && typeof globalThis.cancelIdleCallback === "function") {
        globalThis.cancelIdleCallback(scheduledFlushId.current as number);
      } else {
        clearTimeout(scheduledFlushId.current as ReturnType<typeof setTimeout>);
      }
      scheduledFlushId.current = null;
      scheduledWithIdleCallback.current = false;
    }

    const queuedTasks = Array.from(pendingPersistMap.current.values());
    pendingPersistMap.current.clear();
    if (queuedTasks.length === 0) return;

    if (persistTasks) {
      void persistTasks(queuedTasks);
      return;
    }

    queuedTasks.forEach((task) => {
      void persistTask(task);
    });
  }, [persistTask, persistTasks]);

  const schedulePersistQueue = useCallback((tasksToPersist: Task[]) => {
    tasksToPersist.forEach((task) => {
      pendingPersistMap.current.set(task.id, task);
    });

    if (scheduledFlushId.current !== null) return;

    if (typeof globalThis.requestIdleCallback === "function") {
      scheduledWithIdleCallback.current = true;
      scheduledFlushId.current = globalThis.requestIdleCallback(() => {
        scheduledFlushId.current = null;
        scheduledWithIdleCallback.current = false;
        flushPersistQueue();
      }, { timeout: 500 });
      return;
    }

    scheduledWithIdleCallback.current = false;
    scheduledFlushId.current = setTimeout(() => {
      scheduledFlushId.current = null;
      flushPersistQueue();
    }, 0);
  }, [flushPersistQueue]);

  useEffect(() => () => {
    flushPersistQueue();
  }, [flushPersistQueue]);

  const handleDragStart = ({ active }: DragStartEvent) => {
    savedScrollTop.current = primaryScrollRef?.current?.scrollTop ?? secondaryScrollRef?.current?.scrollTop ?? 0;
    setActiveDragTaskId(String(active.id));
  };

  const handleDragCancel = () => {
    setActiveDragTaskId(null);
    restoreScrollPosition();
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragTaskId(null);

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (!over) {
      restoreScrollPosition();
      return;
    }

    const result = applyTaskDrop({
      tasks,
      taskId: String(active.id),
      target: String(over.id),
    });
    if (!result) {
      restoreScrollPosition();
      return;
    }

    const {
      updatedTasks,
      updatedMap,
      movedTask,
      previousColumnId,
      nextColumnId,
    } = result;

    setTasks(updatedTasks);
    restoreScrollPosition();

    const movedToDone = nextColumnId === archiveColumnId;
    const movedOutOfDone = previousColumnId === archiveColumnId && nextColumnId !== archiveColumnId;
    const tasksToPersist = Array.from(updatedMap.values()).map((value) => {
      const completedAt =
        value.id === movedTask.id
          ? movedToDone
            ? new Date().toISOString()
            : movedOutOfDone
              ? null
              : value.completedAt ?? null
          : value.completedAt ?? null;

      return { ...value, completedAt };
    });

    schedulePersistQueue(tasksToPersist);
  };

  return {
    activeDragTaskId,
    handleDragStart,
    handleDragCancel,
    handleDragEnd,
  };
}
