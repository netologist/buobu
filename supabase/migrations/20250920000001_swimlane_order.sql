-- Add explicit sort order to swimlanes table for user-defined swimlane ordering.
-- The "order" column is a reserved word in SQL, so it must be quoted.
-- Existing swimlanes default to NULL; the app falls back to creation-time sort
-- until the user explicitly saves an order via the Reorder Swimlanes modal.

ALTER TABLE public.swimlanes
  ADD COLUMN IF NOT EXISTS "order" INTEGER;
