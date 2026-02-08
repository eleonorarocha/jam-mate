
-- Remove permissive anonymous policies
DROP POLICY IF EXISTS "Anonymous can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles with tiered visibility" ON public.profiles;

-- Only authenticated users can view profiles
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);
