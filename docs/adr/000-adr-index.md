# Architecture Decision Records

This directory holds the application's Architecture Decision Records (ADRs). One
decision per file, numbered in order of creation. A record states the situation,
the alternatives that were weighed, the decision, and what the decision costs.

Statuses:

| Status | Meaning |
|--------|---------|
| **Proposed** | Written down but not yet reflected in the code. |
| **Accepted** | The decision is implemented and governs the current code. |
| **Superseded** | The decision is history; a later decision replaced it. Kept as a record. |
| **Rejected** | The alternatives were weighed and this one was not taken, or it was taken and later abandoned. |

New records start from [`template.md`](./template.md). Keep a record's original
text when its status changes — mark it **Superseded** and add a note saying what
replaced it rather than rewriting history.

## Index

| # | Decision | Status | Summary |
|---|----------|--------|---------|
| [001](./001-rxdb-as-database.md) | RxDB as Database | Accepted | Use RxDB with the Dexie storage adapter over IndexedDB as the local database of record. |
| [002](./002-cloudflare-workers.md) | Cloudflare Workers as Backend | Superseded | Historical record of the Workers + R2 + D1 backend design. Supabase replaced it. |
| [004](./004-simplified-sidebar-with-board-filter.md) | Simplified Sidebar with Board Filter | Accepted | Single-board navigation with a filtered swimlane list, a dedicated Kanban Columns settings tab, and a configurable archive column. |
| [005](./005-crdt-sync-strategy.md) | CRDT Sync Strategy with RxDB and Cloudflare D1 | Rejected | The selected RxDB + D1 replication design was never implemented. Sync shipped as RxDB replication to Supabase. |
| [006](./006-habit-streak-calculation.md) | Habit Streak Calculation Rules | Accepted | Current streak, longest streak and total count over a 365-day window, with `value = -1` treated as an intentional skip. |
| [007](./007-campaign-invite-codes.md) | Campaign Codes | Accepted | Reusable multi-use invite codes with a maximum use count, an expiry date, and per-user usage tracking. |
| [008](./008-dark-mode-support.md) | Dark Mode Support | Accepted | Light / dark / system theming via a Zustand theme store, a provider that applies the `.dark` class, and a header toggle. |
| [009](./009-compact-mode-layout.md) | Compact Mode Layout | Accepted | Board and swimlane selection move into dropdowns at the top of the middle panel instead of a separate sidebar. |
| [010](./010-tasks-view-restructure.md) | Tasks View Restructure | Accepted | Task views are grouped under `/tasks/*` and share one display panel for view switching and filters. |
| [011](./011-referral-invite-code-system.md) | Referral / Invite Code System | Accepted | One auto-generated 8-character referral code per user: five uses, three-month expiry, anonymised usage list. |
| [012](./012-timeblocks-and-timebox.md) | Time Blocks and Time Box | Accepted | Swimlane-scoped recurring time blocks that override the recurrence of linked habits and routines, plus a planned duration on tasks. |
| [013](./013-note-markdown-io-metadata.md) | Note Markdown Import/Export, Custom Metadata & Highlight Colors | Accepted | Notes move in and out as Markdown with YAML frontmatter, carry typed custom metadata fields, and keep coloured highlights. |
| [014](./014-local-mode.md) | Local Mode | Accepted | `NEXT_PUBLIC_LOCAL_MODE=true` runs the app with no backend; every other value is Cloud Mode. Resolved at build time. |
| [015](./015-distinct-swimlane-color-selection.md) | Distinct Color Selection for Swimlanes | Accepted | New swimlanes default to a greedy max-min Delta-E76 hue sweep over the board's existing colors. |
