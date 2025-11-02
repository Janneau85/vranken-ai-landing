-- Add notes field to todos table for storing Google Calendar event IDs
ALTER TABLE public.todos
ADD COLUMN notes TEXT;