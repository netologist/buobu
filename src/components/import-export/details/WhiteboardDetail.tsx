"use client";

import DOMPurify from "dompurify";
import type { VisionBoardItem, Board, Swimlane } from "@/lib/types";
import { LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";

type WhiteboardDetailProps = {
  whiteboard: VisionBoardItem;
  board?: Board;
  swimlane?: Swimlane;
};

function formatDate(d?: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return d; }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</h3>
      {children}
    </div>
  );
}

// Render Excalidraw data as an SVG preview using the export API
function ExcalidrawPreview({ excalidrawData }: { excalidrawData: string }) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function render() {
      try {
        const parsed = JSON.parse(excalidrawData);
        const elements = parsed?.elements ?? [];
        const appState = parsed?.appState ?? {};

        if (elements.length === 0) {
          if (!cancelled) { setSvgContent(null); setLoading(false); }
          return;
        }

        // Dynamically import @excalidraw/excalidraw export utilities
        const { exportToSvg } = await import("@excalidraw/excalidraw");
        const svg = await exportToSvg({
          elements,
          appState: { ...appState, exportWithDarkMode: false },
          files: parsed?.files ?? null,
        });
        if (!cancelled) {
          setSvgContent(
            DOMPurify.sanitize(svg.outerHTML, {
              USE_PROFILES: { html: true, svg: true, svgFilters: true },
            })
          );
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Could not render canvas preview");
          setLoading(false);
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [excalidrawData]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border bg-muted/30 text-xs text-muted-foreground">
        Rendering canvas...
      </div>
    );
  }

  if (error || !svgContent) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border bg-muted/20 text-xs text-muted-foreground">
        {error ?? "Empty canvas"}
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border bg-white overflow-auto"
      style={{ maxHeight: "420px" }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

function countElements(excalidrawData?: string): { total: number; types: Record<string, number> } {
  if (!excalidrawData) return { total: 0, types: {} };
  try {
    const parsed = JSON.parse(excalidrawData);
    const elements: { type: string }[] = parsed?.elements ?? [];
    const types: Record<string, number> = {};
    for (const el of elements) {
      types[el.type] = (types[el.type] ?? 0) + 1;
    }
    return { total: elements.length, types };
  } catch {
    return { total: 0, types: {} };
  }
}

export function WhiteboardDetail({ whiteboard, board, swimlane }: WhiteboardDetailProps) {
  const { total, types } = countElements(whiteboard.excalidrawData);

  return (
    <div className="space-y-5 text-sm">
      {/* Meta */}
      <div className="flex flex-wrap gap-2 items-center">
        {board && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{board.name}</span>}
        {swimlane && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{swimlane.name}</span>}
      </div>

      {/* Canvas preview */}
      <Section title="Canvas Preview">
        {whiteboard.excalidrawData ? (
          <ExcalidrawPreview excalidrawData={whiteboard.excalidrawData} />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border bg-muted/20">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <LayoutDashboard className="size-8 opacity-30" />
              <p className="text-xs">Empty canvas</p>
            </div>
          </div>
        )}
      </Section>

      {/* Element breakdown */}
      {total > 0 && (
        <Section title="Elements">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/50 p-2.5 col-span-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Total Elements</p>
              <p className="text-lg font-bold text-foreground">{total}</p>
            </div>
            {Object.entries(types).map(([type, count]) => (
              <div key={type} className="rounded-lg bg-muted/50 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{type}</p>
                <p className="font-semibold text-foreground">{count}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Content text */}
      {whiteboard.content && (
        <Section title="Description">
          <p className="text-sm text-muted-foreground leading-relaxed">{whiteboard.content}</p>
        </Section>
      )}

      {/* Dates */}
      <Section title="Dates">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Created</p>
            <p className="text-xs">{formatDate(whiteboard.createdAt)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Updated</p>
            <p className="text-xs">{formatDate(whiteboard.updatedAt)}</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
