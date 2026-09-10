# 010: Tasks View Restructure

**Date:** 2025-09-18  
**Status:** Accepted  

## Context

The application organizes task-related views (Kanban Board, Calendar, Cash Flow) in the top menu. Grouping them under a single "knowledge" category alongside a "workspace" category for other features created confusion because all three "knowledge" items are task-related.

Additionally, users need a unified way to switch between different task views while maintaining context and filters. The previous implementation required navigating to different URLs without a clear relationship between these views.

## Decision

The task-related views are grouped into a unified `/tasks` route with four sub-views:
- `/tasks/kanban-view` - Kanban board view (existing)
- `/tasks/calendar-view` - Calendar view (was `/calendar`)
- `/tasks/cash-flow-view` - Cash flow view (was `/transactions`)
- `/tasks/list-view` - List view (new)

A `TasksDisplayPanel` component lets users switch between these views while maintaining filter state and context.

The task entry in the top menu is a single **Tasks** item that links to `/tasks/kanban-view` and exposes the four views as sub-items. The remaining top-level entries are Routines, Time Blocks, Habits, Notes, Bookmarks, Whiteboards and Mindmaps; the definitions live in `src/lib/navigation/app-nav-items.ts`.

## Detailed Design

### URL Structure

```
/tasks                  → redirects to /tasks/kanban-view on desktop,
                          /tasks/list-view on mobile
/tasks/kanban-view      → Kanban board view
/tasks/calendar-view    → Calendar view (task dates)
/tasks/cash-flow-view   → Cash flow view (task transactions)
/tasks/list-view        → List view (tasks organized by columns as sections)
```

The old `/calendar` and `/transactions` routes no longer exist, and the static
export cannot issue HTTP redirects, so there are no redirects for them.

### TasksDisplayPanel Component

A new component that combines:
1. **Display mode tabs** - Switch between Kanban/Calendar/Cash Flow/List views
2. **Filter controls** - Existing filter functionality (search, date, deadline, priority, labels)

**Location:** Positioned at the top-right of the task view area (same as current filter panel location)

**Behavior:**
- High z-index for visibility
- Icon-only trigger button (or minimal "Display" text)
- Dropdown contains:
  - Search input
  - Display mode tabs
  - Filter controls (collapsible)
  - Reset button

**State Management:**
- Filter state persists across view switches (localStorage)
- Active tab reflects current URL/route
- Tab changes navigate to corresponding URL

### List View Design

**Structure:**
- Each board column becomes a collapsible section
- Section header shows column name and task count
- Tasks within each section displayed as a list
- Clicking a task opens the detail modal (same as Kanban)

**Drag & Drop:**
- Vertical drag: Reorder tasks within a section
- Horizontal drag: Move tasks between sections (column change)
- Uses @dnd-kit (same as KanbanBoard)

**Visual Design:**
```
┌─────────────────────────────────────┐
│ ▼ To Do (5)                         │
│   ┌───────────────────────────────┐ │
│   │ Task Title 1                  │ │
│   │ Date: Mar 20 | Priority: High │ │
│   └───────────────────────────────┘ │
│   ┌───────────────────────────────┐ │
│   │ Task Title 2                  │ │
│   │ Date: Mar 21 | Priority: Low  │ │
│   └───────────────────────────────┘ │
├─────────────────────────────────────┤
│ ▶ In Progress (3)                   │
│   ...                               │
└─────────────────────────────────────┘
```

### Component Architecture

**New Components:**
- `TasksDisplayPanel.tsx` - Unified display mode and filter panel, rendered by `TasksViewWrapper`
- `TasksListBoard.tsx` - New list view component
- Task detail editing lives in `src/components/kanban/task-detail/`, shared by both boards

**Modified Components:**
- `KanbanBoard.tsx` - Inline filter panel removed, uses TasksDisplayPanel
- `TasksCalendar.tsx` - Uses TasksDisplayPanel
- `TransactionsBoard.tsx` - Uses TasksDisplayPanel
- `AppHeader.tsx` - Navigation comes from `src/lib/navigation/app-nav-items.ts`

**Shared Logic:**
- Filter state lives in `src/stores/filter-store.ts` (Zustand, persisted)
- Task operations (create, update, delete)
- DndContext configuration, shared with `KanbanBoard` via `@dnd-kit`

### Implementation Order

1. **URL Structure Setup**
   - Create the `/tasks/` directory structure
   - Move existing pages
   - Update the header navigation

2. **TasksDisplayPanel Component**
   - Create component with display tabs and filters
   - Integrate with existing filter logic
   - Add navigation between views

3. **TasksListBoard Component**
   - Implement list layout with sections
   - Add drag & drop functionality
   - Integrate with existing task operations

4. **Integration**
   - Replace filter panels in all views
   - Verify navigation between views
   - Verify filter state persistence

## Consequences

### Positive
- Clearer navigation structure with all task views grouped together
- Unified filter state across all task views
- New list view provides alternative task visualization
- Simpler top menu with clear feature separation
- Better user experience with seamless view switching

### Negative
- Existing links to the old `/calendar` and `/transactions` routes broke; the
  static export cannot redirect them
- Additional component complexity (TasksDisplayPanel)
- Potential performance considerations for list view with many tasks

### Neutral
- Filter state is persisted in localStorage under `goals-kanban-filters-v2`
  (no backend sync)
- List view sections are based on columns (not swimlanes)
- The display panel uses the same visual style as the filter panel it replaced

## Alternatives Considered

1. **Keep current structure** - Would not address the confusion of task-related views being scattered
2. **Dashboard approach** - Single page with tabs instead of URL-based views - Would lose URL sharability
3. **Sidebar navigation** - Task views in sidebar instead of display panel - Would clutter sidebar

## Questions Resolved

1. **Section structure:** Columns as sections (not swimlanes); swimlane selection via the middle-panel navigation
2. **Display panel:** Icon-only trigger (cleaner appearance)
3. **List view sections:** Collapsible; collapse state is component-local
4. **Tasks route:** `/tasks` auto-redirects to `/tasks/kanban-view` on desktop and `/tasks/list-view` on mobile
5. **Filter panel:** The old panel is gone, integrated into the display panel

## Future Considerations

- List view could support grouping by swimlane as an alternative
- Display panel could support view-specific filters
- Keyboard shortcuts for view switching
- View preferences saved per user/board
