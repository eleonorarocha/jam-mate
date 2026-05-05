
-- Restrict public read access to sensitive fields on profiles (especially phone)
-- Drop the broad policy that granted any authenticated user access to all columns
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;

-- Create a public-safe view excluding PII (phone, exact location, etc.)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT
  id,
  username,
  first_name,
  full_name,
  bio,
  instrument,
  skill_level,
  avatar_url,
  city,
  country,
  approx_latitude,
  approx_longitude,
  gender,
  average_rating,
  total_ratings,
  onboarding_completed,
  preferred_skill_levels,
  preferred_instruments,
  created_at,
  updated_at
FROM public.profiles
WHERE onboarding_completed = true;

GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- Re-add a minimal SELECT policy on base table so the view can read rows for authenticated users
-- but only exposing the safe columns above (the view filters columns).
CREATE POLICY "Authenticated can read public profile columns via view"
ON public.profiles
FOR SELECT
TO authenticated
USING (onboarding_completed = true);

-- Note: this still allows column-level read of phone if a client queries the base table directly.
-- We mitigate by routing app code to the view AND keeping the stricter "Users can view own or partner profiles"
-- policy for legitimate full-row access. To prevent phone leakage even from base table, revoke column.
REVOKE SELECT (phone, phone_verified, email_verified, identity_verified, latitude, longitude, last_name)
  ON public.profiles FROM authenticated, anon;

-- Keep full-column access for service_role and grant back to owners via policy + column grants for owners.
-- Owners need to read/update their own sensitive columns, so re-grant SELECT on them only via a separate path:
-- Postgres lacks per-row column grants, so we re-grant column SELECT to authenticated and rely on RLS
-- combined with: only "Users can view own or partner profiles" allows reading the row when needed.
-- However, since the new "Authenticated can read public profile columns via view" policy also matches,
-- a user could SELECT phone of others. To truly block, we keep the REVOKE above and create a SECURITY DEFINER
-- function for owners/partners to fetch sensitive fields.

CREATE OR REPLACE FUNCTION public.get_profile_sensitive(_profile_id uuid)
RETURNS TABLE (
  phone text,
  phone_verified boolean,
  email_verified boolean,
  identity_verified boolean,
  last_name text,
  latitude numeric,
  longitude numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.phone, p.phone_verified, p.email_verified, p.identity_verified,
         p.last_name, p.latitude, p.longitude
  FROM public.profiles p
  WHERE p.id = _profile_id
    AND public.can_view_sensitive_profile(auth.uid(), _profile_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_sensitive(uuid) TO authenticated;
