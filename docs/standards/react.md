# React Standards

## Component Structure

### File Organization

Component files use **PascalCase** and export a named function that matches the file name (`src/components/**`).

```typescript
// Component file structure
// TaskCard.tsx

import { useState } from 'react';
import type { Task } from '@/lib/types';

type TaskCardProps = {
  task: Task;
  onUpdate: (task: Task) => void;
};

export function TaskCard({ task, onUpdate }: TaskCardProps) {
  // 1. Hooks at top
  const [isEditing, setIsEditing] = useState(false);

  // 2. Derived state
  const isOverdue = task.deadline && new Date(task.deadline) < new Date();

  // 3. Handlers
  const handleClick = () => {
    setIsEditing(true);
  };

  // 4. Early returns
  if (task._deleted) return null;

  // 5. Render
  return (
    <div onClick={handleClick}>
      {task.title}
    </div>
  );
}
```

## Hooks

### Custom Hooks

Hooks live in `src/stores/hooks/` (kebab-case file names, `use-` prefix) and in `src/hooks/`. A data hook reads a Jotai atom; a subscription hook mounts the RxDB → Jotai bridge.

```typescript
// Prefix with 'use'; file names are kebab-case
// src/stores/hooks/use-tasks.ts
export function useTasksSubscription() {
  useRxCollectionSubscription('tasks', tasksAtom, tasksLoadingAtom);
}

export function useTasks() {
  return useAtomValue(tasksAtom);
}
```

A component mounts the subscription hook once (at page or provider level) and reads the data with the read hook:

```tsx
'use client';
import { useTasksSubscription, useTasks, useTasksLoading } from '@/stores';

function TasksPage() {
  useTasksSubscription(); // activates the reactive data flow
  const tasks = useTasks();
  const isLoading = useTasksLoading();

  if (isLoading) return <LoadingSpinner />;
  return <TaskList tasks={tasks} />;
}
```

### Hook Rules

```typescript
// Call hooks at top level, not in conditions
// BAD:
if (condition) {
  const [state, setState] = useState();
}

// GOOD:
const [state, setState] = useState();
if (condition) {
  // use state
}
```

## State Management

### Local State

```typescript
// Use for UI-only state
const [isOpen, setIsOpen] = useState(false);
const [selectedId, setSelectedId] = useState<string | null>(null);
```

### Derived State

```typescript
// Compute from props or other state, don't duplicate
const filteredTasks = useMemo(
  () => tasks.filter(t => !t.archived),
  [tasks]
);
```

### Persisted Data (RxDB → Jotai)

Local data lives in RxDB (IndexedDB). The bridge hook `useRxSubscription` from `src/stores/hooks/use-rx-subscription.ts` subscribes to a reactive RxDB query and writes the results into a Jotai atom. Entity hooks wrap it:

```typescript
// Reactively subscribe, then read from the atom
useTasksSubscription();          // all tasks
useBoardTasksSubscription(boardId); // tasks for one board
const tasks = useTasks();
```

Write-through mutations go through the action objects exported by each hook file:

```typescript
// src/stores/hooks/use-tasks.ts
export const taskActions = {
  put: db.putTask,
  delete: db.deleteTask,
};
```

## Event Handlers

```typescript
// Prefix with 'handle'
import { taskActions } from '@/stores';
import { uuidv7 } from '@/lib/uuid';

const handleTaskCreate = async (data: Omit<Task, 'id'>) => {
  await taskActions.put({ ...data, id: uuidv7() });
};

const handleTaskUpdate = async (task: Task, changes: Partial<Task>) => {
  await taskActions.put({ ...task, ...changes });
};

const handleTaskDelete = async (taskId: string) => {
  await taskActions.delete(taskId);
};
```

The RxDB subscription picks up the write and updates the atom, so no manual refresh is needed. For reads outside a subscription, `src/lib/db.ts` exposes one-shot getters (`getTasksByBoard`, `getTasksBySwimlane`, `getAllTasks`, …).

## Component Patterns

### Container/Presentational

```typescript
// Container (logic)
function TaskListContainer({ swimlaneId }: Props) {
  const tasks = useTasks();
  const handleUpdate = useCallback(
    (task: Task) => taskActions.put(task),
    []
  );

  return <TaskList tasks={tasks} onUpdate={handleUpdate} />;
}

// Presentational (UI)
function TaskList({ tasks, onUpdate }: TaskListProps) {
  return (
    <ul>
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} onUpdate={onUpdate} />
      ))}
    </ul>
  );
}
```

### Composition

```typescript
// Prefer composition over prop drilling
<KanbanBoard>
  <KanbanHeader />
  <KanbanSwimlanes>
    {swimlanes.map(sw => (
      <KanbanSwimlane key={sw.id} swimlane={sw}>
        <KanbanCards />
      </KanbanSwimlane>
    ))}
  </KanbanSwimlanes>
</KanbanBoard>
```

## Performance

### Memoization

```typescript
// Memo expensive components
import { memo } from 'react';

const TaskCard = memo(function TaskCard({ task }: Props) {
  return <div>{task.title}</div>;
});

// Memo callbacks
const handleUpdate = useCallback(
  (task: Task) => taskActions.put(task),
  []
);
```

### Keys

```typescript
// Use stable IDs, not index
// GOOD:
{tasks.map(task => <TaskCard key={task.id} task={task} />)}

// BAD:
{tasks.map((task, index) => <TaskCard key={index} task={task} />)}
```

## Error Boundaries

```typescript
// Wrap error-prone sections
<ErrorBoundary>
  <TaskEditor />
</ErrorBoundary>
```

`ErrorBoundary` (`src/components/ui/ErrorBoundary.tsx`) takes only `children` and renders its own fallback UI with a retry button; it is mounted once around the provider tree in `src/components/AppProviders.tsx`.

## Related

- [TypeScript Standards](./typescript.md)
