# ADR-013: Note Markdown Import/Export, Custom Metadata & Highlight Colors

**Status:** Accepted  
**Date:** 2026-06-13

## Context

Notes needed three capabilities: file-based import/export for interoperability with external editors, custom metadata fields beyond the fixed schema, and multi-color text highlighting. Each decision had trade-offs affecting the data model, serialization format, and editor complexity.

## Decisions

### 1. Custom metadata as `NoteMetadataField[]` on the Note type

**Choice:** Add `metadata?: NoteMetadataField[]` to the `Note` type where each field has `{ key: string, value: string, type: 'text' | 'number' | 'date' | 'list' }`.

**Alternatives considered:**
- `Record<string, unknown>` — type-unsafe, no UI type hinting
- Separate `notes_metadata` RxDB collection — overkill for key-value pairs, adds sync complexity
- JSON blob column — unqueryable, opaque

**Rationale:** Array of typed fields gives the UI enough information to render appropriate input controls (date picker, number input, list editor) while keeping the data model simple. Values are always stored as strings; type only influences UI rendering and frontmatter serialization.

### 2. Markdown with YAML frontmatter as canonical import/export format

**Choice:** Use the custom `src/lib/frontmatter.ts` parser (no `gray-matter` dependency) with standard YAML keys + custom metadata keys in the same block.

**Rationale:**
- No new npm dependency — the subset of YAML needed (scalar values, inline arrays, block lists) is small enough to parse directly
- Round-trip fidelity: import → edit → export preserves all metadata
- Interoperable with Obsidian, Typora, VS Code

**Standard keys:** `title`, `tags`, `createdAt`, `updatedAt`. All other root-level YAML keys are treated as custom metadata, with type guessed from value format (number, date, text, list).

### 3. Highlight color persistence as inline `<mark style="...">` HTML

**Choice:** Serialize colored highlights as `<mark style="background-color: #hex">text</mark>` in the markdown string. Yellow (no color attribute) uses `==text==` syntax. Add `"style"` to DOMPurify's `ADD_ATTR`.

**Alternatives considered:**
- Custom `==text=={color=#hex}` syntax — would need custom marked extension
- Data attributes like `<mark data-color="#hex">` — DOMPurify-safe but needs CSS rules
- Lossy: ignore colors, always serialize as `==text==` — simplest but surprising UX

**Rationale:** DOMPurify already sanitizes CSS property values internally — it allows `background-color` and blocks `behavior`, `expression`, and other script-execution vectors. Inline styles survive marked's HTML pass-through natively.

### 4. Browser File API for import/export

**Choice:** Import uses `<input type="file">` + `FileReader.readAsText()`. Export uses `Blob` + `URL.createObjectURL()` + programmatic `<a>` click.

**Rationale:**
- No server round-trip needed — notes are local-first
- No File System Access API (too new, inconsistent support)
- Export filename derived from `slugifyTitle(note.title)`
- Max import size: 5 MB (arbitrary guard, can be adjusted)

## Consequences

- **Positive:** Notes can freely move between buobu and any markdown editor. Custom metadata is self-documenting in the exported file.
- **Negative:** Adding `metadata` to the Note schema requires old notes to handle the `undefined` case gracefully. The frontmatter parser may misidentify non-standard YAML constructs.
- **Risks:** DOMPurify's CSS allowlist depends on its version. If a future release tightens `style` sanitization, colored highlights would silently demote to yellow.
