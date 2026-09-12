# Technical Debt

This directory tracks known architectural limitations, vendor restrictions, and deferred refactors across the codebase. Each entry documents the context, current mitigation, and potential paths forward.

## Index

| ID | Issue | Title | Status | Component | Discovered |
|---|---|---|---|---|---|
| [TD-001](./TD-001-rxdb-v17-upgrade-blocker.md) | [#14](https://github.com/netologist/buobu/issues/14) | RxDB v17 Upgrade Blocked by Free Edition Collection Limit (COL23) | Resolved | Database (`src/lib/rxdb.ts`) | 2026-09-12 |
| [TD-002](./TD-002-non-standard-uuidv7-and-id-fragmentation.md) | [#16](https://github.com/netologist/buobu/issues/16) | Non-Standard UUIDv7 Implementation and ID Generation Fragmentation | Open | Core Utils (`src/lib/uuid.ts`) | 2026-09-12 |
| [TD-003](./TD-003-unused-rxdb-collections-bloat.md) | [#17](https://github.com/netologist/buobu/issues/17) | Unused RxDB Collections Bloat and RxDB v17 Unlock Opportunity | Resolved | Database (`src/lib/rxdb.ts`) | 2026-09-12 |
| [TD-004](./TD-004-state-management-dualism-and-disconnected-atoms.md) | [#18](https://github.com/netologist/buobu/issues/18) | State Management Dualism (Zustand vs Jotai) and Disconnected Atoms | Partially Resolved | Stores (`src/stores/`) | 2026-09-12 |
| [TD-005](./TD-005-monolithic-board-components-decomposition.md) | [#19](https://github.com/netologist/buobu/issues/19) | Monolithic Board Components Decomposition | Open | Kanban / Habits Boards | 2026-09-12 |
| [TD-006](./TD-006-ui-component-file-naming-inconsistency.md) | [#20](https://github.com/netologist/buobu/issues/20) | UI Component File Naming Inconsistency | Resolved | UI (`src/components/ui/`) | 2026-09-12 |
| [TD-007](./TD-007-referral-service-implementation-duality.md) | [#21](https://github.com/netologist/buobu/issues/21) | Referral Service Implementation Duality | Resolved | Referral / Auth | 2026-09-12 |
