# ADR-006: Habit Streak Calculation Rules

## Status

**Accepted** - 2025-02

## Context

Habit tracking requires calculating three key metrics:
1. **Current Streak** - How many consecutive days the user has completed the habit up to today
2. **Longest Streak** - The longest consecutive completion streak in the habit's history
3. **Total Count** - Total number of days completed

These metrics were being recalculated on every render, causing performance issues. Additionally, the longest streak calculation was incorrect - it only counted completed days without considering missed scheduled days.

## Definitions

### Habit Log Values
- `value > 0` - **Completed** (1 = light, 2 = medium, 3 = dark intensity)
- `value = 0` - **Missed** (not completed)
- `value = -1` - **Skipped** (intentionally skipped)
- No log entry - Treated as **Missed**

### Important Notes
1. Streak calculations do NOT consider `frequencyDays`. All days are treated equally for streak purposes.
2. **365-Day Limit**: All calculations are limited to the last 365 days. Logs older than 365 days are ignored.

## Calculation Rules

### Rule 1: Current Streak

**Definition:** Number of consecutive completed days counting backwards from today (max 365 days).

**Algorithm:**
```
cursor = today
streak = 0
maxHistoryDate = today - 365 days
firstLogDate = max(earliest_log_date, maxHistoryDate)

while cursor >= firstLogDate:
  log = getLog(cursor)
  
  if log.value > 0:
    streak++
  else if log.value == -1:
    // Skip: don't count, don't break
    continue
  else:
    // Missed (value=0 or no log): streak ends
    break
  
  cursor--

return streak
```

**Examples:**
- Jan 1 ✓, Jan 2 ⊘, Jan 3 ✓, Jan 4 ✓ → Current streak = 3 (Jan 1, 3, 4)
- Jan 1 ✓, Jan 2 ✗, Jan 3 ✓, Jan 4 ✓ → Current streak = 2 (Jan 3, 4)
- Jan 1 ✓, Jan 2 (no log), Jan 3 ✓, Jan 4 ✓ → Current streak = 2

### Rule 2: Longest Streak

**Definition:** The longest sequence of consecutive completed days in the last 365 days.

**Algorithm:**
```
cursor = firstLogDate (max 365 days ago)
tempStreak = 0
maxStreak = 0

while cursor <= today:
  log = getLog(cursor)
  
  if log.value > 0:
    tempStreak++
    maxStreak = max(maxStreak, tempStreak)
  else if log.value == -1:
    // Skip: streak continues but day not counted
    continue
  else:
    // Missed: streak breaks
    tempStreak = 0
  
  cursor++

return maxStreak
```

**Examples:**
- Jan 1-5 all completed → Longest = 5
- Mon ✓, Tue ⊘, Wed ✓, Thu ✓, Fri ✓ → Longest = 4 (Mon, Wed, Thu, Fri)

### Rule 3: Total Count

**Definition:** Total number of days where the habit was completed (value > 0) in the last 365 days.

**Algorithm:**
```
count = 0
maxHistoryDate = today - 365 days

for each log where value > 0 AND log.date >= maxHistoryDate:
  count++

return count
```

**Note:** Skipped days and missed days are not counted.

## Calendar Navigation Limit

The habit board calendar navigation is also limited to 365 days:
- Users cannot navigate to dates older than 365 days from today
- The "previous" button is disabled when reaching the 365-day limit

## Performance Consideration

For now, calculations are done client-side on every render. If performance becomes an issue, consider caching stats in the Habit document.

## Related

- [ADR-001: RxDB as Database](./001-rxdb-as-database.md)
- Implementation: `src/lib/habits/stats.ts`
