import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Editor } from "@tiptap/core";

import { TableOfContents } from "../extensions/table-of-contents";

function createEditorMock(): Editor {
  return {
    isDestroyed: false,
    on: vi.fn(),
    off: vi.fn(),
    state: {
      doc: {
        descendants: (callback: (node: { type: { name: string }; attrs: { level: number }; textContent: string }, pos: number) => void) => {
          callback(
            {
              type: { name: "heading" },
              attrs: { level: 2 },
              textContent: "Overview",
            },
            5
          );
        },
      },
    },
  } as unknown as Editor;
}

describe("TableOfContents", () => {
  it("renders headings without triggering the cached snapshot warning", () => {
    const editor = createEditorMock();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<TableOfContents editor={editor} />);

    expect(screen.getByText("Table of Contents")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(
      consoleErrorSpy.mock.calls.some((call) =>
        call.some(
          (arg) => typeof arg === "string" && arg.includes("The result of getSnapshot should be cached")
        )
      )
    ).toBe(false);

    consoleErrorSpy.mockRestore();
  });
});
