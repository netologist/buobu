-- Bookmark sync table for RxDB replication

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "boardId" TEXT NOT NULL,
  "swimlaneId" TEXT NOT NULL,
  url TEXT NOT NULL,
  "urlNormalized" TEXT NOT NULL,
  domain TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  "previewImage" TEXT,
  favicon TEXT,
  "siteName" TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  links JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'unread',
  rating INTEGER,
  pinned BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  "metadataFetchStatus" TEXT DEFAULT 'pending',
  "metadataLastFetchedAt" TEXT,
  "isBroken" BOOLEAN DEFAULT FALSE,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  _version INTEGER DEFAULT 1,
  "_createdAt" TEXT,
  "_updatedAt" TEXT,
  _deleted BOOLEAN DEFAULT FALSE,
  "_deviceId" TEXT,
  _modified BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT bookmarks_status_check CHECK (
    status IN ('unread', 'reading', 'important', 'archived', 'favorite')
  ),
  CONSTRAINT bookmarks_rating_check CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  CONSTRAINT bookmarks_metadata_status_check CHECK (
    "metadataFetchStatus" IS NULL OR "metadataFetchStatus" IN ('pending', 'success', 'failed', 'timeout')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_bookmarks_user_url_normalized
  ON public.bookmarks(user_id, "urlNormalized");

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_modified ON public.bookmarks(user_id, _modified, id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_status ON public.bookmarks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_swimlane ON public.bookmarks(user_id, "swimlaneId");
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_domain ON public.bookmarks(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_rating ON public.bookmarks(user_id, rating);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_created ON public.bookmarks(user_id, "createdAt");

DROP TRIGGER IF EXISTS bookmarks_set_row_modified ON public.bookmarks;
CREATE TRIGGER bookmarks_set_row_modified BEFORE UPDATE ON public.bookmarks
FOR EACH ROW EXECUTE FUNCTION public.set_row_modified();

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookmarks_user_isolation ON public.bookmarks;
CREATE POLICY bookmarks_user_isolation ON public.bookmarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.bookmarks REPLICA IDENTITY FULL;

