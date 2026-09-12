# TD-005: Monolithic Board Components Decomposition

## Status

**Open / Accepted Debt** — 2026-09-12

## Context

Two core visual boards in the application have accumulated substantial complexity and line counts:
1. [`KanbanBoard.tsx`](file:///Users/hozgan/devbox/personal/buobu-oss/src/components/kanban/KanbanBoard.tsx) (~1,100 lines)
2. [`HabitsBoard.tsx`](file:///Users/hozgan/devbox/personal/buobu-oss/src/components/habits/HabitsBoard.tsx) (~980 lines)

### Symptoms & Violations of Single Responsibility Principle (SRP)

- **Mixed Concerns:**
  Both components handle:
  - Drag-and-drop orchestration (@dnd-kit sensors, collision detection, overlay rendering, drag event handlers).
  - Modal and dialog lifecycle management (creation modals, edit modals, detail dialogs, reorder dialogs).
  - Search, tag filtering, swimlane filtering, and URL query synchronization.
  - Seeding logic and repository mutations.
  - Complex multi-level DOM layout and responsive collapse state.
- **Maintenance & Test Friction:**
  Modifying one feature (e.g. adding a filter) requires navigating a 1,000+ line component, increasing regression risk.
- **Re-render Scope:**
  State changes to transient drag operations or input filters trigger re-renders across wide sub-trees.

## Remediation Plan

Decompose each monolithic board following clean architectural layers:

### 1. Extract Custom Domain Hooks
- `useKanbanDndOrchestration`: Encapsulate `@dnd-kit` collision detection, active drag item, drag over/end handlers.
- `useKanbanFilters`: Encapsulate query params, tag filters, and search terms.
- `useHabitsDateNavigation`: Encapsulate date range, anchor switching, and preview logs.

### 2. Extract Sub-Components
- Move modals and dialogs to dedicated sub-components (e.g. `HabitModalsContainer.tsx`, `KanbanModalsContainer.tsx`).
- Extract header filter toolbars into standalone dumb presentational components (`KanbanBoardToolbar.tsx`, `HabitsBoardToolbar.tsx`).

## Related

- Issue [#19](https://github.com/netologist/buobu/issues/19)
- [`src/components/kanban/KanbanBoard.tsx`](file:///Users/hozgan/devbox/personal/buobu-oss/src/components/kanban/KanbanBoard.tsx)
- [`src/components/habits/HabitsBoard.tsx`](file:///Users/hozgan/devbox/personal/buobu-oss/src/components/habits/HabitsBoard.tsx)
- [React Standards](../standards/react.md)
