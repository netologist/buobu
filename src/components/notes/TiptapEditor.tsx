"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { ResizableImage } from "./extensions/resizable-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { MathExtension } from "@aarkue/tiptap-math-extension";
import { WikiLink } from "./extensions/wiki-link";
import { WikiLinkAutocomplete } from "./extensions/wiki-link-autocomplete";
import { MermaidBlock } from "./extensions/mermaid-block";
import { setSlashCommandPromptHandlers, SlashCommands } from "./extensions/slash-commands";
import { markdownToHtml, editorJsonToMarkdown } from "./extensions/markdown-serializer";
import { CalloutBlock } from "./extensions/callout-block";
import EditorToolbar from "./EditorToolbar";
import CodeBlockView from "./extensions/code-block-view";
import { TableOfContents } from "./extensions/table-of-contents";
import NotePreviewDrawer from "./NotePreviewDrawer";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import type { Note } from "@/lib/types";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

import "katex/dist/katex.min.css";

const lowlight = createLowlight(common);

type TiptapEditorProps = {
  content: string; // markdown string
  onUpdate: (markdown: string) => void;
  onReady?: () => void;
  placeholder?: string;
  allNotes: Note[];
  currentNoteId?: string;
  onNavigateToNote?: (note: Note) => void;
};

