import { useEffect, useMemo, useState, type RefObject } from "react";

type UseVirtualizedListRangeOptions = {
  scrollRef: RefObject<HTMLElement | null>;
  itemCount: number;
  itemHeightEstimate?: number;
  overscan?: number;
  enabled?: boolean;
};

type VirtualizedListRange = {
  startIndex: number;
  endIndex: number;
  isIndexVisible: (index: number) => boolean;
};

function calculateRange({
  scrollTop,
  viewportHeight,
  itemCount,
  itemHeightEstimate,
  overscan,
}: {
  scrollTop: number;
  viewportHeight: number;
  itemCount: number;
  itemHeightEstimate: number;
  overscan: number;
}) {
  if (itemCount === 0) {
    return { startIndex: 0, endIndex: -1 };
  }

  const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeightEstimate) - overscan);
  const visibleEnd = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + viewportHeight) / itemHeightEstimate) + overscan,
  );

  return {
    startIndex: visibleStart,
    endIndex: Math.max(visibleStart, visibleEnd),
  };
}

export function useVirtualizedListRange({
  scrollRef,
  itemCount,
  itemHeightEstimate = 420,
  overscan = 4,
  enabled = true,
}: UseVirtualizedListRangeOptions): VirtualizedListRange {
  const [range, setRange] = useState(() => ({
    startIndex: 0,
    endIndex: Math.max(itemCount - 1, 0),
  }));

  useEffect(() => {
    if (!enabled) return;

    const node = scrollRef.current;
    if (!node) return;

    let frameId = 0;
    const updateRange = () => {
      setRange(
        calculateRange({
          scrollTop: node.scrollTop,
          viewportHeight: node.clientHeight,
          itemCount,
          itemHeightEstimate,
          overscan,
        }),
      );
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateRange);
    };

    updateRange();
    node.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(frameId);
      node.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [enabled, itemCount, itemHeightEstimate, overscan, scrollRef]);

  return useMemo(
    () => ({
      startIndex: enabled ? range.startIndex : 0,
      endIndex: enabled ? range.endIndex : Math.max(itemCount - 1, 0),
      isIndexVisible: (index: number) => !enabled || (index >= range.startIndex && index <= range.endIndex),
    }),
    [enabled, itemCount, range.endIndex, range.startIndex],
  );
}
