# TypeScript Standards

## Naming Conventions

### Variables & Functions

```typescript
// camelCase for variables and functions
const taskCount = 10;
function getTasksBySwimlane(swimlaneId: string) {}

// PascalCase for types and classes
type Task = { ... };
class McpAuthError extends Error {}

// SCREAMING_SNAKE_CASE for module-level constants
const MAX_RETRIES = 3;
const DEFAULT_SYNC_INTERVAL_MS = 30000;
```

### Files

```typescript
// React components: PascalCase .tsx
TaskCard.tsx
KanbanBoard.tsx

// Hooks, stores, utilities: kebab-case .ts
use-tasks.ts        // hooks are prefixed with 'use'
sync-store.ts
rxdb-repository.ts

// Next.js App Router: one kebab-case directory per route segment,
// with the framework's reserved lowercase file names
src/app/tasks/kanban-view/page.tsx
src/app/tasks/cash-flow-view/page.tsx
src/app/auth/reset-password/page.tsx
```

The distinction is deliberate: component files in `src/components/**` are PascalCase; hooks, stores, lib modules and App Router route segments are kebab-case. Route paths mirror the directory name, so `/tasks/kanban-view` and `/tasks/cash-flow-view`.

### Components

```typescript
// PascalCase matching file name
// TaskCard.tsx
export function TaskCard({ task }: TaskCardProps) {}
```

## Type Definitions

### Prefer Type Over Interface

```typescript
// Preferred
type Task = {
  id: string;
  title: string;
};

// Use interface only for extension
interface BaseRepository {
  findById(id: string): Promise<Entity>;
}

interface TaskRepository extends BaseRepository {
  findBySwimlane(swimlaneId: string): Promise<Task[]>;
}
```

### Strict Null Checks

`tsconfig.json` enables `strict`, so `null`/`undefined` must be handled explicitly.

```typescript
// Explicit optional
type Task = {
  deadline?: string | null;  // Can be undefined or null
  priority?: 'low' | 'medium' | 'high';
};

// Handle nulls explicitly
const title = task.title ?? 'Untitled';
```

### Utility Types

```typescript
// Use built-in utility types
type TaskCreate = Omit<Task, 'id' | '_createdAt'>;
type TaskUpdate = Partial<Pick<Task, 'title' | 'description'>>;
```

### Shared Entity Types

Domain entities are declared once in `src/lib/types.ts`. Every entity spreads `Partial<BaseEntity>`, which carries the sync bookkeeping fields:

```typescript
export type BaseEntity = {
  user_id: string;
  _modified: number;
  _version: number;
  _createdAt: string;
  _updatedAt: string;
  _deleted: boolean;
  _deviceId: string;
};
```

## Imports

### Order

```typescript
// 1. React/Next
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. External libraries
import type { RxCollection } from 'rxdb';

// 3. Internal - absolute paths
import type { Task, Swimlane } from '@/lib/types';
import { useTasks, taskActions } from '@/stores';

// 4. Internal - relative
import { TaskCard } from './TaskCard';
import type { Props } from './types';
```

The `@/*` alias maps to `src/*` for both TypeScript and Vite/Vitest.

### Type Imports

```typescript
// Use 'type' keyword for type-only imports
import type { Task, Habit } from '@/lib/types';
import { getTasksBySwimlane } from '@/lib/db';  // Function import
```

## Async/Await

```typescript
// Prefer async/await over .then()
import { getTasksBySwimlane } from '@/lib/db';

async function fetchTasks(swimlaneId: string): Promise<Task[]> {
  try {
    return await getTasksBySwimlane(swimlaneId);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    throw error;
  }
}
```

For data that the UI renders, prefer the reactive path instead of a one-shot fetch: mount the entity subscription hook (`useTasksSubscription()`) and read the Jotai atom (`useTasks()`). See [React Standards](./react.md).

## Error Handling

Most modules throw plain `Error` with a descriptive message — for example `src/lib/db.ts` throws `new Error('User must be authenticated to access database')` when no cached user exists. Where a caller needs to distinguish failure modes, use a typed error class; the MCP layer's `McpAuthError` (`src/lib/mcp/context.ts`) is the pattern:

```typescript
// Use typed errors when callers must branch on the failure kind
export class McpAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpAuthError';
  }
}

throw new McpAuthError('Invalid or revoked API key');
```

## Comments

```typescript
// Only add comments for "why", not "what"
// BAD:
// Get tasks by swimlane
function getTasksBySwimlane(swimlaneId: string) {}

// GOOD:
// `swimlaneId` is declared in the tasks collection schema (lib/rxdb.ts)
// so per-swimlane queries stay on an index.
```

## Related

- [React Standards](./react.md)
