# ADR-008: Dark Mode Support

## Status

**Accepted** — 2026-03, shipped. Theme state lives in `src/stores/theme-store.ts`,
`src/components/theme/ThemeProvider.tsx` applies the `.dark` class to `<html>`,
and `src/components/kanban/AppHeaderThemeToggle.tsx` renders the toggle in the
header.

## Context

The application previously lacked dark mode support, which is a standard expectation for modern productivity applications. Users working in low-light environments or preferring dark themes need the ability to switch between light and dark modes for:

- Better visual comfort
- Reduced eye strain during extended use
- Personal preference alignment
- Consistency with system-wide theme settings

### State before this decision

- Dark mode CSS variables were already defined in `globals.css` (`.dark` class)
- Tailwind v4 is configured with the `@custom-variant dark` directive
- Some components already used dark mode classes (e.g., button variants)
- No theme toggle button exists in the UI
- No state management for theme preference
- No mechanism to apply `.dark` class to `html` element
- No persistence of theme preference

## Alternatives Considered

### Option 1: CSS-only Solution with prefers-color-scheme
- **Pros:** Simple implementation, no JavaScript required, automatic system detection
- **Cons:** No manual toggle, no preference persistence, limited control

### Option 2: Local Storage with Manual Toggle
- **Pros:** User control, persistence per device, simple state management
- **Cons:** No system preference detection, requires manual selection on each new device

### Option 3: System Preference + Manual Override (Selected)
- **Pros:** Best of both worlds - respects system preference by default, allows manual override, familiar UX pattern
- **Cons:** Slightly more complex state management, requires three-state logic (light/dark/system)

### Option 4: Sync Theme Preference to User Database
- **Pros:** Consistent theme across all devices for a user
- **Cons:** Requires database schema change, slower initialization, privacy considerations, adds complexity to offline-first architecture

## Decision

Implement dark mode support using **System Preference + Manual Override** with the following architecture:

### 1. Theme Store (`src/stores/theme-store.ts`)
- Zustand store following existing patterns (see `auth-store.ts`, `sync-store.ts`)
- State:
  - `theme`: `'light' | 'dark' | 'system'`
  - `resolvedTheme`: `'light' | 'dark'` (computed from theme + system preference)
- Actions:
  - `setTheme(theme)`: Set theme preference
  - `toggleTheme()`: Cycle through themes (light → dark → system → light)
  - `initTheme()`: Load from localStorage and detect system preference
- Persistence: localStorage key `buobu-theme` (`STORAGE_KEYS.THEME` in `src/lib/constants.ts`)
- System preference detection: `window.matchMedia('(prefers-color-scheme: dark)')`

### 2. Theme Provider Component (`src/components/theme/ThemeProvider.tsx`)
- React component that wraps the application
- Responsibilities:
  - Initialize theme on mount (from localStorage or default to 'system')
  - Listen to system preference changes via `matchMedia` listener
  - Apply or remove `.dark` class on `<html>` element based on resolved theme
  - Update localStorage when theme changes
- Lifecycle:
  - Mount: Load preference → detect system → apply theme
  - Update: System preference changes → re-resolve theme
  - Unmount: Cleanup listeners

### 3. Theme Toggle Button
- Component: `src/components/kanban/AppHeaderThemeToggle.tsx`, rendered by `AppHeader` in the header actions area
- Behavior: Cycles through light → dark → system → light
- Visual indicators:
  - Light mode: Sun icon (`Sun` from lucide-react)
  - Dark mode: Moon icon (`Moon` from lucide-react)
  - System mode: Monitor/Laptop icon (`Monitor` from lucide-react)
- Tooltip shows current state and next action

### 4. Integration Points
- **Root Layout** (`src/app/layout.tsx`): Wrap children with `<ThemeProvider>`
- **CSS Variables**: Already defined in `globals.css`, no changes needed
- **Component Updates**: Gradually add `dark:` variants to components as needed

### 5. Default Behavior
- New users: Default to `'system'` (respects OS preference)
- Existing users: No stored preference, will default to `'system'` on first load
- localStorage key: `buobu-theme`

## Implementation Details

### Storage Schema
```typescript
// localStorage key: buobu-theme
type ThemePreference = 'light' | 'dark' | 'system';
```

### Theme Resolution Logic
```typescript
function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
```

### HTML Class Application
```typescript
function applyTheme(resolvedTheme: 'light' | 'dark') {
  const html = document.documentElement;
  if (resolvedTheme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}
```

## Consequences

### Positive
- Users can choose their preferred theme (accessibility improvement)
- Respects system preference by default (reduces friction for new users)
- Consistent with existing app patterns (Zustand store, localStorage persistence)
- No database schema changes required (maintains offline-first architecture)
- Simple to implement with existing Tailwind v4 setup
- Gradual rollout possible (toggle first, then improve individual components)

### Negative
- Theme preference is per-device (not synced across devices)
- Requires testing all existing components in dark mode
- Some hardcoded colors may need updating (e.g., calendar weekend colors in `globals.css`)
- Third-party libraries (Excalidraw, FullCalendar) may need separate theme configuration

## What shipped

Dark mode is live: theme preference persists across reloads under
`buobu-theme`, the initial load falls back to the system preference, the toggle
cycles light → dark → system, and `.dark` is applied to `<html>` by
`ThemeProvider`. Components migrate to `dark:` variants as they are touched;
third-party surfaces (Excalidraw, FullCalendar) are themed individually.

## Related

- CSS Variables: `src/app/globals.css`
- Existing Store Pattern: `src/stores/auth-store.ts`
