/**
 * Regression tests for the wiki-link menu row builder.
 *
 * The menu previously assembled each row with `innerHTML` and interpolated
 * `note.title` and `note.tags` straight into the string. Those fields are user
 * data -- the importer writes file-supplied records verbatim -- so a crafted
 * backup could execute script in the app origin while the user typed "[[",
 * where the Supabase refresh token lives in localStorage.
 *
 * The contract these tests defend: untrusted note fields are rendered as text.
 */

import { describe, it, expect } from "vitest";
import { buildWikiLinkItemElement } from "../extensions/wiki-link-autocomplete";
import type { Note } from "@/lib/types";

const IMG_PAYLOAD = '<img src=x onerror="globalThis.__xss = true">';
const SCRIPT_PAYLOAD = '<script>globalThis.__xss = true</script>';

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    boardId: "board-1",
    swimlaneId: "lane-1",
    title: "Test Note",
    content: "",
    tags: [],
    references: [],
    metadata: [],
    pinned: false,
    createdAt: "2024-01-15T10:30:00.000Z",
    updatedAt: "2024-01-16T10:30:00.000Z",
    ...overrides,
  };
}

describe("buildWikiLinkItemElement", () => {
  it("renders a hostile note title as text, never as markup", () => {
    const el = buildWikiLinkItemElement(makeNote({ title: SCRIPT_PAYLOAD }), false);

    const title = el.querySelector("span");
    expect(title?.textContent).toBe(SCRIPT_PAYLOAD);
    expect(title?.childElementCount).toBe(0);

    expect(el.querySelector("script")).toBeNull();
    expect(el.querySelector("img")).toBeNull();
  });

  it("renders hostile tags as text", () => {
    const el = buildWikiLinkItemElement(makeNote({ tags: [IMG_PAYLOAD] }), false);

    expect(el.querySelector("img")).toBeNull();
    expect(el.textContent).toContain(IMG_PAYLOAD);
  });

  it("renders the icon, the title and at most two tags", () => {
    const el = buildWikiLinkItemElement(makeNote({ title: "Meeting notes", tags: ["a", "b", "c"] }), true);

    expect(el.querySelector("svg")).not.toBeNull();
    expect(el.querySelector("polyline")).not.toBeNull();
    expect(el.textContent).toContain("Meeting notes");
    expect(el.textContent).toContain("#a");
    expect(el.textContent).toContain("#b");
    expect(el.textContent).not.toContain("#c");
    expect(el.className).toContain("bg-accent");
  });
});
