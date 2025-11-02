-- Remove the insecure policy that allows public access to profiles
DROP POLICY "Profiles are viewable by everyone" ON public.profiles;

-- Add policy for users to view their own profile only
CREATE POLICY "Users can view own profile" 
  ON public.profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- Add policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));