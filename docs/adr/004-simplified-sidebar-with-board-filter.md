# ADR-004: Simplified Sidebar with Board Filter

## Status

**Accepted** — shipped. The sidebar is now a board selector plus the selected
board's swimlanes (rendered by `CompactNavigation`, see
[ADR-009](./009-compact-mode-layout.md)), board settings have a dedicated
**Kanban Columns** tab (`BoardModalColumnsTab`, also reachable at
`/boards/view`), and boards carry `archiveColumnId` and `showArchiveColumn`.

## Context

The current sidebar implementation displays all boards with their swimlanes in a hierarchical tree structure. As the number of boards grows, this becomes:

1. **Visual clutter**: Multiple expanded boards consume significant vertical space
2. **Cognitive load**: Users must scan through all boards to find relevant swimlanes
3. **Inconsistent navigation**: No clear "active board" concept - users work across multiple boards simultaneously
4. **Missing features**: 
   - No quick way to add new boards from sidebar
   - Columns are managed in General tab of board settings, mixed with other settings
   - Archive behavior is hardcoded to "done" column

Additionally, the "done" column behavior (completed tasks) is hardcoded, but users may want different columns to represent completion states.

## Alternatives Considered

### Option 1: Keep Current Tree Structure
- **Pros:**
  - No breaking changes
  - Users can see all swimlanes at once
  - Multi-board selection already works
- **Cons:**
  - Doesn't scale with many boards
  - No board-level focus
  - Columns mixed with general settings

### Option 2: Full Workspace Redesign
- **Pros:**
  - Complete UX overhaul
  - Could introduce workspaces above boards
- **Cons:**
  - Too large scope
  - High risk of breaking existing workflows
  - Extended development time

### Option 3: Board Dropdown with Enhanced Board Settings (Selected)
- **Pros:**
  - Focused single-board view in sidebar
  - Cleaner sidebar UI
  - Dedicated Kanban Columns tab for better column management
  - Drag-to-reorder columns in dedicated tab
  - Configurable archive column
- **Cons:**
  - Loses multi-board swimlane selection
  - Requires sidebar and board settings restructuring

## Decision

### 1. Simplified Sidebar
- Board dropdown selector at top (single board selection)
- Filtered swimlane list for selected board
- "Add Board" button next to dropdown
- No tabs in sidebar

### 2. Enhanced Board Settings Page (/boards/view)
Add new **Kanban Columns** tab alongside existing tabs:
- **General Tab**: Board name, week start (columns removed from here)
- **Swimlanes Tab**: Existing swimlane management (unchanged)
- **Kanban Columns Tab** (NEW):
  - Drag-to-reorder columns
  - Add/Edit/Delete columns
  - Archive Column dropdown selector
  - Show Archive Column toggle
  - Dedicated Archive column management

### 3. Archive Column Configuration
- Board type gains `archiveColumnId` field (default: "done")
- Tasks in archive column show "completed" UI (strikethrough)
- Dedicated "Archive" column at far right (toggleable visibility)
- Archived tasks stored with `archived: true` and `columnId` pointing to archive column

### 4. Type Changes

```typescript
type Board = {
  // ... existing fields
  archiveColumnId?: string;      // Which column shows "done" behavior
  showArchiveColumn?: boolean;   // Toggle archive column visibility
}

type BoardColumn = {
  id: string;
  title: string;
  order?: number;  // NEW: for drag-to-reorder persistence
}
```

## Consequences

### Positive
- Cleaner, more focused sidebar UI
- Board-level filtering reduces visual noise
- Dedicated Kanban Columns tab for better organization
- Column drag-to-reorder in dedicated space
- Flexible archive column configuration per board
- Easier to add future column-level features

### Negative
- Loses ability to select swimlanes across multiple boards
- Users accustomed to tree view may need adjustment
- More clicks to switch between boards (dropdown vs. direct click)
- Column management moved from General to separate tab

### Neutral
- `useSwimlaneSelectionStore` (Zustand) still holds the selection, now scoped to
  a single board
- Existing task/board data migration needed for `archiveColumnId` defaults

## Related

- [ADR-009: Compact Mode Layout](./009-compact-mode-layout.md) — the navigation
  arrangement this decision led to.
