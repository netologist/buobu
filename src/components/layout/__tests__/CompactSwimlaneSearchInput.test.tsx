import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { CompactSwimlaneSearchInput } from "@/components/layout/CompactSwimlaneSearchInput";

describe("CompactSwimlaneSearchInput", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(
      <CompactSwimlaneSearchInput
        open={false}
        query=""
        onQueryChange={vi.fn()}
        onClose={vi.fn()}
        placeholder="Search swimlanes..."
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the input with the placeholder when open", () => {
    render(
      <CompactSwimlaneSearchInput
        open={true}
        query=""
        onQueryChange={vi.fn()}
        onClose={vi.fn()}
        placeholder="Search swimlanes..."
      />,
    );
    expect(screen.getByPlaceholderText("Search swimlanes...")).toBeInTheDocument();
  });

  it("shows the current query value", () => {
    render(
      <CompactSwimlaneSearchInput
        open={true}
        query="work"
        onQueryChange={vi.fn()}
        onClose={vi.fn()}
        placeholder="Search swimlanes..."
      />,
    );
    expect(screen.getByDisplayValue("work")).toBeInTheDocument();
  });

  it("calls onQueryChange on every keystroke", () => {
    const onQueryChange = vi.fn();
    render(
      <CompactSwimlaneSearchInput
        open={true}
        query=""
        onQueryChange={onQueryChange}
        onClose={vi.fn()}
        placeholder="Search swimlanes..."
      />,
    );
    const input = screen.getByPlaceholderText("Search swimlanes...");
    fireEvent.change(input, { target: { value: "w" } });
    fireEvent.change(input, { target: { value: "wo" } });
    expect(onQueryChange).toHaveBeenCalledTimes(2);
    expect(onQueryChange).toHaveBeenNthCalledWith(1, "w");
    expect(onQueryChange).toHaveBeenNthCalledWith(2, "wo");
  });

  it("clicking the close button calls onClose", () => {
    const onClose = vi.fn();
    render(
      <CompactSwimlaneSearchInput
        open={true}
        query="work"
        onQueryChange={vi.fn()}
        onClose={onClose}
        placeholder="Search swimlanes..."
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /close search/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pressing Escape in the input calls onClose", () => {
    const onClose = vi.fn();
    render(
      <CompactSwimlaneSearchInput
        open={true}
        query="work"
        onQueryChange={vi.fn()}
        onClose={onClose}
        placeholder="Search swimlanes..."
      />,
    );
    const input = screen.getByPlaceholderText("Search swimlanes...");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
