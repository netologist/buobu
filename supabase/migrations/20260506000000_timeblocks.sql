-- Timeblocks & Time-box migration
-- 1. Create timeblocks table
-- 2. Add timeblockId to habits and routines
-- 3. Add timeboxMinutes to tasks
-- Follows same pattern as 20250920200000_routines.sql

-- ─── timeblocks ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.timeblocks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "boardId" TEXT NOT NULL,
  "swimlaneId" TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  recurrence JSONB NOT NULL,
  "order" DOUBLE PRECISION,
  archived BOOLEAN DEFAULT FALSE,
  "archivedAt" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  _version INTEGER DEFAULT 1,
  "_createdAt" TEXT,
  "_updatedAt" TEXT,
  _deleted BOOLEAN DEFAULT FALSE,
  "_deviceId" TEXT,
  _modified BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeblocks_user_modified ON public.timeblocks(user_id, _modified, id);
CREATE INDEX IF NOT EXISTS idx_timeblocks_swimlane ON public.timeblocks(user_id, "boardId", "swimlaneId");

DROP TRIGGER IF EXISTS timeblocks_set_row_modified ON public.timeblocks;
CREATE TRIGGER timeblocks_set_row_modified BEFORE UPDATE ON public.timeblocks
FOR EACH ROW EXECUTE FUNCTION public.set_row_modified();

ALTER TABLE public.timeblocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS timeblocks_user_isolation ON public.timeblocks;
CREATE POLICY timeblocks_user_isolation ON public.timeblocks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.timeblocks REPLICA IDENTITY FULL;

-- ─── habits: add timeblockId ──────────────────────────────────────────────────

ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS "timeblockId" TEXT;

CREATE INDEX IF NOT EXISTS idx_habits_timeblock_id ON public.habits("timeblockId");

-- ─── routines: add timeblockId ────────────────────────────────────────────────

ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS "timeblockId" TEXT;

CREATE INDEX IF NOT EXISTS idx_routines_timeblock_id ON public.routines("timeblockId");

-- ─── tasks: add timeboxMinutes ────────────────────────────────────────────────

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS "timeboxMinutes" INTEGER;
