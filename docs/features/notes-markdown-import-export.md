# Notes — Markdown Import/Export, Metadata Panel & Highlight Colors

**Status:** Implemented
**Gherkin:** [notes-markdown-import-export.feature](notes-markdown-import-export.feature)

---

## Problem Statement

The notes editor stores content as markdown internally but provides no way to move `.md` files in or out of the workspace. Users who write notes in other tools (Obsidian, VS Code, Typora) cannot import their work, and notes cannot be shared or backed up as plain files.

Additionally, the editor supports only a single yellow highlight color, and note metadata (references, custom key–value fields, timestamps, swimlane) is hidden from the user with no way to inspect or edit it.

---

## Goals

1. **Import** — Create a new note from a `.md` file, honoring YAML frontmatter for title, tags, timestamps and custom metadata fields.
2. **Export** — Download the open note as a `.md` file with a YAML frontmatter block.
3. **Metadata panel** — Obsidian-style collapsible right-side panel showing and editing note properties.
4. **Highlight colors** — Replace the single yellow highlight with a 6-color picker; colors survive save/reload.

---

## Non-Goals

- Bulk/zip export of multiple notes — deferred.
- Two-way file sync with the filesystem (e.g. Obsidian vault) — deferred.
- Nested YAML structures or multi-document frontmatter. Top-level scalar keys and flat `- item` lists are supported; anything deeper is out of scope.
- Changing the `boardId` or `swimlaneId` via the metadata panel.

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Import creates new note vs. replace | Always creates a new note | Predictable; no accidental overwrites |
| Import button location | Per-swimlane menu in the notes sidebar (an "Import .md" item that remembers its target swimlane) | Produces a new list item in that swimlane — the sidebar is the natural home |
| Export button location | Note editor header action row, after Archive and before Delete | Operates on the open note — editor header is the natural home |
| YAML frontmatter support | Full round-trip (parse on import, write on export) | Enables interoperability with Obsidian, Typora, VS Code |
| Frontmatter parsing library | Custom parser in `src/lib/frontmatter.ts` (no new dep) | Format is predictable; avoids bundle size increase |
| Metadata panel position | Collapsible right-side panel | Matches Obsidian Properties UX; doesn't interrupt the writing flow |
| Custom metadata model | Array of `{ key, value, type }` entries (`NoteMetadataField`) | Lets the panel edit typed fields and lets export/import round-trip arbitrary properties |
| Highlight color persistence | `<mark style="background-color: #…">` in markdown | Colors survive reload; DOMPurify sanitizes CSS values |
| Max import file size | 5 MB | Prevents accidental large-file imports |

---

## Architecture

### Shared Utility: `src/lib/frontmatter.ts`

Single module responsible for all frontmatter logic. No external dependency.

```
parseFrontmatter(raw: string) → { title?, tags?, createdAt?, updatedAt?, metadata?, body }
serializeFrontmatter(note)    → string  (YAML block)
slugifyTitle(title: string)   → string  (filesystem-safe filename)
```

`parseFrontmatter` reads the leading `---` block and extracts:

- `title` (surrounding quotes stripped)
- `tags` — inline `tags: [tag1, tag2]` or block `- tag` lines
- `createdAt`, `updatedAt` — passed through as strings
- `metadata` — every other top-level key, as a `NoteMetadataField[]`. Scalar values get a guessed type (`number` for numeric, `date` for `YYYY-MM-DD…`, otherwise `text`); a key followed by indented `- item` lines becomes a `list` whose `value` is a JSON-encoded string array.
- `body` — everything after the frontmatter block

`NoteMetadataField.type` is `"text" | "number" | "date" | "list" | "boolean"`; parsing produces the first four, `boolean` is only set from the metadata panel.

Exported file format:

```markdown
---
title: My Note Title
tags:
  - research
  - ai
createdAt: 2024-01-15T10:30:00.000Z
updatedAt: 2024-01-15T11:00:00.000Z
source: https://example.com
authors:
  - Ada
  - Grace
---

Note body content starts here.
```

Keys that are not identifier-safe are JSON-quoted on export. List fields whose `value` is not valid JSON degrade to a plain scalar line.

---

## Feature A: Import Markdown

### UI Location

`NotesBoard.tsx` — an "Import .md" item inside the per-swimlane sidebar menu, next to "New note". The menu records the target swimlane id before opening the file picker.

