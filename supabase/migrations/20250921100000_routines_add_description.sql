-- Add description column to routines table
ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS description TEXT;
