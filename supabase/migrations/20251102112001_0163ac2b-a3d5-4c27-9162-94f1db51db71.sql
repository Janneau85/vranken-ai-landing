-- Create calendar_assignments table
CREATE TABLE public.calendar_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  calendar_id TEXT NOT NULL,
  calendar_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, calendar_id)
);

-- Enable RLS
ALTER TABLE public.calendar_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can view all assignments
CREATE POLICY "Admins can view all assignments"
ON public.calendar_assignments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert assignments
CREATE POLICY "Admins can insert assignments"
ON public.calendar_assignments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete assignments
CREATE POLICY "Admins can delete assignments"
ON public.calendar_assignments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own assignments
CREATE POLICY "Users can view their own assignments"
ON public.calendar_assignments
FOR SELECT
USING (auth.uid() = user_id);