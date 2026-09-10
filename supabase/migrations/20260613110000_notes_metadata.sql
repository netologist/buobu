-- Add structured metadata support for notes
-- Needed by Note.metadata sync payloads sent via PostgREST

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '[]'::jsonb;
