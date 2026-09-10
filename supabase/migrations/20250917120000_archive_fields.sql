-- Archive feature: add archived + archivedAt fields to all archivable entities

-- Boards
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS "archivedAt" TEXT;

-- Swimlanes
ALTER TABLE public.swimlanes ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.swimlanes ADD COLUMN IF NOT EXISTS "archivedAt" TEXT;

-- Vision Items
ALTER TABLE public.vision_items ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.vision_items ADD COLUMN IF NOT EXISTS "archivedAt" TEXT;

-- Backlogs
ALTER TABLE public.backlogs ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.backlogs ADD COLUMN IF NOT EXISTS "archivedAt" TEXT;

-- Habits (archivedAt only — archived already exists)
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS "archivedAt" TEXT;

-- Notes (archivedAt only — archived already exists)
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS "archivedAt" TEXT;

-- Mindmaps (archivedAt only — archived already exists)
ALTER TABLE public.mindmaps ADD COLUMN IF NOT EXISTS "archivedAt" TEXT;

-- Bookmarks (archivedAt only — archived already exists)
ALTER TABLE public.bookmarks ADD COLUMN IF NOT EXISTS "archivedAt" TEXT;
