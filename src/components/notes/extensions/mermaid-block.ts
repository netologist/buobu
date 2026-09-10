import { Node, mergeAttributes } from "@tiptap/core";

export interface MermaidBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaidBlock: {
      insertMermaidBlock: (content?: string) => ReturnType;
    };
  }
}

// Module-level cached mermaid API (initialized once across all instances)
let mermaidApi: {
  render: (id: string, code: string) => Promise<{ svg: string }>;
  initialize: (config: Record<string, unknown>) => void;
} | null = null;
let mermaidInitialized = false;
let renderCounter = 0;

async function getMermaidApi() {
  if (!mermaidApi) {
    const mod = await import("mermaid");
    mermaidApi = mod.default;
  }
  if (!mermaidInitialized) {
    mermaidApi!.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "strict",
    });
    mermaidInitialized = true;
  }
  return mermaidApi!;
}

export const MermaidBlock = Node.create<MermaidBlockOptions>({
  name: "mermaidBlock",
  group: "block",
  atom: true, // Treat as a single opaque block — no ProseMirror content editing
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      code: {
        default: "graph TD\n  A[Start] --> B[End]",
        parseHTML: (element: HTMLElement) => {
          // Extract from <pre><code>...</code></pre> inside the div
          const codeEl = element.querySelector("code");
          if (codeEl) return codeEl.textContent || "";
          // Or from a data attribute
          const attr = element.getAttribute("data-code");
          if (attr) return attr;
          // Fallback to text content
          return element.textContent || "";
        },
      },
    };
  },

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid-block"]',
        priority: 60,
      },
      {
        tag: "pre",
        priority: 50,
        getAttrs: (node: string | HTMLElement) => {
          if (typeof node === "string") return false;
          const code = node.querySelector("code");
          if (code?.classList.contains("language-mermaid")) {
            return { code: code.textContent || "" };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        {
          "data-type": "mermaid-block",
          class: "mermaid-block",
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      ["pre", ["code", node.attrs.code || ""]],
    ];
  },

  addCommands() {
    return {
      insertMermaidBlock:
        (content?: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              code: content || "graph TD\n  A[Start] --> B[End]",
            },
          });
        },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      // ── Container ──
      const container = document.createElement("div");
      container.className =
        "mermaid-block my-4 rounded-lg border bg-muted/30 overflow-hidden";
      container.setAttribute("data-type", "mermaid-block");

      // ── Toolbar ──
      const toolbar = document.createElement("div");
      toolbar.className =
        "flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b text-xs text-muted-foreground";
      toolbar.contentEditable = "false";

      const label = document.createElement("span");
      label.className = "font-medium";
      label.textContent = "Mermaid Diagram";

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className =
        "ml-auto px-2 py-0.5 rounded text-xs hover:bg-muted cursor-pointer select-none";
      toggleBtn.textContent = "Preview";

      toolbar.appendChild(label);
      toolbar.appendChild(toggleBtn);

      // ── Content area ──
      const contentArea = document.createElement("div");
      contentArea.className = "mermaid-content";

      // ── Code editor (textarea) ──
      const codeArea = document.createElement("div");
      codeArea.className = "p-3";

      const textarea = document.createElement("textarea");
      textarea.className =
        "w-full font-mono text-sm leading-relaxed bg-transparent border-none outline-none resize-y min-h-[80px]";
      textarea.value = node.attrs.code || "";
      textarea.spellcheck = false;
      textarea.rows = Math.max(3, (node.attrs.code || "").split("\n").length);
      codeArea.appendChild(textarea);

      // ── Preview area ──
      const previewArea = document.createElement("div");
      previewArea.className = "p-3 hidden";

      let showPreview = false;

      // ── Update node attrs when code changes ──
      textarea.addEventListener("input", () => {
        const pos = getPos();
        if (typeof pos !== "number") return;
        editor.view.dispatch(
          editor.view.state.tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            code: textarea.value,
          })
        );
      });

      // ── Render mermaid preview ──
      const renderPreview = async () => {
        const code = textarea.value.trim();
        if (!code) {
          previewArea.innerHTML = `<div class="text-sm text-muted-foreground p-2">Empty diagram</div>`;
          return;
        }

        renderCounter++;
        const id = `mmd-${Date.now()}-${renderCounter}`;

        try {
          const api = await getMermaidApi();
          const { svg } = await api.render(id, code);
          previewArea.innerHTML = svg;
        } catch {
          // Clean up orphan DOM elements mermaid may leave on error
          try {
            document.querySelectorAll(`[id="${id}"]`).forEach((el) => el.remove());
          } catch { /* ignore */ }
          previewArea.innerHTML = `<div class="text-sm text-destructive p-2">Invalid Mermaid syntax</div>`;
        }
      };

      // ── Toggle handler ──
      toggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        showPreview = !showPreview;
        if (showPreview) {
          toggleBtn.textContent = "Edit";
          codeArea.classList.add("hidden");
          previewArea.classList.remove("hidden");
          renderPreview();
        } else {
          toggleBtn.textContent = "Preview";
          codeArea.classList.remove("hidden");
          previewArea.classList.add("hidden");
        }
      });

      contentArea.appendChild(codeArea);
      contentArea.appendChild(previewArea);
      container.appendChild(toolbar);
      container.appendChild(contentArea);

      return {
        dom: container,
        // No contentDOM — atom node, we manage editing ourselves via textarea
        stopEvent: (event: Event) => {
          // Let events inside our container be handled by our DOM, not ProseMirror
          const target = event.target as HTMLElement;
          if (container.contains(target)) {
            return true;
          }
          return false;
        },
        ignoreMutation: () => true,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "mermaidBlock") return false;
          // Sync textarea if the node was updated externally (undo/redo, etc.)
          if (updatedNode.attrs.code !== textarea.value) {
            textarea.value = updatedNode.attrs.code || "";
            textarea.rows = Math.max(
              3,
              (updatedNode.attrs.code || "").split("\n").length
            );
          }
          node = updatedNode;
          if (showPreview) renderPreview();
          return true;
        },
        selectNode: () => {
          container.classList.add("ring-2", "ring-primary/30");
        },
        deselectNode: () => {
          container.classList.remove("ring-2", "ring-primary/30");
        },
        destroy: () => {
          // nothing to clean up
        },
      };
    };
  },
});
