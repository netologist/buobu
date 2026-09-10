-- Routines system migration
-- 1. Add routineId + time to tasks table
-- 2. Create routines table
-- 3. Create routine_logs table
-- Follows same pattern as 20260228223000_sync_tables.sql

-- ─── tasks: add routineId and time ───────────────────────────────────────────

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS "routineId" TEXT,
  ADD COLUMN IF NOT EXISTS time TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_routine_id ON public.tasks("routineId");

-- ─── routines ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.routines (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "boardId" TEXT NOT NULL,
  "swimlaneId" TEXT NOT NULL,
  "columnId" TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  recurrence JSONB NOT NULL,
  "lastGeneratedAt" TEXT,
  "nextDueDate" TEXT,
  "eventTime" TEXT,
  "paymentAmount" DOUBLE PRECISION,
  "paymentCurrency" TEXT,
  "paymentType" TEXT,
  "paymentNote" TEXT,
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

CREATE INDEX IF NOT EXISTS idx_routines_user_modified ON public.routines(user_id, _modified, id);
CREATE INDEX IF NOT EXISTS idx_routines_next_due ON public.routines(user_id, "nextDueDate");

DROP TRIGGER IF EXISTS routines_set_row_modified ON public.routines;
CREATE TRIGGER routines_set_row_modified BEFORE UPDATE ON public.routines
FOR EACH ROW EXECUTE FUNCTION public.set_row_modified();

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS routines_user_isolation ON public.routines;
CREATE POLICY routines_user_isolation ON public.routines
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.routines REPLICA IDENTITY FULL;

-- ─── routine_logs ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.routine_logs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "routineId" TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  "taskId" TEXT,
  "createdAt" TEXT,
  _version INTEGER DEFAULT 1,
  "_createdAt" TEXT,
  "_updatedAt" TEXT,
  _deleted BOOLEAN DEFAULT FALSE,
  "_deviceId" TEXT,
  _modified BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routine_logs_user_modified ON public.routine_logs(user_id, _modified, id);
CREATE INDEX IF NOT EXISTS idx_routine_logs_routine_date ON public.routine_logs("routineId", date);

DROP TRIGGER IF EXISTS routine_logs_set_row_modified ON public.routine_logs;
CREATE TRIGGER routine_logs_set_row_modified BEFORE UPDATE ON public.routine_logs
FOR EACH ROW EXECUTE FUNCTION public.set_row_modified();

ALTER TABLE public.routine_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS routine_logs_user_isolation ON public.routine_logs;
CREATE POLICY routine_logs_user_isolation ON public.routine_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.routine_logs REPLICA IDENTITY FULL;
