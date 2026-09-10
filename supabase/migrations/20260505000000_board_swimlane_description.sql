-- Add optional description field to boards and swimlanes.
-- Used to store a short motivational sentence shown as a tooltip in the navigator.

ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.swimlanes
  ADD COLUMN IF NOT EXISTS description TEXT;
