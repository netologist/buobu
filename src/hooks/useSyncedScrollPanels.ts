import { useCallback, useEffect, useRef, type DependencyList } from "react";

type UseSyncedScrollPanelsOptions = {
  deps?: DependencyList;
  selector?: string;
  preserveScrollPosition?: boolean;
  rightPanelMode?: "minHeight" | "marginBottom";
  rightPanelOffset?: number;
};

export function useSyncedScrollPanels({
  deps = [],
  selector = "[data-swimlane-id]",
  preserveScrollPosition = false,
  rightPanelMode = "minHeight",
  rightPanelOffset = 0,
}: UseSyncedScrollPanelsOptions = {}) {
  const middlePanelRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const isSyncingScroll = useRef(false);
  const depsSignature = JSON.stringify(deps);

  const handleMiddleScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;

    if (middlePanelRef.current && rightPanelRef.current) {
      rightPanelRef.current.scrollTop = middlePanelRef.current.scrollTop;
    }

    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, []);

  const handleRightScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;

    if (rightPanelRef.current && middlePanelRef.current) {
      middlePanelRef.current.scrollTop = rightPanelRef.current.scrollTop;
    }

    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, []);

  useEffect(() => {
    const middleEl = middlePanelRef.current;
    const rightEl = rightPanelRef.current;
    if (!middleEl || !rightEl || typeof ResizeObserver === "undefined") return;

    let frameId: number | null = null;
    let requestedFullSync = false;
    const pendingLaneIds = new Set<string>();

    const syncHeights = (laneIds?: Set<string>) => {
      const savedMiddleScroll = middleEl.scrollTop;
      const savedRightScroll = rightEl.scrollTop;
      if (preserveScrollPosition) {
        isSyncingScroll.current = true;
      }

      const middleMap = new Map<string, HTMLElement>();
      const rightMap = new Map<string, HTMLElement>();

      middleEl.querySelectorAll<HTMLElement>(selector).forEach((node) => {
        const id = node.dataset.swimlaneId;
        if (id) middleMap.set(id, node);
      });
      rightEl.querySelectorAll<HTMLElement>(selector).forEach((node) => {
        const id = node.dataset.swimlaneId;
        if (id) rightMap.set(id, node);
      });

      const idsToSync = laneIds && laneIds.size > 0
        ? Array.from(laneIds)
        : Array.from(new Set([...middleMap.keys(), ...rightMap.keys()]));

      idsToSync.forEach((id) => {
        const middleNode = middleMap.get(id);
        const rightNode = rightMap.get(id);

        if (middleNode?.style.minHeight) {
          middleNode.style.minHeight = "";
        }
        if (rightNode?.style.minHeight) {
          rightNode.style.minHeight = "";
        }
        if (rightNode?.style.marginBottom) {
          rightNode.style.marginBottom = "";
        }
      });

      void middleEl.offsetHeight;

      idsToSync.forEach((id) => {
        const middleNode = middleMap.get(id);
        const rightNode = rightMap.get(id);
        const middleHeight = middleNode?.offsetHeight ?? 0;
        const rightHeight = rightNode?.offsetHeight ?? 0;
        const nextHeight = Math.max(middleHeight, rightHeight);

        if (middleNode && nextHeight > 0) {
          middleNode.style.minHeight = `${nextHeight}px`;
        }

        if (!rightNode || nextHeight === 0) return;

        if (rightPanelMode === "marginBottom") {
          const diff = nextHeight - rightHeight;
          rightNode.style.marginBottom = diff > 0 ? `${diff + rightPanelOffset}px` : "";
          return;
        }

        rightNode.style.minHeight = `${nextHeight}px`;
      });

      if (preserveScrollPosition) {
        middleEl.scrollTop = savedMiddleScroll;
        rightEl.scrollTop = savedRightScroll;
        requestAnimationFrame(() => {
          isSyncingScroll.current = false;
        });
      }
    };

    const scheduleHeightSync = (laneIds?: Iterable<string>) => {
      if (laneIds === undefined) {
        requestedFullSync = true;
        pendingLaneIds.clear();
      } else if (!requestedFullSync) {
        for (const laneId of laneIds) {
          pendingLaneIds.add(laneId);
        }
      }

      if (frameId !== null) return;

      frameId = requestAnimationFrame(() => {
        frameId = null;
        const ids = requestedFullSync ? undefined : new Set(pendingLaneIds);
        requestedFullSync = false;
        pendingLaneIds.clear();
        syncHeights(ids);
      });
    };

    const observer = new ResizeObserver((entries) => {
      const changedLaneIds = new Set<string>();

      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        const laneId = target.dataset.swimlaneId;
        if (!laneId) {
          scheduleHeightSync();
          return;
        }
        changedLaneIds.add(laneId);
      }

      scheduleHeightSync(changedLaneIds);
    });

    observer.observe(middleEl);
    observer.observe(rightEl);

    [
      ...Array.from(middleEl.querySelectorAll<HTMLElement>(selector)),
      ...Array.from(rightEl.querySelectorAll<HTMLElement>(selector)),
    ].forEach((node) => observer.observe(node));

    scheduleHeightSync();

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      observer.disconnect();
    };
  }, [depsSignature, preserveScrollPosition, rightPanelMode, rightPanelOffset, selector]);

  return {
    middlePanelRef,
    rightPanelRef,
    handleMiddleScroll,
    handleRightScroll,
  };
}
