"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  ChevronDown,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Minus,
  Link2,
  Image as ImageIcon,
  Table,
  Braces,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  WrapText,
  Sigma,
  Highlighter,
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  Megaphone,
  StickyNote,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useCallback, useState } from "react";
import { PromptDialog } from "@/components/ui/PromptDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import EditorToolbarButton from "./EditorToolbarButton";

type ToolbarProps = {
  editor: Editor | null;
  onInsertMermaid?: () => void;
  onInsertImage?: () => void;
};

const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bae6fd" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Orange", value: "#fed7aa" },
  { label: "Purple", value: "#e9d5ff" },
];

function HighlightColorPicker({ editor }: { editor: Editor }) {
  const [showPicker, setShowPicker] = useState(false);
  const [lastColor, setLastColor] = useState(HIGHLIGHT_COLORS[0].value);

  const applyColor = (color: string) => {
    setLastColor(color);
    setShowPicker(false);
    editor.chain().focus().setHighlight({ color }).run();
  };

  const toggleHighlight = () => {
    if (editor.isActive("highlight")) {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().setHighlight({ color: lastColor }).run();
    }
  };

  return (
    <div className="relative flex items-center">
      <EditorToolbarButton
        onClick={toggleHighlight}
        isActive={editor.isActive("highlight")}
        title="Highlight"
      >
        <span className="relative inline-flex">
          <Highlighter className="h-3.5 w-3.5" />
          <span
            className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-background"
            style={{ backgroundColor: lastColor }}
          />
        </span>
      </EditorToolbarButton>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        title="Choose highlight color"
        className="h-7 w-4 px-0 text-muted-foreground"
        onClick={() => setShowPicker((p) => !p)}
      >
        <ChevronDown className="h-3 w-3" />
      </Button>
      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPicker(false)}
          />
          <div className="absolute top-full left-0 z-50 mt-1 flex gap-1 rounded-lg border bg-background p-1.5 shadow-lg">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => applyColor(c.value)}
                className="h-5 w-5 rounded-full border border-border/60 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function EditorToolbar({
  editor,
  onInsertMermaid,
  onInsertImage,
}: ToolbarProps) {
  const [linkPromptOpen, setLinkPromptOpen] = useState(false);
  const [linkDefaultValue, setLinkDefaultValue] = useState("https://");
  const [imageSourceDialogOpen, setImageSourceDialogOpen] = useState(false);
  const [imageUrlPromptOpen, setImageUrlPromptOpen] = useState(false);
  const [latexPromptOpen, setLatexPromptOpen] = useState(false);

  const uploadImageWithFallback = useCallback(() => {
    if (!editor) return;

    if (onInsertImage) {
      onInsertImage();
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        editor.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [editor, onInsertImage]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    setLinkDefaultValue(previousUrl ?? "https://");
    setLinkPromptOpen(true);
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;

    setImageSourceDialogOpen(true);
  }, [editor]);

  const addTable = useCallback(() => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  const insertMermaid = useCallback(() => {
    if (!editor) return;

    if (onInsertMermaid) {
      onInsertMermaid();
    } else {
      editor.chain().focus().insertMermaidBlock().run();
    }
  }, [editor, onInsertMermaid]);

  const insertLatex = useCallback(() => {
    if (!editor) return;

    setLatexPromptOpen(true);
  }, [editor]);

  if (!editor) return null;

  const iconCn = "h-3.5 w-3.5";

  return (
    <>
      <div className="flex flex-wrap items-center gap-0.5 bg-muted/30 px-2 py-1">
        {/* Undo/Redo */}
        <EditorToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo2 className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo2 className={iconCn} />
        </EditorToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Text formatting */}
        <EditorToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          title="Inline code"
        >
          <Code className={iconCn} />
        </EditorToolbarButton>
        <HighlightColorPicker editor={editor} />

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Headings */}
        <EditorToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          isActive={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          isActive={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className={iconCn} />
        </EditorToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Lists */}
        <EditorToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet list"
        >
          <List className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered list"
        >
          <ListOrdered className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive("taskList")}
          title="Task list"
        >
          <ListChecks className={iconCn} />
        </EditorToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Block elements */}
        <EditorToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <Quote className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          title="Code block"
        >
          <Braces className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
        >
          <Minus className={iconCn} />
        </EditorToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Callouts */}
        <EditorToolbarButton
          onClick={() =>
            editor.chain().focus().insertCallout({ type: "note" }).run()
          }
          title="Insert callout: Note"
        >
          <StickyNote className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton
          onClick={() =>
            editor.chain().focus().insertCallout({ type: "tip" }).run()
          }
          title="Insert callout: Tip"
        >
          <Lightbulb className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton
          onClick={() =>
            editor.chain().focus().insertCallout({ type: "important" }).run()
          }
          title="Insert callout: Important"
        >
          <Megaphone className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton
          onClick={() =>
            editor.chain().focus().insertCallout({ type: "warning" }).run()
          }
          title="Insert callout: Warning"
        >
          <AlertTriangle className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton
          onClick={() =>
            editor.chain().focus().insertCallout({ type: "caution" }).run()
          }
          title="Insert callout: Caution"
        >
          <AlertOctagon className={iconCn} />
        </EditorToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Alignment */}
        <EditorToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          title="Align left"
        >
          <AlignLeft className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          title="Align center"
        >
          <AlignCenter className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          title="Align right"
        >
          <AlignRight className={iconCn} />
        </EditorToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Inline/Block inserts */}
        <EditorToolbarButton
          onClick={addLink}
          isActive={editor.isActive("link")}
          title="Insert link"
        >
          <Link2 className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton onClick={addImage} title="Insert image">
          <ImageIcon className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton onClick={addTable} title="Insert table">
          <Table className={iconCn} />
        </EditorToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Mermaid & LaTeX */}
        <EditorToolbarButton
          onClick={insertMermaid}
          title="Insert Mermaid diagram"
        >
          <WrapText className={iconCn} />
        </EditorToolbarButton>
        <EditorToolbarButton onClick={insertLatex} title="Insert LaTeX">
          <Sigma className={iconCn} />
        </EditorToolbarButton>
      </div>

      <PromptDialog
        open={linkPromptOpen}
        title="Insert link"
        placeholder="https://"
        defaultValue={linkDefaultValue}
        submitText="Apply"
        onCancel={() => setLinkPromptOpen(false)}
        onSubmit={(value) => {
          if (!editor) return;
          const nextValue = value.trim();
          if (nextValue.length === 0) {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
          } else {
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: nextValue })
              .run();
          }
          setLinkPromptOpen(false);
        }}
      />

      <Dialog
        open={imageSourceDialogOpen}
        onOpenChange={setImageSourceDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert image</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImageSourceDialogOpen(false);
                setImageUrlPromptOpen(true);
              }}
            >
              Enter URL
            </Button>
            <Button
              onClick={() => {
                setImageSourceDialogOpen(false);
                uploadImageWithFallback();
              }}
            >
              Upload file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PromptDialog
        open={imageUrlPromptOpen}
        title="Insert image URL"
        placeholder="https://"
        defaultValue="https://"
        submitText="Insert"
        onCancel={() => setImageUrlPromptOpen(false)}
        onSubmit={(value) => {
          if (!editor) return;
          const nextValue = value.trim();
          if (nextValue.length > 0) {
            editor.chain().focus().setImage({ src: nextValue }).run();
          }
          setImageUrlPromptOpen(false);
        }}
      />

      <PromptDialog
        open={latexPromptOpen}
        title="Insert LaTeX"
        placeholder="E = mc^2"
        defaultValue="E = mc^2"
        submitText="Insert"
        onCancel={() => setLatexPromptOpen(false)}
        onSubmit={(value) => {
          if (!editor) return;
          if (value.trim().length > 0) {
            editor.commands.insertContent({
              type: "math_inline",
              attrs: { latex: value.trim() },
            });
          }
          setLatexPromptOpen(false);
        }}
      />
    </>
  );
}
