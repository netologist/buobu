import type { Note, NoteMetadataField, NoteMetadataType } from "./types";

export type ParsedFrontmatter = {
  title?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  metadata?: NoteMetadataField[];
  body: string;
};

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const STANDARD_KEYS = new Set(["title", "tags", "createdAt", "updatedAt"]);

export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { body: raw };

  const yamlBlock = match[1];
  const body = raw.slice(match[0].length);
  const result: ParsedFrontmatter = { body };

  const titleMatch = yamlBlock.match(/^title:\s*(.+)$/m);
  if (titleMatch) {
    result.title = titleMatch[1].trim().replace(/^['"]|['"]$/g, "");
  }

  const createdAtMatch = yamlBlock.match(/^createdAt:\s*(.+)$/m);
  if (createdAtMatch) result.createdAt = createdAtMatch[1].trim();

  const updatedAtMatch = yamlBlock.match(/^updatedAt:\s*(.+)$/m);
  if (updatedAtMatch) result.updatedAt = updatedAtMatch[1].trim();

  // Tags: inline [tag1, tag2] or block `- tag` lines
  const tagsInlineMatch = yamlBlock.match(/^tags:\s*\[([^\]]*)\]/m);
  if (tagsInlineMatch) {
    result.tags = tagsInlineMatch[1]
      .split(",")
      .map((t) => t.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  } else {
    const tagsBlockMatch = yamlBlock.match(
      /^tags:\s*\n((?:[ \t]+-[ \t]+.+\n?)+)/m,
    );
    if (tagsBlockMatch) {
      result.tags = tagsBlockMatch[1]
        .split("\n")
        .map((l) =>
          l
            .replace(/^[ \t]+-[ \t]+/, "")
            .trim()
            .replace(/^['"]|['"]$/g, ""),
        )
        .filter(Boolean);
    }
  }

  // Parse custom metadata — capture any top-level key not in STANDARD_KEYS.
  // Supports: key: value (text/number/date) and key:\n  - item\n  - item (list).
  const metadata: NoteMetadataField[] = [];
  const lines = yamlBlock.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const keyMatch = line.match(/^(\w[\w_-]*)\s*:\s*(.*)/);
    if (!keyMatch) {
      i++;
      continue;
    }
    const key = keyMatch[1];
    const rest = keyMatch[2];
    if (STANDARD_KEYS.has(key)) {
      i++;
      continue;
    }

    // Check if this is a list (value is empty and next lines are indented dash-items)
    if (rest.trim().length === 0 && i + 1 < lines.length) {
      const listItems: string[] = [];
      let j = i + 1;
      while (j < lines.length && /^[ \t]+-[ \t]+/.test(lines[j])) {
        listItems.push(
          lines[j]
            .replace(/^[ \t]+-[ \t]+/, "")
            .trim()
            .replace(/^['"]|['"]$/g, ""),
        );
        j++;
      }
      if (listItems.length > 0) {
        metadata.push({
          key,
          value: JSON.stringify(listItems),
          type: "list",
        });
        i = j;
        continue;
      }
    }

    // Scalar value: try to guess type
    const val = rest.trim().replace(/^['"]|['"]$/g, "");
    const fieldType = guessMetadataType(val);
    metadata.push({ key, value: val, type: fieldType });
    i++;
  }

  if (metadata.length > 0) result.metadata = metadata;

  return result;
}

export function serializeFrontmatter(
  note: Pick<Note, "title" | "tags" | "createdAt" | "updatedAt" | "metadata">,
): string {
  const lines = ["---"];
  lines.push(`title: ${note.title ?? ""}`);
  if (note.tags?.length) {
    lines.push("tags:");
    for (const tag of note.tags) lines.push(`  - ${tag}`);
  } else {
    lines.push("tags: []");
  }
  lines.push(`createdAt: ${note.createdAt ?? ""}`);
  lines.push(`updatedAt: ${note.updatedAt ?? ""}`);

  // Custom metadata
  if (note.metadata?.length) {
    for (const field of note.metadata) {
      lines.push(serializeMetadataField(field));
    }
  }

  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

function serializeMetadataField(field: NoteMetadataField): string {
  const escapedKey = field.key.match(/^\w[\w_-]*$/)
    ? field.key
    : JSON.stringify(field.key);

  switch (field.type) {
    case "list":
      try {
        const items: unknown[] = JSON.parse(field.value);
        if (Array.isArray(items) && items.length > 0) {
          return (
            `${escapedKey}:\n` + items.map((item) => `  - ${item}`).join("\n")
          );
        }
      } catch {
        // fall through to text
      }
      return `${escapedKey}: ${field.value}`;

    case "text":
    case "date":
      return `${escapedKey}: ${field.value}`;

    case "number":
      return `${escapedKey}: ${field.value}`;

    default:
      return `${escapedKey}: ${field.value}`;
  }
}

function guessMetadataType(value: string): NoteMetadataType {
  if (/^-?\d+(\.\d+)?$/.test(value)) return "number";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
  return "text";
}

export function slugifyTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}
