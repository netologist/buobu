# TD-006: UI Component File Naming Inconsistency

## Status

**Resolved** — 2026-09-12 (All components in `src/components/ui/` standardized to kebab-case; closed in Issue #20)

## Context

Inside [`src/components/ui/`](file:///Users/hozgan/devbox/personal/buobu-oss/src/components/ui/), two competing file naming conventions coexist side-by-side:

### Mixed Conventions in the Same Directory

| File | Convention |
|---|---|
| `BoardModal.tsx` | PascalCase |
| `ConfirmDialog.tsx` | PascalCase |
| `PromptDialog.tsx` | PascalCase |
| `ReorderModal.tsx` | PascalCase |
| `ReorderColumnsModal.tsx` | PascalCase |
| `app-logo.tsx` | kebab-case |
| `column-dialog.tsx` | kebab-case |
| `global-search-palette.tsx` | kebab-case |
| `reorder-boards-modal.tsx` | kebab-case |
| `reorder-swimlanes-modal.tsx` | kebab-case |
| `swimlane-dialog.tsx` | kebab-case |

Notice that `ReorderColumnsModal.tsx` uses PascalCase while its immediate sister modals `reorder-boards-modal.tsx` and `reorder-swimlanes-modal.tsx` use kebab-case.

### Impact

- **Case-Sensitivity Issues on Linux/Docker/CI:** Operating systems with case-sensitive filesystems (such as standard CI environments or Docker containers) can fail on casing typos or import discrepancies.
- **Developer Confusion:** Unclear standard for where new UI components should follow shadcn/ui convention (`kebab-case.tsx`) or legacy React convention (`PascalCase.tsx`).

## Remediation Plan

1. **Standardize on kebab-case:** Align all UI components under `src/components/ui/` with the standard kebab-case convention (consistent with shadcn/ui and Next.js guidelines).
2. **Safe Transition:**
   - Rename `BoardModal.tsx` -> `board-modal.tsx`
   - Rename `ConfirmDialog.tsx` -> `confirm-dialog.tsx`
   - Rename `PromptDialog.tsx` -> `prompt-dialog.tsx`
   - Rename `ReorderModal.tsx` -> `reorder-modal.tsx`
   - Rename `ReorderColumnsModal.tsx` -> `reorder-columns-modal.tsx`
   - Update all import sites in a single dedicated commit.

## Related

- Issue [#20](https://github.com/netologist/buobu/issues/20)
- [`src/components/ui/`](file:///Users/hozgan/devbox/personal/buobu-oss/src/components/ui/)
- [TypeScript Standards](../standards/typescript.md)
