-- Maak user_locations tabel voor het bijhouden van locaties
CREATE TABLE IF NOT EXISTS public.user_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy DECIMAL(10, 2),
  status TEXT CHECK (status IN ('home', 'away', 'unknown')) DEFAULT 'unknown',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Authenticated users kunnen alle locaties zien (familie leden)
CREATE POLICY "Authenticated users can view all locations"
  ON public.user_locations 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Users kunnen hun eigen locatie invoegen
CREATE POLICY "Users can insert own location"
  ON public.user_locations 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users kunnen hun eigen locatie updaten
CREATE POLICY "Users can update own location"
  ON public.user_locations 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Maak home_location tabel voor geofencing instellingen
CREATE TABLE IF NOT EXISTS public.home_location (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT DEFAULT 'Thuis',
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.home_location ENABLE ROW LEVEL SECURITY;

-- Authenticated users kunnen home location zien
CREATE POLICY "Authenticated users can view home location"
  ON public.home_location 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Admins kunnen home location beheren
CREATE POLICY "Admins can manage home location"
  ON public.home_location 
  FOR ALL 
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert placeholder home location (admin moet dit later configureren)
INSERT INTO public.home_location (name, latitude, longitude, radius_meters)
VALUES ('Thuis', 52.0907, 5.1214, 100)
ON CONFLICT DO NOTHING;