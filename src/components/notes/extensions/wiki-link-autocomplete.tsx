"use client";

import { Extension } from "@tiptap/core";
import { PluginKey, Plugin } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";
import type { Note } from "@/lib/types";

export interface WikiLinkAutocompleteOptions {
  notes: Note[];
  onInsertWikiLink?: (title: string) => void;
}

const wikiLinkPluginKey = new PluginKey("wikiLinkAutocomplete");

export const WikiLinkAutocomplete = Extension.create<WikiLinkAutocompleteOptions>({
  name: "wikiLinkAutocomplete",

  addOptions() {
    return {
      notes: [],
      onInsertWikiLink: undefined,
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const options = this.options;

    return [
      new Plugin({
        key: wikiLinkPluginKey,
        state: {
          init() {
            return { active: false, query: "", from: 0 };
          },
          apply(tr, value) {
            const meta = tr.getMeta(wikiLinkPluginKey);
            if (meta) return meta;
            if (tr.docChanged) return { active: false, query: "", from: 0 };
            return value;
          },
        },
        props: {
          handleKeyDown(view, event) {
            const state = wikiLinkPluginKey.getState(view.state);

            // Check for "[[" trigger
            if (event.key === "[" && !state?.active) {
              const { $from } = view.state.selection;
              const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
              
              // Check if the last character was also "["
              if (textBefore.endsWith("[")) {
                // Delay to let the "[" be inserted first
                setTimeout(() => {
                  const tr = view.state.tr.setMeta(wikiLinkPluginKey, {
                    active: true,
                    query: "",
                    from: view.state.selection.from - 1, // Position before "[["
                  });
                  view.dispatch(tr);
                  showWikiLinkMenu(editor, view.state.selection.from - 1, options.notes);
                }, 10);
                return false;
              }
            }

            if (state?.active) {
              if (event.key === "Escape") {
                const tr = view.state.tr.setMeta(wikiLinkPluginKey, {
                  active: false,
                  query: "",
                  from: 0,
                });
                view.dispatch(tr);
                hideWikiLinkMenu();
                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});

let wikiMenuEl: HTMLDivElement | null = null;
let currentNotes: Note[] = [];
let filteredNotes: Note[] = [];
let selectedIndex = 0;
let cleanupKeyHandler: (() => void) | null = null;

function showWikiLinkMenu(editor: Editor, from: number, notes: Note[]) {
  hideWikiLinkMenu();
  currentNotes = [...notes];
  filteredNotes = [...notes];
  selectedIndex = 0;

  wikiMenuEl = document.createElement("div");
  wikiMenuEl.className =
    "wikilink-autocomplete-menu fixed z-[9999] w-80 max-h-80 overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95";

  renderWikiLinkItems(editor);

  // Position near cursor
  const coords = editor.view.coordsAtPos(from);

  wikiMenuEl.style.left = `${coords.left}px`;
  wikiMenuEl.style.top = `${coords.bottom + 6}px`;

  document.body.appendChild(wikiMenuEl);

  // Handle typing for filtering
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!wikiMenuEl) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % filteredNotes.length;
      highlightWikiLinkItem();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex =
        (selectedIndex - 1 + filteredNotes.length) % filteredNotes.length;
      highlightWikiLinkItem();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredNotes[selectedIndex]) {
        selectWikiLinkItem(editor, filteredNotes[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      hideWikiLinkMenu();
    } else if (e.key === "Backspace") {
      // Check if the "[[" is still there
      const { state } = editor.view;
      const { $from } = state.selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      const bracketIdx = textBefore.lastIndexOf("[[");
      if (bracketIdx === -1) {
        hideWikiLinkMenu();
      } else {
        // Update filter
        const query = textBefore.slice(bracketIdx + 2);
        filterWikiLinkItems(query, editor);
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // Let the character be typed, then filter
      setTimeout(() => {
        const { state } = editor.view;
        const { $from } = state.selection;
        const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
        const bracketIdx = textBefore.lastIndexOf("[[");
        if (bracketIdx === -1) {
          hideWikiLinkMenu();
          return;
        }
        const query = textBefore.slice(bracketIdx + 2);
        filterWikiLinkItems(query, editor);
      }, 10);
    }
  };

  document.addEventListener("keydown", handleKeyDown, true);
  cleanupKeyHandler = () =>
    document.removeEventListener("keydown", handleKeyDown, true);

  // Close on click outside
  const handleClickOutside = (e: MouseEvent) => {
    if (wikiMenuEl && !wikiMenuEl.contains(e.target as Node)) {
      hideWikiLinkMenu();
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  const origCleanup = cleanupKeyHandler;
  cleanupKeyHandler = () => {
    origCleanup?.();
    document.removeEventListener("mousedown", handleClickOutside);
  };
}

function filterWikiLinkItems(query: string, editor: Editor) {
  const q = query.toLowerCase();
  filteredNotes = currentNotes.filter(
    (note) =>
      note.title.toLowerCase().includes(q) ||
      note.tags?.some((tag) => tag.toLowerCase().includes(q))
  );
  selectedIndex = 0;
  renderWikiLinkItems(editor);
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Builds one row of the wiki-link menu.
 *
 * Note titles and tags are user data, and they can arrive from an imported
 * backup, where records are written verbatim. They are therefore assigned with
 * `textContent` and the icon is built with `createElementNS` -- nothing here
 * parses a string as HTML.
 */
export function buildWikiLinkItemElement(note: Note, isSelected: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `wikilink-item flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
    isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
  }`;

  const iconWrap = document.createElement("div");
  iconWrap.className = "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background";

  const svg = document.createElementNS(SVG_NS, "svg");
  const svgAttributes: Record<string, string> = {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    class: "text-muted-foreground",
  };
  for (const [name, value] of Object.entries(svgAttributes)) {
    svg.setAttribute(name, value);
  }

  const outline = document.createElementNS(SVG_NS, "path");
  outline.setAttribute("d", "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z");
  const fold = document.createElementNS(SVG_NS, "polyline");
  fold.setAttribute("points", "14 2 14 8 20 8");
  svg.append(outline, fold);
  iconWrap.appendChild(svg);

  const body = document.createElement("div");
  body.className = "flex flex-col min-w-0 flex-1";

  const title = document.createElement("span");
  title.className = "font-medium truncate";
  title.textContent = note.title || "Untitled";

  const tagRow = document.createElement("div");
  tagRow.className = "flex gap-1 mt-0.5";
  for (const tag of note.tags?.slice(0, 2) ?? []) {
    const tagEl = document.createElement("span");
    tagEl.className = "text-[10px] text-muted-foreground";
    tagEl.textContent = `#${tag}`;
    tagRow.appendChild(tagEl);
  }

  body.append(title, tagRow);
  el.append(iconWrap, body);
  return el;
}

function renderWikiLinkItems(editor: Editor) {
  if (!wikiMenuEl) return;
  wikiMenuEl.replaceChildren();

  if (filteredNotes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "px-3 py-4 text-center text-sm text-muted-foreground";
    empty.textContent = "No notes found";
    wikiMenuEl.appendChild(empty);
    return;
  }

  const title = document.createElement("div");
  title.className = "px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider";
  title.textContent = "Link to note";
  wikiMenuEl.appendChild(title);

  filteredNotes.forEach((note, idx) => {
    const el = buildWikiLinkItemElement(note, idx === selectedIndex);

    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectWikiLinkItem(editor, note);
    });
    el.addEventListener("mouseenter", () => {
      selectedIndex = idx;
      highlightWikiLinkItem();
    });
    wikiMenuEl!.appendChild(el);
  });
}

function highlightWikiLinkItem() {
  if (!wikiMenuEl) return;
  const items = wikiMenuEl.querySelectorAll(".wikilink-item");
  items.forEach((el, idx) => {
    if (idx === selectedIndex) {
      el.className = el.className
        .replace("hover:bg-muted", "")
        .replace("bg-accent text-accent-foreground", "") +
        " bg-accent text-accent-foreground";
      el.scrollIntoView({ block: "nearest" });
    } else {
      el.className = el.className
        .replace("bg-accent text-accent-foreground", "") +
        " hover:bg-muted";
    }
  });
}

function selectWikiLinkItem(editor: Editor, note: Note) {
  // Delete the "[[" and any typed query
  const { state } = editor.view;
  const { $from } = state.selection;
  const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
  const bracketIdx = textBefore.lastIndexOf("[[");

  if (bracketIdx !== -1) {
    const deleteFrom = $from.start() + bracketIdx;
    const deleteTo = state.selection.from;
    editor
      .chain()
      .focus()
      .deleteRange({ from: deleteFrom, to: deleteTo })
      .insertWikiLink(note.title)
      .run();
  }

  hideWikiLinkMenu();
}

function hideWikiLinkMenu() {
  if (wikiMenuEl) {
    wikiMenuEl.remove();
    wikiMenuEl = null;
  }
  cleanupKeyHandler?.();
  cleanupKeyHandler = null;
}

export default WikiLinkAutocomplete;
