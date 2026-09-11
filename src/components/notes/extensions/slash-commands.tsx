"use client";

import { Extension } from "@tiptap/core";
import { PluginKey, Plugin } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (editor: Editor) => void;
}

export interface SlashCommandPromptHandlers {
  requestImageUrl?: () => Promise<string | null>;
  requestLatex?: () => Promise<string | null>;
}

let promptHandlers: SlashCommandPromptHandlers = {};

export function setSlashCommandPromptHandlers(handlers: SlashCommandPromptHandlers) {
  promptHandlers = handlers;
}

const defaultItems: SlashCommandItem[] = [
  {
    title: "Heading 1",
    description: "Large heading",
    icon: "H1",
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium heading",
    icon: "H2",
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small heading",
    icon: "H3",
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet List",
    description: "Unordered list",
    icon: "•",
    command: (editor) =>
      editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    description: "Ordered list",
    icon: "1.",
    command: (editor) =>
      editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Task List",
    description: "Checklist with checkboxes",
    icon: "☑",
    command: (editor) =>
      editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: "Blockquote",
    description: "Quote block",
    icon: "❝",
    command: (editor) =>
      editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Code Block",
    description: "Code with syntax highlighting",
    icon: "<>",
    command: (editor) =>
      editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Table",
    description: "Insert a table",
    icon: "⊞",
    command: (editor) =>
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: "Horizontal Rule",
    description: "Divider line",
    icon: "—",
    command: (editor) =>
      editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: "Image",
    description: "Insert an image from URL",
    icon: "🖼",
    command: (editor) => {
      void (async () => {
        const url = promptHandlers.requestImageUrl
          ? await promptHandlers.requestImageUrl()
          : window.prompt("Image URL");
        if (url && url.trim()) {
          editor.chain().focus().setImage({ src: url.trim() }).run();
        }
      })();
    },
  },
  {
    title: "Mermaid Diagram",
    description: "Insert a Mermaid diagram",
    icon: "◇",
    command: (editor) =>
      editor.chain().focus().insertMermaidBlock().run(),
  },
  {
    title: "Callout: Note",
    description: "Insert a note callout",
    icon: "📝",
    command: (editor) =>
      editor.chain().focus().insertCallout({ type: "note" }).run(),
  },
  {
    title: "Callout: Tip",
    description: "Insert a tip callout",
    icon: "💡",
    command: (editor) =>
      editor.chain().focus().insertCallout({ type: "tip" }).run(),
  },
  {
    title: "Callout: Important",
    description: "Insert an important callout",
    icon: "📣",
    command: (editor) =>
      editor.chain().focus().insertCallout({ type: "important" }).run(),
  },
  {
    title: "Callout: Warning",
    description: "Insert a warning callout",
    icon: "⚠️",
    command: (editor) =>
      editor.chain().focus().insertCallout({ type: "warning" }).run(),
  },
  {
    title: "Callout: Caution",
    description: "Insert a caution callout",
    icon: "⛔️",
    command: (editor) =>
      editor.chain().focus().insertCallout({ type: "caution" }).run(),
  },
  {
    title: "Highlight",
    description: "Highlight selected text",
    icon: "🖍",
    command: (editor) =>
      editor.chain().focus().toggleHighlight().run(),
  },
  {
    title: "Math (LaTeX)",
    description: "Insert a LaTeX formula",
    icon: "∑",
    command: (editor) => {
      void (async () => {
        const latex = promptHandlers.requestLatex
          ? await promptHandlers.requestLatex()
          : window.prompt("LaTeX expression", "E = mc^2");
        if (latex && latex.trim()) {
          editor.commands.insertContent({
            type: "math_inline",
            attrs: { latex: latex.trim() },
          });
        }
      })();
    },
  },
];

