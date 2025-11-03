-- Voeg foreign key toe aan user_locations naar profiles tabel
ALTER TABLE public.user_locations
DROP CONSTRAINT IF EXISTS user_locations_user_id_fkey;

ALTER TABLE public.user_locations
ADD CONSTRAINT user_locations_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;