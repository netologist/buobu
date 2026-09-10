# ADR-009: Compact Mode Layout

## Status
**Accepted** — shipped. The dense middle-panel navigation is the arrangement the
application uses on every board page; see [What shipped](#what-shipped).

## Context
The current three-column layout (Sidebar + Middle Panel + Right Panel) works well for most users, but some users with larger monitors or those who prefer denser information display want more screen space for the main content (Kanban board, Calendar, Notes, etc.) without scrolling.

Currently:
- Sidebar contains board dropdown selector and swimlane list (multi-select)
- Middle panel contains task/item list and detail view
- Right panel contains the main content

Users who want more screen real estate for their main content would benefit from an alternative layout that:
1. Hides the sidebar entirely
2. Moves board/swimlane selection into the middle panel
3. Allows the middle panel to be hidden/shown with a toggle button

## Decision
Compact navigation replaces the previous sidebar plus middle-panel arrangement:

1. **There is no separate sidebar.** The layout is an apps rail (`AppsBar`), a
   middle panel, and the main content area.
2. **Selection lives at the top of the middle panel**, in `CompactNavigation`:
   - Row 1: board dropdown (single select)
   - Row 2: swimlanes dropdown (multi-select, with per-swimlane task counts)
   - Below: the rest of the middle panel content (task list, detail view, etc.)
3. **Compact styling**: no extra titles or headers, just the dropdowns.
4. **The middle panel is toggleable on mobile.** On desktop it is a fixed `w-72`
   column; on mobile the header toggle opens it in a sheet
   (`AppLayoutMobileToggleButton` + `AppLayoutSheet`).
5. **The same arrangement is used on every board page**, so switching pages does
   not move the selectors.

## Layout Comparison
| Aspect | Before this decision | Shipped |
|--------|----------------------|---------|
| Sidebar | Dedicated column with a hierarchical board/swimlane tree | Removed — selection moved into the middle panel |
| Board Selector | In sidebar | Middle panel, row 1 (single select) |
| Swimlane Selector | In sidebar (list) | Middle panel, row 2 (multi-select dropdown) |
| Task List/Detail | In middle panel | Unchanged, below the navigation rows |
| Middle Panel | Always visible | Desktop: always visible (`w-72`). Mobile: sheet, opened from the header toggle |
| Content Area | Right panel | Unchanged |

## Pages Affected
Every page that mounts `AppLayout`:
- `KanbanBoard`, `TasksListBoard`, `TasksCalendar`, `TransactionsBoard`
- `HabitsBoard`, `NotesBoard`, `BookmarksBoard`
- `MindmapBoard`, `VisionBoard`
- `RoutinesBoard`, `TimeblocksBoard`

## What shipped
- The navigation rows are `src/components/layout/CompactNavigation.tsx`, split
  into `CompactNavigationBoardsPane` and `CompactNavigationSwimlanesPane`, with
  `CompactSwimlaneSearchInput` for filtering long swimlane lists.
- Both panes are rendered in a single dropdown by `CompactNavigationDropdown`.
- `AppLayout` builds the props and `AppLayoutMiddlePanelContent` places the
  navigation above the panel content (`[&>*:first-child]:hidden` keeps the
  panel's own header from duplicating it).
- Selection state lives in `useSwimlaneSelectionStore`; there is no layout-mode
  preference to persist, because compact navigation is not optional.

## Consequences
### Positive
- More screen space for main content (Kanban, Calendar, Notes, etc.)
- Cleaner, denser navigation for power users
- Same functionality, different arrangement
- Works on mobile and desktop
- Consistent behavior across all pages
- One navigation component in one place, at the top of the middle panel

### Negative
- Board and swimlane selection is one click deeper than a permanently visible tree
- Swimlane lists need their own search affordance to stay usable when a board has many swimlanes
- The panel's own header has to be suppressed to avoid duplicating the navigation rows

## Related
- [ADR-004: Simplified Sidebar with Board Filter](./004-simplified-sidebar-with-board-filter.md) — the original single-board sidebar design this builds on
- [ADR-008: Dark Mode Support](./008-dark-mode-support.md)
