"use client";

import { useEffect, useCallback } from "react";
import type { Note } from "@/lib/types";
import { X, Pin, Calendar, Tag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
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
import { MermaidBlock } from "./extensions/mermaid-block";
import { markdownToHtml } from "./extensions/markdown-serializer";

import "katex/dist/katex.min.css";

const lowlight = createLowlight(common);

interface NotePreviewDrawerProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToNote?: (note: Note) => void;
}

export default function NotePreviewDrawer({
  note,
  isOpen,
  onClose,
  onNavigateToNote,
}: NotePreviewDrawerProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleNavigate = useCallback(() => {
    if (note && onNavigateToNote) {
      onNavigateToNote(note);
    }
  }, [note, onNavigateToNote]);

  if (!isOpen || !note) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/10"
        onClick={onClose}
      />
      
      {/* Drawer - positioned on the right side */}
      <div
        className={cn(
          "fixed right-0 top-[64px] z-40 h-[calc(100vh-64px)] w-96 max-w-full transform border-l bg-background shadow-xl transition-transform duration-300 ease-in-out overflow-hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header with close and navigate buttons */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {note.pinned && <Pin className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
              <span className="text-sm font-semibold truncate">{note.title || "Untitled"}</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleNavigate}
                title="Go to note"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClose}
                title="Close preview"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content - Readonly Tiptap */}
          <ScrollArea className="flex-1 overflow-auto">
            <div className="p-3 min-h-0">
              {/* Meta info */}
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                </div>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    <div className="flex gap-1">
                      {note.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rendered content with Tiptap */}
              <ReadonlyTiptapContent content={note.content} />
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}

// Readonly Tiptap content renderer
function ReadonlyTiptapContent({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 dark:text-blue-400 underline cursor-pointer",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto my-4",
        },
      }),
      Table.configure({
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
      CodeBlockLowlight.configure({
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
      WikiLink,
      MermaidBlock,
    ],
    content: markdownToHtml(content),
    editable: false,
    immediatelyRender: false,
  });

  // Update content when it changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const html = markdownToHtml(content);
      editor.commands.setContent(html);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <EditorContent editor={editor} />
    </div>
  );
}