### Flow

1. User chooses "Import .md" for a swimlane.
2. A hidden `<input type="file" accept=".md,text/markdown">` is triggered programmatically.
3. `FileReader.readAsText()` reads the file.
4. Size guard: if `file.size > 5_000_000` bytes → alert, abort.
5. `parseFrontmatter(text)` extracts title, tags, `createdAt` and custom `metadata`.
6. Title fallback: if no frontmatter `title`, use the filename with `.md` removed and `-`/`_` replaced by spaces; if that is empty, "Imported note".
7. The note is persisted in the target swimlane (falling back to the first swimlane/board when none is recorded) with `content: body`, the parsed tags, the parsed metadata, empty `references`, `pinned: false`, and the frontmatter `createdAt` when present.
8. The new note is selected and opened in the editor.

### Error States

| Condition | User-visible result |
|---|---|
| File > 5 MB | Alert: "File too large. Maximum size is 5 MB." |
| FileReader error | Alert: "Could not read the file." |

Errors surface through `alert()`, not a toast system.

---

## Feature B: Export Markdown

### UI Location

`NoteEditor.tsx` — header action row, after the Archive button and before Delete. The button is only rendered once a note is open.

### Flow

1. User clicks Export.
2. `serializeFrontmatter({ title, tags, createdAt, updatedAt, metadata })` produces the YAML header.
3. Full content = `frontmatter + current editor content`.
4. `new Blob([content], { type: 'text/markdown;charset=utf-8' })`.
5. `URL.createObjectURL(blob)` → temporary `<a>` with `download` attribute → `.click()` → `URL.revokeObjectURL()`.
6. Filename: `slugifyTitle(note.title || "untitled") + ".md"` (e.g. `my-research-notes.md`).

---

## Feature C: Metadata Panel

### Component: `src/components/notes/NoteMetadataPanel.tsx`

```typescript
type NoteMetadataPanelProps = {
  note: Note;
  pinned: boolean;
  references: string[];
  metadata: NoteMetadataField[];
  swimlaneName?: string;
  onPinnedChange: (val: boolean) => void;
  onReferencesChange: (refs: string[]) => void;
  onMetadataChange: (fields: NoteMetadataField[]) => void;
};
```

`NoteEditorContent` owns `isMetaOpen` state and passes the current note, pinned flag, references and metadata down.

### Layout Change in `NoteEditor`

A toggle button is added to the header action row — rightmost before the destructive actions (Archive, Delete) — using `PanelRight` / `PanelRightClose` icons and titled "Show properties" / "Hide properties".

The `flex-1 overflow-hidden` content area becomes a flex row:

```
┌──────────────────────────────────────┬───────────────────┐
│  TiptapEditor  (flex-1 min-w-0)      │ NoteMetadataPanel │
│                                      │ (w-72 shrink-0    │
│                                      │  border-l)        │
└──────────────────────────────────────┴───────────────────┘
```

When `isMetaOpen` is false, the panel is unmounted and the editor takes full width. It is only mounted while a note is open.

### Panel Fields

| Field | Editable | Notes |
|---|---|---|
| ID | No | Short display + copy-to-clipboard button |
| Created | No | `toLocaleString()` |
| Updated | No | `toLocaleString()` |
| Swimlane | No | Display only, and only when the swimlane name is known |
| Pinned | Yes | Switch, synced with the header pin button |
| Metadata | Yes | List of custom key/value fields (see below) |
| References | Yes | Editable list of freeform strings |

### Metadata Fields UI

Each field is a card with:

- a key input (trimmed on commit; internal whitespace becomes `_`; a blank key removes the field),
- a type select — Text, Number, Date, List, Boolean,
- a remove button,
- a value editor that follows the type: text input, number input, date picker, a boolean switch storing `"true"`/`"false"`, or a `MetadataListValue` editor that stores a JSON-encoded string array.

Changes are committed on blur or Enter via `onMetadataChange(fields)`. An `+ Add field` button appends a blank text field and focuses the key input.

### References UI

- Each reference: a text `<Input>` + `×` remove button in a row.
- Changes commit on blur or Enter via `onReferencesChange(newList)`.
- `+ Add reference` appends a blank input and focuses it.
- No validation — any string is accepted (note titles, URLs, free text).

### Pinned Sync

