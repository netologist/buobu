# TD-004: State Management Dualism (Zustand vs Jotai) and Disconnected Atoms

## Status

**Partially Resolved** — 2026-09-12 (Disconnected `backlog.ts` atoms pruned in Issue #18; Jotai entity stores remain active for live RxDB queries)

## Context

The application currently employs two concurrent global state management libraries:
1. **Zustand** (`zustand`): Used for `board-store`, `sync-store`, `entitlements-store`, `swimlane-selection-store`, `theme-store`, `auth-store`, `nav-visibility-store`, `archive-stores`, and `apps-bar-store`.
2. **Jotai** (`jotai`): Used in `src/stores/atoms/` for atomic pieces of state (`backlog.ts`, `auth.ts`, `settings.ts`, `theme.ts`, `mindmap.ts`).

### Architectural Friction

1. **Dual Mental Model:**
   Developers must context-switch between Zustand's selector/action pattern (`useBoardStore((s) => s.boards)`) and Jotai's atom/hook pattern (`useAtom(themeAtom)`).
2. **Disconnected Atoms (Dead State):**
   In [`src/stores/atoms/backlog.ts`](file:///Users/hozgan/devbox/personal/buobu-oss/src/stores/atoms/backlog.ts):
   - `backlogItemsAtom`, `swimlaneBacklogAtomFamily`, `backlogLoadingAtom`, `backlogErrorAtom` are declared and tested.
   - However, the real backlog domain is managed through custom React hooks ([`useBacklogManager.ts`](file:///Users/hozgan/devbox/personal/buobu-oss/src/hooks/useBacklogManager.ts)) querying RxDB directly. The Jotai atoms are never connected to the UI or repository in production.
3. **Redundant Stores:**
   Both `theme-store.ts` (Zustand) and `theme.ts` (Jotai) exist, creating potential drift in theme synchronization.

## Remediation Plan

1. **Standardize on Zustand:**
   Since Zustand already powers 90% of the application's global state and sync lifecycle, migrate remaining active Jotai atoms to Zustand slices.
2. **Deprecate Disconnected Atoms:**
   Remove `src/stores/atoms/backlog.ts` and ensure backlog state flows solely through the RxDB repository and active manager hooks.
3. **Remove `jotai` Dependency:**
   Once all atoms are migrated or pruned, uninstall `jotai` to reduce bundle size and dependency footprint.

## Related

- Issue [#18](https://github.com/netologist/buobu/issues/18)
- [`src/stores/`](file:///Users/hozgan/devbox/personal/buobu-oss/src/stores/)
- [`src/stores/atoms/backlog.ts`](file:///Users/hozgan/devbox/personal/buobu-oss/src/stores/atoms/backlog.ts)
- [Architecture Stores Overview](../architecture/modules/stores.md)
