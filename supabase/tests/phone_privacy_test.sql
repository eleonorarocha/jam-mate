-- Tests for phone PII protection on profiles table.
--
-- Verifies:
--   1. anon and authenticated have NO column-level SELECT on phone or other PII
--   2. The profiles_public view does not expose phone
--   3. can_view_sensitive_profile() correctly authorizes:
--        - the profile owner
--        - a partner with an accepted/completed booking
--      and rejects:
--        - a stranger
--        - a partner whose only booking is pending/rejected/cancelled
--   4. get_profile_sensitive() (driven by can_view_sensitive_profile) is
--      consistent with that authorization
--
-- The sandbox role cannot SET ROLE anon/authenticated, so we test the
-- authorization logic directly via the SECURITY DEFINER helper functions
-- (which is what the RLS policies and the RPC ultimately rely on).
--
-- Inserts are wrapped in a transaction and rolled back at the end.

\set ON_ERROR_STOP on

BEGIN;

-- Use existing seeded profiles; insert an accepted booking between them.
INSERT INTO public.bookings (id, requester_id, musician_id, status, scheduled_date, duration_hours)
VALUES (
  '00000000-0000-0000-0000-0000feedfac1',
  'ce8a9c5e-5cfe-4563-a850-1a801a53c5b1',  -- partner (requester)
  'd9bbf110-3fe3-4742-bef3-9b76f2e1d170',  -- owner   (musician)
  'accepted',
  now() + interval '1 day',
  2
);

------------------------------------------------------------
-- 1. Column-level grants must NOT include sensitive columns
--    for anon / authenticated.
------------------------------------------------------------
DO $$
DECLARE bad_grants int;
BEGIN
  SELECT count(*) INTO bad_grants
  FROM information_schema.column_privileges
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name IN ('phone','phone_verified','email_verified',
                        'identity_verified','last_name','latitude','longitude')
    AND grantee IN ('anon','authenticated')
    AND privilege_type = 'SELECT';

  IF bad_grants > 0 THEN
    RAISE EXCEPTION 'FAIL [1]: anon/authenticated still have SELECT on % sensitive profile columns', bad_grants;
  END IF;
  RAISE NOTICE 'PASS [1]: no anon/authenticated SELECT grant on sensitive profile columns';
END $$;

------------------------------------------------------------
-- 2. profiles_public view must NOT expose phone or other PII.
------------------------------------------------------------
DO $$
DECLARE leaked text;
BEGIN
  SELECT string_agg(column_name, ',')
  INTO leaked
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='profiles_public'
    AND column_name IN ('phone','phone_verified','email_verified',
                        'identity_verified','last_name','latitude','longitude');
  IF leaked IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL [2]: profiles_public exposes sensitive columns: %', leaked;
  END IF;
  RAISE NOTICE 'PASS [2]: profiles_public does NOT expose any sensitive column';
END $$;

------------------------------------------------------------
-- 3. Authorization logic: can_view_sensitive_profile.
------------------------------------------------------------
DO $$
DECLARE
  owner_id  uuid := 'd9bbf110-3fe3-4742-bef3-9b76f2e1d170';
  partner_id uuid := 'ce8a9c5e-5cfe-4563-a850-1a801a53c5b1';
  stranger_id uuid := '00000000-0000-0000-0000-0000deadbeef';
  ok bool;
