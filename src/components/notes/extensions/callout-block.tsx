"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { useState } from "react";
import { Lightbulb, AlertTriangle, AlertOctagon, Megaphone, StickyNote, ChevronDown } from "lucide-react";

export interface CalloutBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

export type CalloutType = "tip" | "warning" | "caution" | "important" | "note";

const calloutConfig: Record<CalloutType, { icon: typeof Lightbulb; label: string; colorClass: string; borderClass: string; iconColor: string }> = {
  tip: {
    icon: Lightbulb,
    label: "Tip",
    colorClass: "bg-emerald-50/70 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
    borderClass: "border-emerald-400 dark:border-emerald-600",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    colorClass: "bg-amber-50/70 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100",
    borderClass: "border-amber-400 dark:border-amber-600",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  caution: {
    icon: AlertOctagon,
    label: "Caution",
    colorClass: "bg-red-50/70 text-red-900 dark:bg-red-950/50 dark:text-red-100",
    borderClass: "border-red-400 dark:border-red-600",
    iconColor: "text-red-600 dark:text-red-400",
  },
  important: {
    icon: Megaphone,
    label: "Important",
    colorClass: "bg-blue-50/70 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100",
    borderClass: "border-blue-400 dark:border-blue-600",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  note: {
    icon: StickyNote,
    label: "Note",
    colorClass: "bg-slate-50/70 text-slate-900 dark:bg-slate-900/50 dark:text-slate-100",
    borderClass: "border-slate-400 dark:border-slate-600",
    iconColor: "text-slate-600 dark:text-slate-400",
  },
};

interface CalloutComponentProps {
  node: {
    attrs: {
      type?: CalloutType;
      [key: string]: unknown;
    };
  };
  updateAttributes: (attrs: { type: CalloutType }) => void;
  editor: {
    isEditable: boolean;
  };
}

function CalloutComponent({ node, updateAttributes, editor }: CalloutComponentProps) {
  const type = (node.attrs.type as CalloutType) || "note";
  const config = calloutConfig[type];
  const Icon = config.icon;
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  return (
    <NodeViewWrapper className="callout-wrapper my-4">
      <div
        className={`rounded-lg border-l-4 ${config.borderClass} ${config.colorClass} p-4`}
      >
        <div className="flex items-start gap-3">
          <div className="flex flex-col gap-1 shrink-0">
            <div className={`${config.iconColor}`}>
              <Icon size={20} strokeWidth={2} />
            </div>
            {editor.isEditable && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTypeMenu(!showTypeMenu)}
                  className="flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-60 hover:opacity-100 transition-opacity"
                >
                  {config.label}
                  <ChevronDown size={10} />
                </button>
                {showTypeMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowTypeMenu(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 w-44 rounded-lg border bg-popover shadow-lg z-50 py-1">
                      {(Object.keys(calloutConfig) as CalloutType[]).map((t) => {
                        const TypeIcon = calloutConfig[t].icon;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              updateAttributes({ type: t });
                              setShowTypeMenu(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${
                              t === type ? "bg-accent text-accent-foreground" : ""
                            }`}
                          >
                            <TypeIcon size={16} className={calloutConfig[t].iconColor} />
                            <span>{calloutConfig[t].label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
            {!editor.isEditable && (
              <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
                {config.label}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <NodeViewContent className="prose-sm dark:prose-invert [&>*]:m-0 [&>*+*]:mt-2" />
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    calloutBlock: {
      insertCallout: (options?: { type?: CalloutType; content?: string }) => ReturnType;
      setCalloutType: (type: CalloutType) => ReturnType;
    };
  }
}

export const CalloutBlock = Node.create<CalloutBlockOptions>({
  name: "calloutBlock",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      type: {
        default: "note",
        parseHTML: (element: HTMLElement) => {
          const dataType = element.getAttribute("data-callout-type");
          if (dataType && ["tip", "warning", "caution", "important", "note"].includes(dataType)) {
            return dataType;
          }
          return "note";
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
        tag: 'div[data-type="callout-block"]',
      },
      {
        tag: "div.callout-block",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = (node.attrs.type as CalloutType) || "note";
    const config = calloutConfig[type];

    return [
      "div",
      mergeAttributes(
        {
          "data-type": "callout-block",
          "data-callout-type": type,
          class: `callout-block callout-${type} my-4`,
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      [
        "div",
        { class: `rounded-lg border-l-4 ${config.borderClass} ${config.colorClass} p-4` },
        [
          "div",
          { class: "flex items-start gap-3" },
          ["span", { class: `shrink-0 ${config.iconColor}` }, "⚡"],
          ["div", { class: "flex-1" }, 0],
        ],
      ],
    ];
  },

  addCommands() {
    return {
      insertCallout:
        (options = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { type: options.type || "note" },
            content: options.content
              ? [{ type: "paragraph", content: [{ type: "text", text: options.content }] }]
              : [{ type: "paragraph" }],
          });
        },
      setCalloutType:
        (type: CalloutType) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { type });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutComponent);
  },
});
