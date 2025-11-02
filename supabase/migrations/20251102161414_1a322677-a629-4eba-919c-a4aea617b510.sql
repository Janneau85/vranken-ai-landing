-- Table to store todo calendar configuration
CREATE TABLE todo_calendar_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id TEXT NOT NULL,
  calendar_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Only one active todo calendar at a time
CREATE UNIQUE INDEX idx_todo_calendar_active ON todo_calendar_config (is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE todo_calendar_config ENABLE ROW LEVEL SECURITY;

-- Admin can manage todo calendar config
CREATE POLICY "Admins can manage todo calendar config"
  ON todo_calendar_config FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Everyone can view the active config
CREATE POLICY "Anyone can view active todo calendar config"
  ON todo_calendar_config FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_todo_calendar_config_updated_at
  BEFORE UPDATE ON todo_calendar_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();