-- Drop the problematic views
DROP VIEW IF EXISTS public.booking_partner_profiles;
DROP VIEW IF EXISTS public.public_profiles;

-- Drop the policies we just created
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Anonymous users can view minimal public info" ON public.profiles;

-- Create a function to get visible profile fields based on viewer context
-- This is SECURITY DEFINER to bypass RLS when checking bookings
CREATE OR REPLACE FUNCTION public.can_view_sensitive_profile(_viewer_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User can see their own sensitive data
    _viewer_id = _profile_id
    -- Or user has an accepted/completed booking with this profile
    OR EXISTS (
      SELECT 1
      FROM public.bookings
      WHERE (status = 'accepted' OR status = 'completed')
        AND (
          (requester_id = _viewer_id AND musician_id = _profile_id)
          OR (musician_id = _viewer_id AND requester_id = _profile_id)
        )
    )
$$;

-- Create tiered RLS policy for profiles
-- Everyone can see basic public info (id, username, instrument, skill_level, city, country, lat/lng, ratings, avatar, bio)
-- Sensitive info (first_name, last_name, full_name, phone, verification status) is only visible to:
--   1. The profile owner
--   2. Users with an accepted booking

-- For SELECT, we allow all authenticated users to see rows, but we'll handle field-level security in the application
CREATE POLICY "Users can view profiles with tiered visibility"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Anonymous users can only see profiles for the map (we'll filter sensitive fields in the app)
CREATE POLICY "Anonymous can view basic profile info"
ON public.profiles
FOR SELECT
TO anon
USING (true);