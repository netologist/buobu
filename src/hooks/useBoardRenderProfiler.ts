import { useEffect, useRef } from "react";

type UseBoardRenderProfilerOptions = {
  name: string;
  enabled?: boolean;
  stats?: Record<string, string | number | boolean | null | undefined>;
};

declare global {
  interface Window {
    __BUOBU_DEBUG_PERF__?: boolean;
  }
}

export function useBoardRenderProfiler({
  name,
  enabled = process.env.NODE_ENV !== "production",
  stats = {},
}: UseBoardRenderProfilerOptions) {
  const renderCountRef = useRef(0);
  const previousMarkRef = useRef<string | null>(null);
  const statsRef = useRef(stats);
  const statsSignature = JSON.stringify(stats);

  useEffect(() => {
    statsRef.current = stats;
  }, [statsSignature, stats]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !window.__BUOBU_DEBUG_PERF__) return;

    renderCountRef.current += 1;
    const markName = `${name}:commit:${renderCountRef.current}`;

    performance.mark(markName);
    if (previousMarkRef.current) {
      performance.measure(`${name}:between-commits:${renderCountRef.current}`, previousMarkRef.current, markName);
    }
    previousMarkRef.current = markName;

    console.debug(`[perf:${name}] commit #${renderCountRef.current}`, statsRef.current);
  }, [enabled, name, statsSignature]);
}