`NoteEditor` holds `pinned` state and passes it to `<NoteMetadataPanel>`. The panel calls `onPinnedChange`, which updates the parent state identically to the header pin button. Both controls reflect the same value.

### Panel Visual Layout

```
┌────────────────────────────┐
│ Properties                 │
├────────────────────────────┤
│ ID       abc123…   [copy]  │
│ Created  Jun 13, 2026      │
│ Updated  Jun 13, 2026      │
│ Swimlane Work              │
│ Pinned   ●────────         │
├────────────────────────────┤
│ Metadata                   │
│ source  [Text]   example…  │
│ rating  [Number] 5         │
│ [+ Add field]              │
├────────────────────────────┤
│ References                 │
│ [[Research Notes]]    [×]  │
│ https://example.com   [×]  │
│ [+ Add reference]          │
└────────────────────────────┘
```

---

## Feature D: Highlight Colors

### Toolbar Change (`EditorToolbar.tsx`)

A `HighlightColorPicker` sub-component is defined in the same file. It renders:

- **Main button** — `Highlighter` icon with a small colored dot (showing last-used color). Clicking applies `setHighlight({ color: lastColor })`, or `unsetHighlight()` when the selection is already highlighted.
- **Chevron button** — opens a swatch row with 6 colors.

Last-used color is held in local `useState` inside `HighlightColorPicker` (defaults to yellow).

### Color Palette

```typescript
const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green',  value: '#bbf7d0' },
  { label: 'Blue',   value: '#bae6fd' },
  { label: 'Pink',   value: '#fbcfe8' },
  { label: 'Orange', value: '#fed7aa' },
  { label: 'Purple', value: '#e9d5ff' },
];
```

`TiptapEditor.tsx` configures `@tiptap/extension-highlight` with `multicolor: true`, which reads/writes the color as `background-color`.

### Color Persistence (Markdown Serializer)

**`jsonToMarkdown`** — `highlight` mark case:

```typescript
case "highlight":
  if (mark.attrs?.color) {
    text = `<mark style="background-color: ${mark.attrs.color}">${text}</mark>`;
  } else {
    text = `==${text}==`;  // yellow default
  }
  break;
```

**`markdownToHtml`** converts `==text==` to `<mark>`; colored marks are raw HTML pass-throughs. On load, Tiptap's Highlight extension parses `style.backgroundColor` back into the mark color, so colors survive save/reload.

**DOMPurify config** — `ADD_ATTR` includes `"style"` and `ADD_TAGS` includes `"mark"`, so colored highlights are not stripped by sanitization.

---

## File Change Summary

| File | Role | Description |
|---|---|---|
| `src/lib/frontmatter.ts` | Create | `parseFrontmatter`, `serializeFrontmatter`, `slugifyTitle` |
| `src/components/notes/NoteMetadataPanel.tsx` | Create | Obsidian-style properties sidebar panel |
| `src/components/notes/NotesBoard.tsx` | Modify | "Import .md" item in the per-swimlane sidebar menu |
| `src/components/notes/NoteEditor.tsx` | Modify | Export button; metadata panel toggle + layout split |
| `src/components/notes/EditorToolbar.tsx` | Modify | `HighlightColorPicker` sub-component replacing single button |
| `src/components/notes/extensions/markdown-serializer.ts` | Modify | Color-aware highlight serialization; DOMPurify `style` allowance |
| `src/lib/types.ts` | Modify | `NoteMetadataField`, `NoteMetadataType`, `Note.metadata` |

---

## Verification Checklist

- [ ] Import `.md` with frontmatter → note created with correct title and tags
- [ ] Import `.md` with custom keys → they appear as metadata fields in the panel
- [ ] Import `.md` without frontmatter → title derived from filename
- [ ] Import file > 5 MB → alert error, no note created
- [ ] Export note → file downloads with correct frontmatter and content
- [ ] Export → re-import → title, tags and custom metadata round-trip
- [ ] Metadata panel toggle shows/hides the panel without affecting editor content
- [ ] Adding/removing a metadata field updates `note.metadata` and persists
- [ ] Editing references in the panel updates `note.references` and persists
- [ ] Toggling pinned in the panel updates the header pin button
- [ ] Applying a non-yellow highlight → color persists after save and reload
- [ ] Applying highlight to already-highlighted text → highlight removed
- [ ] Existing `==text==` notes load with yellow highlight correctly
