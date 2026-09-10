import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import NoteMetadataPanel from "../NoteMetadataPanel";
import type { Note } from "@/lib/types";

const baseNote: Note = {
  id: "note-1",
  boardId: "board-1",
  swimlaneId: "lane-1",
  title: "Test Note",
  content: "# Hello",
  tags: ["work"],
  references: ["[[Other Note]]", "https://example.com"],
  metadata: [{ key: "status", value: "draft", type: "text" }],
  pinned: false,
  createdAt: "2024-01-15T10:30:00.000Z",
  updatedAt: "2024-01-16T10:30:00.000Z",
};

// Helper to render with all required props
function renderPanel(
  overrides: Partial<
    Omit<
      Parameters<typeof NoteMetadataPanel>[0],
      "metadata" | "onMetadataChange"
    > & {
      metadata?: typeof baseNote.metadata;
      onMetadataChange?: ReturnType<typeof vi.fn>;
    }
  > = {},
) {
  const defaults = {
    note: baseNote,
    pinned: false,
    references: baseNote.references,
    metadata: baseNote.metadata ?? [],
    swimlaneName: "Work",
    onPinnedChange: vi.fn(),
    onReferencesChange: vi.fn(),
    onMetadataChange: vi.fn(),
  };
  return render(
    React.createElement(NoteMetadataPanel, {
      ...defaults,
      ...(overrides as Record<string, unknown>),
    }),
  );
}

describe("NoteMetadataPanel", () => {
  it("renders note ID", () => {
    renderPanel();
    expect(screen.getByText(/note-1/i)).toBeInTheDocument();
  });

  it("renders swimlane name", () => {
    renderPanel({ swimlaneName: "My Lane" });
    expect(screen.getByText("My Lane")).toBeInTheDocument();
  });

  it("renders existing references as inputs", () => {
    renderPanel({ references: ["[[Other Note]]", "https://example.com"] });
    expect(screen.getByDisplayValue("[[Other Note]]")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com")).toBeInTheDocument();
  });

  it("renders existing metadata fields", () => {
    renderPanel({
      metadata: [
        { key: "status", value: "draft", type: "text" },
        { key: "priority", value: "5", type: "number" },
      ],
    });
    expect(screen.getByDisplayValue("status")).toBeInTheDocument();
    expect(screen.getByDisplayValue("draft")).toBeInTheDocument();
    expect(screen.getByDisplayValue("priority")).toBeInTheDocument();
    expect(screen.getByDisplayValue("5")).toBeInTheDocument();
  });

  it("calls onReferencesChange when a reference is removed", async () => {
    const onReferencesChange = vi.fn();
    renderPanel({ references: ["[[Other Note]]"], onReferencesChange });
    const removeButtons = screen.getAllByTitle("Remove");
    await userEvent.click(removeButtons[0]);
    expect(onReferencesChange).toHaveBeenCalledWith([]);
  });

  it("calls onReferencesChange when a new reference is added then blurred", async () => {
    const onReferencesChange = vi.fn();
    renderPanel({ references: [], onReferencesChange });
    await userEvent.click(screen.getByText("Add reference"));
    const inputs = screen.getAllByRole("textbox");
    await userEvent.type(inputs[inputs.length - 1], "new ref");
    fireEvent.blur(inputs[inputs.length - 1]);
    expect(onReferencesChange).toHaveBeenCalledWith(["new ref"]);
  });

  it("calls onMetadataChange when metadata value is edited and blurred", async () => {
    const onMetadataChange = vi.fn();
    renderPanel({
      metadata: [{ key: "status", value: "draft", type: "text" }],
      onMetadataChange,
    });

    const valueInput = screen.getByDisplayValue("draft");
    await userEvent.clear(valueInput);
    await userEvent.type(valueInput, "published");
    fireEvent.blur(valueInput);

    expect(onMetadataChange).toHaveBeenCalledWith([
      { key: "status", value: "published", type: "text" },
    ]);
  });

  it("calls onMetadataChange when list metadata item is edited and blurred", async () => {
    const onMetadataChange = vi.fn();
    renderPanel({
      metadata: [{ key: "status", value: '["draft"]', type: "list" }],
      onMetadataChange,
    });

    const listInput = screen.getByDisplayValue("draft");
    await userEvent.clear(listInput);
    await userEvent.type(listInput, "published");
    fireEvent.blur(listInput);

    expect(onMetadataChange).toHaveBeenCalledWith([
      { key: "status", value: '["published"]', type: "list" },
    ]);
  });

  it("calls onMetadataChange when boolean metadata is toggled", async () => {
    const onMetadataChange = vi.fn();
    renderPanel({
      metadata: [{ key: "archived", value: "false", type: "boolean" }],
      onMetadataChange,
    });

    const toggles = screen.getAllByRole("switch");
    const booleanToggle = toggles[1];
    await userEvent.click(booleanToggle);

    expect(onMetadataChange).toHaveBeenCalledWith([
      { key: "archived", value: "true", type: "boolean" },
    ]);
  });

  it("calls onPinnedChange when pinned switch is toggled", async () => {
    const onPinnedChange = vi.fn();
    renderPanel({ onPinnedChange });
    const toggle = screen.getByRole("switch");
    await userEvent.click(toggle);
    expect(onPinnedChange).toHaveBeenCalledWith(true);
  });
});
