-- Add explicit sort order to boards table for user-defined board ordering.
-- The "order" column is a reserved word in SQL, so it must be quoted.
-- Existing boards default to NULL; the app falls back to name-based sort
-- until the user explicitly saves an order via the Reorder Boards modal.

ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS "order" INTEGER;
