# Frontend Tech Stack

## Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | App Router. `next.config.ts` sets `output: "export"`, so a production build is a static export in `out/` |
| React | 18.3.1 | UI components |
| TypeScript | 5.x | Type safety (`tsc --noEmit` via `pnpm typecheck`) |
| Tailwind CSS | 4.x | Styling, configured through PostCSS |

The exported build has no application server. Route handlers under `src/app/api/**` only run under `pnpm dev`.

The path alias `@/*` maps to `src/*`.

## UI Components

| Library | Purpose |
|---------|---------|
| shadcn/ui | Base components under `src/components/ui/` (New York style, neutral base color) |
| radix-ui | Accessible primitives behind those components |
| lucide-react | Icons |
| class-variance-authority, clsx, tailwind-merge | Variant and class-name composition (`cn()` in `src/lib/utils.ts`) |
| cmdk | Command palette |

## Key Dependencies

### Rich Text & Editing

| Package | Purpose |
|---------|---------|
| @tiptap/* | Rich text editor (v3), with table, task-list, highlight, image, link and math extensions |
| lowlight | Syntax highlighting in code blocks |
| marked | Markdown rendering |
| dompurify | Sanitizing the HTML produced from Markdown |
| mermaid | Diagram rendering |
| katex | Math rendering |

### Data & State

| Package | Purpose |
|---------|---------|
| rxdb | Local database, on the Dexie IndexedDB storage |
| @supabase/supabase-js | Cloud Mode auth, PostgREST access and Realtime |
| zustand | App state stores (`src/stores/*.ts`) |
| jotai | Atoms holding reactive query results (`src/stores/atoms/`) |
| idb | IndexedDB helpers |
| nanoid | Short identifiers |
| zod | Schema validation |
| react-hook-form, @hookform/resolvers | Form state and validation |

Entity identifiers are UUID v7 values produced by `src/lib/uuid.ts`.

### Visualization

| Package | Purpose |
|---------|---------|
| @excalidraw/excalidraw | Drawing canvas for vision board items |
| recharts | Charts |
| @fullcalendar/* | Calendar views |

### Drag & Drop

| Package | Purpose |
|---------|---------|
| @dnd-kit/* | Drag and drop (core, sortable, utilities) |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Boot route: mode check, then redirect or landing page
│   ├── layout.tsx         # Root layout
│   ├── tasks/             # kanban-view, calendar-view, cash-flow-view, list-view
│   ├── habits/            # Habit tracking
│   ├── notes/             # Notes editor
│   ├── mindmaps/          # Mind map editor
│   ├── whiteboards/       # Vision board
│   ├── routines/          # Recurring routines
│   ├── bookmarks/         # Saved links
│   ├── timeblocks/        # Day timeblocks
│   ├── boards/            # new/ and view/
│   ├── archive/           # Archived entity browser
│   ├── home/              # Optional dashboard (NEXT_PUBLIC_HOME_PAGE_ENABLED)
│   ├── auth/              # login, register, forgot-password, reset-password
│   └── api/stripe/        # checkout, portal, webhook — run under pnpm dev only
├── components/
│   ├── kanban/            # Board, header and sync-status UI
│   ├── habits/  notes/  mindmap/  vision/  bookmarks/
│   ├── routines/  timeblocks/  transactions/  settings/  subscriptions/
│   ├── onboarding/  import-export/  layout/  landing/  auth/  home/  theme/
│   └── ui/                # shadcn/ui components
├── hooks/                  # Shared React hooks
├── stores/                 # Zustand stores, with atoms/ and hooks/ for Jotai bridges
├── reducers/               # Task editor, pomodoro and UI panel reducers
├── contexts/               # NamingContext, BoardConfigContext
├── data/                   # Seed JSON (boards, habits, onboarding presets)
├── test/                   # Vitest setup, factories, mocks, helpers
└── lib/                    # rxdb.ts, types.ts, supabase.ts, supabase-replication.ts, auth/, ...
```

## Build & Dev

```bash
pnpm dev        # Dev server (the script sets NEXT_TURBOPACK=0)
pnpm build      # Production build → static export in out/
pnpm lint       # ESLint
pnpm typecheck  # TypeScript check
pnpm test       # Vitest in watch mode (pnpm test:run for a single pass)
pnpm test:e2e   # Playwright
```
