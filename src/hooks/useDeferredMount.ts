import { useEffect, useRef, useState, type RefObject } from "react";

type UseDeferredMountOptions = {
  rootRef?: RefObject<Element | null>;
  rootMargin?: string;
  enabled?: boolean;
};

export function useDeferredMount({
  rootRef,
  rootMargin = "700px 0px",
  enabled = true,
}: UseDeferredMountOptions = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(
    () => !enabled || typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (!enabled || shouldRender) return;

    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        setShouldRender(true);
        observer.unobserve(node);
        observer.disconnect();
      },
      {
        root: rootRef?.current ?? null,
        rootMargin,
        threshold: 0.01,
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [enabled, rootMargin, rootRef, shouldRender]);

  return {
    containerRef,
    shouldRender,
  };
}