BEGIN
  -- Owner can see own data
  ok := public.can_view_sensitive_profile(owner_id, owner_id);
  IF NOT ok THEN RAISE EXCEPTION 'FAIL [3a]: owner cannot view own profile'; END IF;

  -- Accepted-booking partner can see owner
  ok := public.can_view_sensitive_profile(partner_id, owner_id);
  IF NOT ok THEN RAISE EXCEPTION 'FAIL [3b]: accepted-booking partner cannot view owner'; END IF;

  -- And the reverse (owner -> partner)
  ok := public.can_view_sensitive_profile(owner_id, partner_id);
  IF NOT ok THEN RAISE EXCEPTION 'FAIL [3c]: owner cannot view accepted-booking partner'; END IF;

  -- Stranger CANNOT see owner
  ok := public.can_view_sensitive_profile(stranger_id, owner_id);
  IF ok THEN RAISE EXCEPTION 'FAIL [3d]: stranger CAN view owner profile (leak!)'; END IF;

  -- Stranger CANNOT see partner
  ok := public.can_view_sensitive_profile(stranger_id, partner_id);
  IF ok THEN RAISE EXCEPTION 'FAIL [3e]: stranger CAN view partner profile (leak!)'; END IF;

  RAISE NOTICE 'PASS [3]: can_view_sensitive_profile authorizes correctly';
END $$;

------------------------------------------------------------
-- 4. Pending / rejected / cancelled bookings must NOT grant access.
------------------------------------------------------------
DO $$
DECLARE
  owner_id  uuid := 'd9bbf110-3fe3-4742-bef3-9b76f2e1d170';
  partner_id uuid := 'ce8a9c5e-5cfe-4563-a850-1a801a53c5b1';
  s text;
  ok bool;
BEGIN
  FOREACH s IN ARRAY ARRAY['pending','rejected','cancelled']
  LOOP
    -- Replace booking with the non-accepted status.
    DELETE FROM public.bookings WHERE id='00000000-0000-0000-0000-0000feedfac1';
    INSERT INTO public.bookings (id, requester_id, musician_id, status, scheduled_date, duration_hours)
    VALUES ('00000000-0000-0000-0000-0000feedfac1', partner_id, owner_id,
            s::booking_status, now() + interval '1 day', 2);

    ok := public.can_view_sensitive_profile(partner_id, owner_id);
    IF ok THEN
      RAISE EXCEPTION 'FAIL [4]: partner with % booking CAN view owner phone (leak!)', s;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS [4]: pending / rejected / cancelled bookings do NOT grant access';
END $$;

------------------------------------------------------------
-- 5. completed booking grants access (parity with accepted).
------------------------------------------------------------
DO $$
DECLARE
  owner_id  uuid := 'd9bbf110-3fe3-4742-bef3-9b76f2e1d170';
  partner_id uuid := 'ce8a9c5e-5cfe-4563-a850-1a801a53c5b1';
  ok bool;
BEGIN
  DELETE FROM public.bookings WHERE id='00000000-0000-0000-0000-0000feedfac1';
  INSERT INTO public.bookings (id, requester_id, musician_id, status, scheduled_date, duration_hours)
  VALUES ('00000000-0000-0000-0000-0000feedfac1', partner_id, owner_id,
          'completed', now() - interval '1 day', 2);

  ok := public.can_view_sensitive_profile(partner_id, owner_id);
  IF NOT ok THEN
    RAISE EXCEPTION 'FAIL [5]: partner with completed booking cannot view owner';
  END IF;
  RAISE NOTICE 'PASS [5]: completed booking grants access';
END $$;

------------------------------------------------------------
-- 6. get_profile_sensitive returns sensitive data only when
--    auth.uid() == profile_id (we can only check the self-case
--    here because we can't fake auth.uid() of another user from
--    sandbox; the OTHER cases are covered by the can_view_*
--    tests above and the RPC delegates entirely to it).
------------------------------------------------------------
DO $$
DECLARE cnt int;
BEGIN
  -- auth.uid() is NULL in sandbox -> RPC must return zero rows.
  SELECT count(*) INTO cnt
  FROM public.get_profile_sensitive('d9bbf110-3fe3-4742-bef3-9b76f2e1d170');
  IF cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL [6]: get_profile_sensitive returned data with NULL auth.uid()';
  END IF;
  RAISE NOTICE 'PASS [6]: get_profile_sensitive returns no rows for unauthenticated callers';
END $$;

ROLLBACK;

\echo ''
\echo '======================================'
\echo '  ALL PHONE PRIVACY TESTS PASSED'
\echo '======================================'
