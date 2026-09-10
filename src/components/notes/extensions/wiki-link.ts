import { Node, mergeAttributes } from "@tiptap/core";

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, unknown>;
  onWikiLinkClick?: (title: string) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiLink: {
      insertWikiLink: (title: string) => ReturnType;
    };
  }
}

export const WikiLink = Node.create<WikiLinkOptions>({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      onWikiLinkClick: undefined,
    };
  },

  addAttributes() {
    return {
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-title"),
        renderHTML: (attributes) => ({
          "data-title": attributes.title,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="wiki-link"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        {
          "data-type": "wiki-link",
          class:
            "wiki-link cursor-pointer text-blue-600 dark:text-blue-400 underline decoration-dotted underline-offset-2 hover:decoration-solid",
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      `[[${node.attrs.title}]]`,
    ];
  },

  addCommands() {
    return {
      insertWikiLink:
        (title: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { title },
          });
        },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement("span");
      dom.setAttribute("data-type", "wiki-link");
      dom.className =
        "wiki-link cursor-pointer text-blue-600 dark:text-blue-400 underline decoration-dotted underline-offset-2 hover:decoration-solid";
      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (typeof value === "string") dom.setAttribute(key, value);
      });
      dom.textContent = `[[${node.attrs.title}]]`;
      dom.addEventListener("click", () => {
        this.options.onWikiLinkClick?.(node.attrs.title);
      });
      return { dom };
    };
  },
});
