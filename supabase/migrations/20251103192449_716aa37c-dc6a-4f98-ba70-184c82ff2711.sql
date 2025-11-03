-- Allow authenticated users to view all profile names for location sharing
CREATE POLICY "Authenticated users can view profile names"
ON profiles
FOR SELECT
TO authenticated
USING (true);