const slashPluginKey = new PluginKey("slash-command");

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: slashPluginKey,
        state: {
          init() {
            return { active: false, query: "", from: 0 };
          },
          apply(tr, value) {
            const meta = tr.getMeta(slashPluginKey);
            if (meta) return meta;
            if (tr.docChanged) return { active: false, query: "", from: 0 };
            return value;
          },
        },
        props: {
          handleKeyDown(view, event) {
            const state = slashPluginKey.getState(view.state);

            if (event.key === "/" && !state?.active) {
              const { $from } = view.state.selection;
              const textBefore = $from.parent.textContent.slice(
                0,
                $from.parentOffset
              );
              // Only activate if at start of line or after whitespace
              if (
                textBefore === "" ||
                textBefore.endsWith(" ") ||
                textBefore.endsWith("\n")
              ) {
                // Delay to let the "/" be inserted first
                setTimeout(() => {
                  const tr = view.state.tr.setMeta(slashPluginKey, {
                    active: true,
                    query: "",
                    from: view.state.selection.from,
                  });
                  view.dispatch(tr);
                  showMenu(editor, view.state.selection.from);
                }, 10);
              }
              return false;
            }

            if (state?.active) {
              if (event.key === "Escape") {
                const tr = view.state.tr.setMeta(slashPluginKey, {
                  active: false,
                  query: "",
                  from: 0,
                });
                view.dispatch(tr);
                hideMenu();
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

let menuEl: HTMLDivElement | null = null;
let currentItems: SlashCommandItem[] = [];
let selectedIndex = 0;
let cleanupKeyHandler: (() => void) | null = null;

function showMenu(editor: Editor, from: number) {
  hideMenu();
  currentItems = [...defaultItems];
  selectedIndex = 0;

  menuEl = document.createElement("div");
  menuEl.className =
    "slash-command-menu fixed z-[9999] w-72 max-h-80 overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95";

  renderItems(editor);

  // Position near cursor
  const coords = editor.view.coordsAtPos(from);

  menuEl.style.left = `${coords.left}px`;
  menuEl.style.top = `${coords.bottom + 6}px`;

  document.body.appendChild(menuEl);

  // Handle typing for filtering
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!menuEl) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % currentItems.length;
      highlightItem();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex =
        (selectedIndex - 1 + currentItems.length) % currentItems.length;
      highlightItem();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (currentItems[selectedIndex]) {
        selectItem(editor, currentItems[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      hideMenu();
    } else if (e.key === "Backspace") {
      // Check if the slash is still there
      const { state } = editor.view;
      const { $from } = state.selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      if (!textBefore.includes("/")) {
        hideMenu();
      } else {
        // Update filter
        const slashIdx = textBefore.lastIndexOf("/");
        const query = textBefore.slice(slashIdx + 1);
        filterItems(query, editor);
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // Let the character be typed, then filter
      setTimeout(() => {
        const { state } = editor.view;
        const { $from } = state.selection;
        const textBefore = $from.parent.textContent.slice(
          0,
          $from.parentOffset
        );
        const slashIdx = textBefore.lastIndexOf("/");
        if (slashIdx === -1) {
          hideMenu();
          return;
        }
        const query = textBefore.slice(slashIdx + 1);
        filterItems(query, editor);
      }, 10);
    }
  };

  document.addEventListener("keydown", handleKeyDown, true);
  cleanupKeyHandler = () =>
    document.removeEventListener("keydown", handleKeyDown, true);

  // Close on click outside
  const handleClickOutside = (e: MouseEvent) => {
    if (menuEl && !menuEl.contains(e.target as Node)) {
      hideMenu();
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  const origCleanup = cleanupKeyHandler;
  cleanupKeyHandler = () => {
    origCleanup?.();
    document.removeEventListener("mousedown", handleClickOutside);
  };
}

function filterItems(query: string, editor: Editor) {
  const q = query.toLowerCase();
  currentItems = defaultItems.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
  );
  selectedIndex = 0;
  renderItems(editor);
}

function renderItems(editor: Editor) {
  if (!menuEl) return;
  menuEl.replaceChildren();

  if (currentItems.length === 0) {
    const empty = document.createElement("div");
    empty.className = "px-3 py-4 text-center text-sm text-muted-foreground";
    empty.textContent = "No results";
    menuEl.appendChild(empty);
    return;
  }

  currentItems.forEach((item, idx) => {
    const el = document.createElement("div");
    el.className = `slash-item flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
      idx === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
    }`;

    const iconSpan = document.createElement("span");
    iconSpan.className = "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-sm font-medium";
    iconSpan.textContent = item.icon;

    const contentDiv = document.createElement("div");
    contentDiv.className = "flex flex-col";

    const titleSpan = document.createElement("span");
    titleSpan.className = "font-medium";
    titleSpan.textContent = item.title;

    const descSpan = document.createElement("span");
    descSpan.className = "text-xs text-muted-foreground";
    descSpan.textContent = item.description;

    contentDiv.appendChild(titleSpan);
    contentDiv.appendChild(descSpan);

    el.appendChild(iconSpan);
    el.appendChild(contentDiv);

    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectItem(editor, item);
    });
    el.addEventListener("mouseenter", () => {
      selectedIndex = idx;
      highlightItem();
    });
    menuEl!.appendChild(el);
  });
}

function highlightItem() {
  if (!menuEl) return;
  const items = menuEl.querySelectorAll(".slash-item");
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

function selectItem(editor: Editor, item: SlashCommandItem) {
  // Delete the "/" and any typed query
  const { state } = editor.view;
  const { $from } = state.selection;
  const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
  const slashIdx = textBefore.lastIndexOf("/");

  if (slashIdx !== -1) {
    const deleteFrom = $from.start() + slashIdx;
    const deleteTo = state.selection.from;
    editor
      .chain()
      .focus()
      .deleteRange({ from: deleteFrom, to: deleteTo })
      .run();
  }

  item.command(editor);
  hideMenu();
}

function hideMenu() {
  if (menuEl) {
    menuEl.remove();
    menuEl = null;
  }
  cleanupKeyHandler?.();
  cleanupKeyHandler = null;
}
