DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT
  id,
  username,
  first_name,
  bio,
  instrument,
  skill_level,
  city,
  country,
  average_rating,
  total_ratings,
  avatar_url,
  gender,
  phone_verified,
  email_verified,
  onboarding_completed,
  preferred_skill_levels,
  preferred_instruments,
  approx_latitude,
  approx_longitude,
  created_at,
  updated_at
FROM profiles;