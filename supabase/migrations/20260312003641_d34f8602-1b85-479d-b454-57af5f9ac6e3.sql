-- Allow public read access to profiles for the public_profiles view
-- The view already restricts which columns are exposed
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (onboarding_completed = true);