import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  serializeFrontmatter,
  slugifyTitle,
} from "../frontmatter";

describe("parseFrontmatter", () => {
  it("returns full raw string as body when no frontmatter present", () => {
    const raw = "# Hello\n\nSome content";
    const result = parseFrontmatter(raw);
    expect(result.body).toBe("# Hello\n\nSome content");
    expect(result.title).toBeUndefined();
    expect(result.tags).toBeUndefined();
  });

  it("parses title from frontmatter", () => {
    const raw = "---\ntitle: My Note\n---\n\nbody content";
    const result = parseFrontmatter(raw);
    expect(result.title).toBe("My Note");
    expect(result.body).toBe("\nbody content");
  });

  it("parses inline tags array", () => {
    const raw = "---\ntitle: Test\ntags: [alpha, beta, gamma]\n---\nbody";
    const result = parseFrontmatter(raw);
    expect(result.tags).toEqual(["alpha", "beta", "gamma"]);
  });

  it("parses block tags array", () => {
    const raw = "---\ntitle: Test\ntags:\n  - alpha\n  - beta\n---\nbody";
    const result = parseFrontmatter(raw);
    expect(result.tags).toEqual(["alpha", "beta"]);
  });

  it("parses createdAt and updatedAt", () => {
    const raw =
      "---\ntitle: T\ncreatedAt: 2024-01-01T00:00:00.000Z\nupdatedAt: 2024-02-01T00:00:00.000Z\n---\n";
    const result = parseFrontmatter(raw);
    expect(result.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(result.updatedAt).toBe("2024-02-01T00:00:00.000Z");
  });

  it("strips frontmatter block from body", () => {
    const raw = "---\ntitle: My Note\n---\n\n# Heading\n\nParagraph.";
    const result = parseFrontmatter(raw);
    expect(result.body).toBe("\n# Heading\n\nParagraph.");
    expect(result.body).not.toContain("---");
  });

  it("handles quoted title values", () => {
    const raw = '---\ntitle: "My: Quoted Note"\n---\nbody';
    const result = parseFrontmatter(raw);
    expect(result.title).toBe("My: Quoted Note");
  });

  it("handles empty tags array", () => {
    const raw = "---\ntitle: T\ntags: []\n---\nbody";
    const result = parseFrontmatter(raw);
    expect(result.tags).toEqual([]);
  });

  it("parses custom text metadata", () => {
    const raw = "---\ntitle: T\nstatus: draft\n---\nbody";
    const result = parseFrontmatter(raw);
    expect(result.metadata).toEqual([
      { key: "status", value: "draft", type: "text" },
    ]);
  });

  it("parses custom number metadata", () => {
    const raw = "---\ntitle: T\npriority: 3\n---\nbody";
    const result = parseFrontmatter(raw);
    expect(result.metadata).toEqual([
      { key: "priority", value: "3", type: "number" },
    ]);
  });

  it("parses custom date metadata", () => {
    const raw = "---\ntitle: T\ndueDate: 2024-06-15\n---\nbody";
    const result = parseFrontmatter(raw);
    expect(result.metadata).toEqual([
      { key: "dueDate", value: "2024-06-15", type: "date" },
    ]);
  });

  it("parses custom list metadata", () => {
    const raw = "---\ntitle: T\nlabels:\n  - a\n  - b\n---\nbody";
    const result = parseFrontmatter(raw);
    expect(result.metadata).toEqual([
      { key: "labels", value: '["a","b"]', type: "list" },
    ]);
  });
});

describe("serializeFrontmatter", () => {
  it("produces a YAML block with title, tags, timestamps", () => {
    const output = serializeFrontmatter({
      title: "My Note",
      tags: ["work", "planning"],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    });
    expect(output).toContain("title: My Note");
    expect(output).toContain("  - work");
    expect(output).toContain("  - planning");
    expect(output).toContain("createdAt: 2024-01-01T00:00:00.000Z");
    expect(output).toMatch(/^---\n/);
    expect(output).toMatch(/\n---\n$/);
  });

  it("writes empty tags as tags: []", () => {
    const output = serializeFrontmatter({
      title: "T",
      tags: [],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });
    expect(output).toContain("tags: []");
  });

  it("serializes custom metadata fields", () => {
    const output = serializeFrontmatter({
      title: "T",
      tags: [],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      metadata: [
        { key: "status", value: "draft", type: "text" },
        { key: "priority", value: "3", type: "number" },
      ],
    });
    expect(output).toContain("status: draft");
    expect(output).toContain("priority: 3");
  });
});

describe("slugifyTitle", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugifyTitle("My Research Notes")).toBe("my-research-notes");
  });

  it("removes special characters", () => {
    expect(slugifyTitle("Hello! World?")).toBe("hello-world");
  });

  it("collapses consecutive separators", () => {
    expect(slugifyTitle("foo   bar")).toBe("foo-bar");
  });

  it('returns "untitled" for empty or whitespace-only input', () => {
    expect(slugifyTitle("")).toBe("untitled");
    expect(slugifyTitle("   ")).toBe("untitled");
  });
});