export default function TiptapEditor({
  content,
  onUpdate,
  onReady,
  placeholder = "Start writing… Type '/' for commands",
  allNotes,
  currentNoteId,
  onNavigateToNote,
}: TiptapEditorProps) {
  const contentRef = useRef(content);
  const isUpdatingRef = useRef(false);
  const activeNoteIdRef = useRef<string | undefined>(currentNoteId);
  const [previewNote, setPreviewNote] = useState<Note | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(true);
  const [slashImagePromptOpen, setSlashImagePromptOpen] = useState(false);
  const [slashLatexPromptOpen, setSlashLatexPromptOpen] = useState(false);
  const slashImageResolverRef = useRef<((value: string | null) => void) | null>(null);
  const slashLatexResolverRef = useRef<((value: string | null) => void) | null>(null);

  const normalizeMarkdown = useCallback((value: string) => {
    return value.replace(/\r\n/g, "\n").trimEnd();
  }, []);

  // Get all notes except current for autocomplete
  const availableNotes = useMemo(() => {
    return allNotes.filter((n) => n.id !== currentNoteId);
  }, [allNotes, currentNoteId]);

  // Handle wiki link click to show preview
  const handleWikiLinkClick = useCallback((title: string) => {
    const note = allNotes.find(
      (n) => n.title.toLowerCase() === title.toLowerCase()
    );
    if (note) {
      setPreviewNote(note);
      setIsPreviewOpen(true);
    }
  }, [allNotes]);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setTimeout(() => setPreviewNote(null), 300);
  }, []);

  const handleNavigateFromPreview = useCallback((note: Note) => {
    setIsPreviewOpen(false);
    onNavigateToNote?.(note);
  }, [onNavigateToNote]);

  useEffect(() => {
    setSlashCommandPromptHandlers({
      requestImageUrl: () =>
        new Promise((resolve) => {
          slashImageResolverRef.current = resolve;
          setSlashImagePromptOpen(true);
        }),
      requestLatex: () =>
        new Promise((resolve) => {
          slashLatexResolverRef.current = resolve;
          setSlashLatexPromptOpen(true);
        }),
    });

    return () => {
      setSlashCommandPromptHandlers({});
      slashImageResolverRef.current?.(null);
      slashLatexResolverRef.current?.(null);
      slashImageResolverRef.current = null;
      slashLatexResolverRef.current = null;
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We use CodeBlockLowlight instead
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
        emptyEditorClass: "is-editor-empty",
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "text-blue-600 dark:text-blue-400 underline cursor-pointer",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "border-collapse table-auto w-full my-4",
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-border px-3 py-2",
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: "border border-border px-3 py-2 bg-muted font-semibold text-left",
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "not-prose pl-0 space-y-1",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "flex items-start gap-2",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: "rounded px-1",
        },
      }),
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockView);
        },
        addKeyboardShortcuts() {
          return {
            ...this.parent?.(),
            Tab: ({ editor }) => {
              if (editor.isActive("codeBlock")) {
                editor.commands.insertContent("\t");
                return true;
              }
              return false;
            },
            "Shift-Tab": ({ editor }) => {
              if (!editor.isActive("codeBlock")) return false;
              const { state, dispatch } = editor.view;
              const { $from } = state.selection;
              const lineStart = $from.start();
              const textBefore = state.doc.textBetween(lineStart, $from.pos);
              if (textBefore.endsWith("\t")) {
                dispatch(state.tr.delete($from.pos - 1, $from.pos));
                return true;
              }
              if (textBefore.endsWith("  ")) {
                dispatch(state.tr.delete($from.pos - 2, $from.pos));
                return true;
              }
              return false;
            },
          };
        },
      }).configure({
        lowlight,
        defaultLanguage: "plaintext",
      }),
      MathExtension.configure({
        evaluation: false,
        katexOptions: {
          throwOnError: false,
          displayMode: false,
        },
      }),
      WikiLink.configure({
        onWikiLinkClick: handleWikiLinkClick,
      }),
      WikiLinkAutocomplete.configure({
        notes: availableNotes,
      }),
      MermaidBlock,
      CalloutBlock,
      SlashCommands,
    ],
    content: markdownToHtml(content),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-6 py-4",
      },
      handleDrop: (view, event, slice, moved) => {
        // Handle image drops
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = () => {
              const src = reader.result as string;
              editor?.chain().focus().setImage({ src }).run();
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        // Handle image paste
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                  const src = reader.result as string;
                  editor?.chain().focus().setImage({ src }).run();
                };
                reader.readAsDataURL(file);
              }
              return true;
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return;
      const md = editorJsonToMarkdown(editor);
      contentRef.current = md;
      onUpdate(md);
    },
    onCreate: () => {
      onReady?.();
    },
    immediatelyRender: false,
  });

  // Sync external content safely. Avoid replacing content mid-typing on the same note,
  // because setContent resets selection and can move caret to the end.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const noteChanged = activeNoteIdRef.current !== currentNoteId;
    if (noteChanged) {
      activeNoteIdRef.current = currentNoteId;
    }

    const incomingContent = normalizeMarkdown(content);
    const currentContent = normalizeMarkdown(contentRef.current);

    if (!noteChanged) {
      if (incomingContent === currentContent) return;
      if (editor.isFocused) return;
    }

    isUpdatingRef.current = true;
    contentRef.current = content;
    const html = markdownToHtml(content);
    editor.commands.setContent(html, { emitUpdate: false });
    isUpdatingRef.current = false;
  }, [content, currentNoteId, editor, normalizeMarkdown]);

  const handleInsertMermaid = useCallback(() => {
    editor?.chain().focus().insertMermaidBlock().run();
  }, [editor]);

  const handleInsertImage = useCallback(() => {
    // Open file picker for image upload
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const src = reader.result as string;
          editor?.chain().focus().setImage({ src }).run();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }, [editor]);

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b bg-muted/30 px-2 py-1">
          <div className="flex-1">
            <EditorToolbar
              editor={editor}
              onInsertMermaid={handleInsertMermaid}
              onInsertImage={handleInsertImage}
            />
          </div>
          <button
            type="button"
            onClick={() => setIsTocOpen((prev) => !prev)}
            className="hidden lg:inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={isTocOpen ? "Hide table of contents" : "Show table of contents"}
          >
            {isTocOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 min-w-0 overflow-auto">
            <EditorContent editor={editor} className="tiptap-editor h-full" />
          </div>
          {isTocOpen && (
            <aside className="hidden lg:flex w-64 shrink-0 border-l bg-muted/10 overflow-auto">
              <div className="w-full">
                <TableOfContents editor={editor} />
              </div>
            </aside>
          )}
        </div>
      </div>
      <NotePreviewDrawer
        note={previewNote}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        onNavigateToNote={handleNavigateFromPreview}
      />

      <PromptDialog
        open={slashImagePromptOpen}
        title="Insert image URL"
        defaultValue="https://"
        placeholder="https://"
        submitText="Insert"
        onCancel={() => {
          setSlashImagePromptOpen(false);
          slashImageResolverRef.current?.(null);
          slashImageResolverRef.current = null;
        }}
        onSubmit={(value) => {
          setSlashImagePromptOpen(false);
          slashImageResolverRef.current?.(value.trim().length > 0 ? value.trim() : null);
          slashImageResolverRef.current = null;
        }}
      />

      <PromptDialog
        open={slashLatexPromptOpen}
        title="Insert LaTeX"
        defaultValue="E = mc^2"
        placeholder="E = mc^2"
        submitText="Insert"
        onCancel={() => {
          setSlashLatexPromptOpen(false);
          slashLatexResolverRef.current?.(null);
          slashLatexResolverRef.current = null;
        }}
        onSubmit={(value) => {
          setSlashLatexPromptOpen(false);
          slashLatexResolverRef.current?.(value.trim().length > 0 ? value.trim() : null);
          slashLatexResolverRef.current = null;
        }}
      />
    </>
  );
}
