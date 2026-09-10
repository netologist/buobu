-- RxDB <-> Supabase sync tables
-- Includes:
-- - required sync fields: id, user_id, _deleted, _modified
-- - _modified + updated_at trigger
-- - RLS isolation by auth.uid() = user_id
-- - REPLICA IDENTITY FULL for realtime payloads

CREATE OR REPLACE FUNCTION public.set_row_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW._modified = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "boardId" TEXT NOT NULL,
  "swimlaneId" TEXT NOT NULL,
  "columnId" TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklists JSONB NOT NULL DEFAULT '[]'::jsonb,
  transactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  worklogs JSONB NOT NULL DEFAULT '[]'::jsonb,
  pomodoros INTEGER,
  "order" DOUBLE PRECISION,
  date TEXT,
  deadline TEXT,
  priority TEXT,
  archived BOOLEAN DEFAULT FALSE,
  "archivedAt" TEXT,
  "completedAt" TEXT,
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

CREATE TABLE IF NOT EXISTS public.backlogs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "swimlaneId" TEXT NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TEXT,
  _version INTEGER DEFAULT 1,
  "_createdAt" TEXT,
  "_updatedAt" TEXT,
  _deleted BOOLEAN DEFAULT FALSE,
  "_deviceId" TEXT,
  _modified BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.habits (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "boardId" TEXT NOT NULL,
  "swimlaneId" TEXT NOT NULL,
  title TEXT NOT NULL,
  color TEXT,
  "order" DOUBLE PRECISION,
  "breakHabit" BOOLEAN DEFAULT FALSE,
  "frequencyDays" JSONB NOT NULL DEFAULT '[]'::jsonb,
  archived BOOLEAN DEFAULT FALSE,
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

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "habitId" TEXT NOT NULL,
  date TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.vision_items (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "boardId" TEXT NOT NULL,
  "swimlaneId" TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  "excalidrawData" TEXT,
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

CREATE TABLE IF NOT EXISTS public.notes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "boardId" TEXT NOT NULL,
  "swimlaneId" TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  "references" JSONB NOT NULL DEFAULT '[]'::jsonb,
  pinned BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
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

CREATE TABLE IF NOT EXISTS public.mindmaps (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "boardId" TEXT NOT NULL,
  "swimlaneId" TEXT NOT NULL,
  title TEXT NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  archived BOOLEAN DEFAULT FALSE,
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

CREATE TABLE IF NOT EXISTS public.boards (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  "weekStart" INTEGER,
  "archiveColumnId" TEXT,
  "showArchiveColumn" BOOLEAN DEFAULT FALSE,
  naming JSONB,
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

CREATE TABLE IF NOT EXISTS public.swimlanes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "boardId" TEXT NOT NULL,
  name TEXT NOT NULL,
  label TEXT,
  currency TEXT NOT NULL,
  color TEXT,
  "durationHours" DOUBLE PRECISION,
  "pomodoroMinutes" DOUBLE PRECISION,
  "breakMinutes" DOUBLE PRECISION,
  deadline TEXT,
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

CREATE INDEX IF NOT EXISTS idx_tasks_user_modified ON public.tasks(user_id, _modified, id);
CREATE INDEX IF NOT EXISTS idx_backlogs_user_modified ON public.backlogs(user_id, _modified, id);
CREATE INDEX IF NOT EXISTS idx_habits_user_modified ON public.habits(user_id, _modified, id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_modified ON public.habit_logs(user_id, _modified, id);
CREATE INDEX IF NOT EXISTS idx_vision_items_user_modified ON public.vision_items(user_id, _modified, id);
CREATE INDEX IF NOT EXISTS idx_notes_user_modified ON public.notes(user_id, _modified, id);
CREATE INDEX IF NOT EXISTS idx_mindmaps_user_modified ON public.mindmaps(user_id, _modified, id);
CREATE INDEX IF NOT EXISTS idx_boards_user_modified ON public.boards(user_id, _modified, id);
CREATE INDEX IF NOT EXISTS idx_swimlanes_user_modified ON public.swimlanes(user_id, _modified, id);

DROP TRIGGER IF EXISTS tasks_set_row_modified ON public.tasks;
CREATE TRIGGER tasks_set_row_modified BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_row_modified();

DROP TRIGGER IF EXISTS backlogs_set_row_modified ON public.backlogs;
CREATE TRIGGER backlogs_set_row_modified BEFORE UPDATE ON public.backlogs
FOR EACH ROW EXECUTE FUNCTION public.set_row_modified();

DROP TRIGGER IF EXISTS habits_set_row_modified ON public.habits;
CREATE TRIGGER habits_set_row_modified BEFORE UPDATE ON public.habits
FOR EACH ROW EXECUTE FUNCTION public.set_row_modified();

DROP TRIGGER IF EXISTS habit_logs_set_row_modified ON public.habit_logs;
CREATE TRIGGER habit_logs_set_row_modified BEFORE UPDATE ON public.habit_logs
FOR EACH ROW EXECUTE FUNCTION public.set_row_modified();

DROP TRIGGER IF EXISTS vision_items_set_row_modified ON public.vision_items;
CREATE TRIGGER vision_items_set_row_modified BEFORE UPDATE ON public.vision_items
FOR EACH ROW EXECUTE FUNCTION public.set_row_modified();

DROP TRIGGER IF EXISTS notes_set_row_modified ON public.notes;
CREATE TRIGGER notes_set_row_modified BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.set_row_modified();

DROP TRIGGER IF EXISTS mindmaps_set_row_modified ON public.mindmaps;
CREATE TRIGGER mindmaps_set_row_modified BEFORE UPDATE ON public.mindmaps
FOR EACH ROW EXECUTE FUNCTION public.set_row_modified();

DROP TRIGGER IF EXISTS boards_set_row_modified ON public.boards;
CREATE TRIGGER boards_set_row_modified BEFORE UPDATE ON public.boards
FOR EACH ROW EXECUTE FUNCTION public.set_row_modified();

DROP TRIGGER IF EXISTS swimlanes_set_row_modified ON public.swimlanes;
CREATE TRIGGER swimlanes_set_row_modified BEFORE UPDATE ON public.swimlanes
FOR EACH ROW EXECUTE FUNCTION public.set_row_modified();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mindmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swimlanes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasks_user_isolation ON public.tasks;
CREATE POLICY tasks_user_isolation ON public.tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS backlogs_user_isolation ON public.backlogs;
CREATE POLICY backlogs_user_isolation ON public.backlogs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS habits_user_isolation ON public.habits;
CREATE POLICY habits_user_isolation ON public.habits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS habit_logs_user_isolation ON public.habit_logs;
CREATE POLICY habit_logs_user_isolation ON public.habit_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS vision_items_user_isolation ON public.vision_items;
CREATE POLICY vision_items_user_isolation ON public.vision_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS notes_user_isolation ON public.notes;
CREATE POLICY notes_user_isolation ON public.notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS mindmaps_user_isolation ON public.mindmaps;
CREATE POLICY mindmaps_user_isolation ON public.mindmaps
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS boards_user_isolation ON public.boards;
CREATE POLICY boards_user_isolation ON public.boards
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS swimlanes_user_isolation ON public.swimlanes;
CREATE POLICY swimlanes_user_isolation ON public.swimlanes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.backlogs REPLICA IDENTITY FULL;
ALTER TABLE public.habits REPLICA IDENTITY FULL;
ALTER TABLE public.habit_logs REPLICA IDENTITY FULL;
ALTER TABLE public.vision_items REPLICA IDENTITY FULL;
ALTER TABLE public.notes REPLICA IDENTITY FULL;
ALTER TABLE public.mindmaps REPLICA IDENTITY FULL;
ALTER TABLE public.boards REPLICA IDENTITY FULL;
ALTER TABLE public.swimlanes REPLICA IDENTITY FULL;
