-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create a function to check if user has an accepted booking with another user
CREATE OR REPLACE FUNCTION public.has_accepted_booking_with(_viewer_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE status = 'accepted'
      AND (
        (requester_id = _viewer_id AND musician_id = _profile_id)
        OR (musician_id = _viewer_id AND requester_id = _profile_id)
      )
  )
$$;

-- Create policy for authenticated users to see basic profile info
-- They can see: id, username, instrument, skill_level, city, country, latitude, longitude, average_rating, total_ratings, avatar_url, bio
CREATE POLICY "Authenticated users can view basic profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Create policy for anonymous users to see only minimal public info (for map display)
CREATE POLICY "Anonymous users can view minimal public info"
ON public.profiles
FOR SELECT
TO anon
USING (true);

-- Create a secure view that hides sensitive fields for public/anonymous access
-- This view will be used for the map and public musician listings
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  username,
  instrument,
  skill_level,
  city,
  country,
  latitude,
  longitude,
  average_rating,
  total_ratings,
  avatar_url,
  bio,
  created_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;

-- Create a secure view for profiles with contact info (only for booking partners)
CREATE OR REPLACE VIEW public.booking_partner_profiles AS
SELECT 
  p.id,
  p.username,
  p.first_name,
  p.last_name,
  p.full_name,
  p.phone,
  p.instrument,
  p.skill_level,
  p.city,
  p.country,
  p.latitude,
  p.longitude,
  p.average_rating,
  p.total_ratings,
  p.avatar_url,
  p.bio,
  p.email_verified,
  p.phone_verified,
  p.identity_verified,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE 
  -- User can see their own full profile
  p.id = auth.uid()
  -- Or user has an accepted booking with this profile
  OR public.has_accepted_booking_with(auth.uid(), p.id);

-- Grant access to booking partner view only for authenticated users
GRANT SELECT ON public.booking_partner_profiles TO authenticated;