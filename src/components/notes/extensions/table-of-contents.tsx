"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import type { Editor } from "@tiptap/core";

interface TocItem {
  level: number;
  text: string;
  pos: number;
  id: string;
}

const EMPTY_HEADINGS: TocItem[] = [];

function extractHeadings(editor: Editor): TocItem[] {
  const headings: TocItem[] = [];
  const doc = editor.state.doc;

  doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      const level = node.attrs.level as number;
      const text = node.textContent;
      if (text.trim()) {
        headings.push({
          level,
          text,
          pos,
          id: `heading-${pos}`,
        });
      }
    }
  });

  return headings;
}

function areHeadingsEqual(previous: TocItem[], next: TocItem[]) {
  return (
    previous.length === next.length &&
    previous.every((heading, index) => {
      const other = next[index];
      return (
        heading.level === other.level &&
        heading.text === other.text &&
        heading.pos === other.pos &&
        heading.id === other.id
      );
    })
  );
}

export function TableOfContents({ editor }: { editor: Editor | null }) {
  const [isOpen, setIsOpen] = useState(true);
  const cachedHeadingsRef = useRef<TocItem[]>(EMPTY_HEADINGS);

  const headings = useSyncExternalStore(
    useCallback(
      (onStoreChange) => {
        if (!editor || editor.isDestroyed) return () => {};

        const handleUpdate = () => onStoreChange();
        editor.on("update", handleUpdate);

        return () => {
          editor.off("update", handleUpdate);
        };
      },
      [editor]
    ),
    useCallback(() => {
      if (!editor || editor.isDestroyed) {
        cachedHeadingsRef.current = EMPTY_HEADINGS;
        return cachedHeadingsRef.current;
      }

      const nextHeadings = extractHeadings(editor);
      if (!areHeadingsEqual(cachedHeadingsRef.current, nextHeadings)) {
        cachedHeadingsRef.current = nextHeadings;
      }

      return cachedHeadingsRef.current;
    }, [editor]),
    () => EMPTY_HEADINGS
  );

  const scrollToHeading = useCallback(
    (pos: number) => {
      if (!editor) return;
      editor.chain().focus().setTextSelection(pos).run();

      // Scroll the heading into view
      const domPos = editor.view.domAtPos(pos);
      const node = domPos.node;
      const el = node instanceof HTMLElement ? node : node.parentElement;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [editor]
  );

  if (!editor || headings.length === 0) return null;

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <div className="toc-panel border-b">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-1.5 px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg
          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Table of Contents
        <span className="ml-auto text-[10px] font-normal opacity-60">
          {headings.length} heading{headings.length !== 1 ? "s" : ""}
        </span>
      </button>
      {isOpen && (
        <nav className="px-2 pb-2">
          <ul className="space-y-0.5">
            {headings.map((h, i) => (
              <li key={`${h.pos}-${i}`}>
                <button
                  type="button"
                  onClick={() => scrollToHeading(h.pos + 1)}
                  className="w-full text-left text-xs py-1 px-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors truncate"
                  style={{
                    paddingLeft: `${(h.level - minLevel) * 12 + 8}px`,
                  }}
                  title={h.text}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span className="shrink-0 text-[10px] font-medium opacity-40">
                      H{h.level}
                    </span>
                    <span className="truncate">{h.text}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
