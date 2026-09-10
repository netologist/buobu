-- Timeblock show-as-habit projection support
-- 1) timeblocks: showAsHabit flag
-- 2) habits: projection source metadata

ALTER TABLE public.timeblocks
  ADD COLUMN IF NOT EXISTS "showAsHabit" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceTimeblockId" TEXT;

CREATE INDEX IF NOT EXISTS idx_habits_source_timeblock_id
  ON public.habits("sourceTimeblockId");
