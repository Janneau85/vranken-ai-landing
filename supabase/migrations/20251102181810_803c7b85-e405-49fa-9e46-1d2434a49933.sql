-- Add theme_accent_color column to profiles table for personal theming
ALTER TABLE public.profiles
ADD COLUMN theme_accent_color TEXT DEFAULT '#3b82f6';