-- Tests for phone PII protection on profiles table.
--
-- Verifies:
--   1. anon and authenticated have NO column-level SELECT on phone or other PII
--   2. The profiles_public view does not expose phone
--   3. Pending / rejected / cancelled bookings do NOT grant access
--   4. Accepted and completed bookings DO grant access (both directions)
--   5. The owner can always view their own data
--   6. get_profile_sensitive() returns no rows for unauthenticated callers
--
-- Sandbox role cannot SET ROLE, so authorization is exercised via the
-- SECURITY DEFINER helper can_view_sensitive_profile (which is the
-- single source of truth used by both the RLS policy and the RPC).
--
-- Inserts are rolled back at the end.

\set ON_ERROR_STOP on

BEGIN;

------------------------------------------------------------
-- 1. Column grants
------------------------------------------------------------
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad
  FROM information_schema.column_privileges
  WHERE table_schema='public' AND table_name='profiles'
    AND column_name IN ('phone','phone_verified','email_verified',
                        'identity_verified','last_name','latitude','longitude')
    AND grantee IN ('anon','authenticated')
    AND privilege_type='SELECT';
  IF bad > 0 THEN
    RAISE EXCEPTION 'FAIL [1]: anon/authenticated still have SELECT on % sensitive columns', bad;
  END IF;
  RAISE NOTICE 'PASS [1]: no anon/authenticated SELECT grant on sensitive profile columns';
END $$;

------------------------------------------------------------
-- 2. profiles_public view does not expose PII
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
-- 3. Owner can always see own data; outsider cannot.
------------------------------------------------------------
DO $$
BEGIN
  IF NOT public.can_view_sensitive_profile('d9bbf110-3fe3-4742-bef3-9b76f2e1d170'::uuid, 'd9bbf110-3fe3-4742-bef3-9b76f2e1d170'::uuid) THEN
    RAISE EXCEPTION 'FAIL [3a]: owner cannot view own profile';
  END IF;
  IF public.can_view_sensitive_profile('00000000-0000-0000-0000-0000deadbeef'::uuid, 'd9bbf110-3fe3-4742-bef3-9b76f2e1d170'::uuid) THEN
    RAISE EXCEPTION 'FAIL [3b]: outsider with no booking CAN view owner (leak!)';
  END IF;
  RAISE NOTICE 'PASS [3]: owner authorized; outsider with no booking blocked';
END $$;

------------------------------------------------------------
-- 4. Non-accepted bookings (pending/rejected/cancelled)
--    must NOT grant access. Done BEFORE inserting any
--    accepted booking so partner has no other relationship.
------------------------------------------------------------
DO $$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY['pending','rejected','cancelled']
  LOOP
    INSERT INTO public.bookings (id, requester_id, musician_id, status, scheduled_date, duration_hours)
    VALUES (gen_random_uuid(), 'ce8a9c5e-5cfe-4563-a850-1a801a53c5b1'::uuid, 'd9bbf110-3fe3-4742-bef3-9b76f2e1d170'::uuid, s::booking_status, now() + interval '1 day', 2);

    IF public.can_view_sensitive_profile('ce8a9c5e-5cfe-4563-a850-1a801a53c5b1'::uuid, 'd9bbf110-3fe3-4742-bef3-9b76f2e1d170'::uuid) THEN
      RAISE EXCEPTION 'FAIL [4]: partner with only % booking CAN view owner phone (leak!)', s;
    END IF;
    IF public.can_view_sensitive_profile('d9bbf110-3fe3-4742-bef3-9b76f2e1d170'::uuid, 'ce8a9c5e-5cfe-4563-a850-1a801a53c5b1'::uuid) THEN
      RAISE EXCEPTION 'FAIL [4]: owner with only % booking from partner CAN view partner phone (leak!)', s;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS [4]: pending / rejected / cancelled bookings do NOT grant access';
END $$;

------------------------------------------------------------
-- 5. Accepted booking grants access in both directions.
------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO public.bookings (id, requester_id, musician_id, status, scheduled_date, duration_hours)
  VALUES (gen_random_uuid(), 'ce8a9c5e-5cfe-4563-a850-1a801a53c5b1'::uuid, 'd9bbf110-3fe3-4742-bef3-9b76f2e1d170'::uuid, 'accepted', now() + interval '1 day', 2);

  IF NOT public.can_view_sensitive_profile('ce8a9c5e-5cfe-4563-a850-1a801a53c5b1'::uuid, 'd9bbf110-3fe3-4742-bef3-9b76f2e1d170'::uuid) THEN
    RAISE EXCEPTION 'FAIL [5a]: requester of accepted booking cannot view musician';
  END IF;
  IF NOT public.can_view_sensitive_profile('d9bbf110-3fe3-4742-bef3-9b76f2e1d170'::uuid, 'ce8a9c5e-5cfe-4563-a850-1a801a53c5b1'::uuid) THEN
    RAISE EXCEPTION 'FAIL [5b]: musician of accepted booking cannot view requester';
  END IF;
  -- Outsider still cannot
  IF public.can_view_sensitive_profile('00000000-0000-0000-0000-0000deadbeef'::uuid, 'd9bbf110-3fe3-4742-bef3-9b76f2e1d170'::uuid) THEN
    RAISE EXCEPTION 'FAIL [5c]: outsider CAN view owner after unrelated accepted booking (leak!)';
  END IF;
  RAISE NOTICE 'PASS [5]: accepted booking grants access in both directions only';
END $$;

------------------------------------------------------------
-- 6. Completed booking also grants access.
------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO public.bookings (id, requester_id, musician_id, status, scheduled_date, duration_hours)
  VALUES (gen_random_uuid(), 'ce8a9c5e-5cfe-4563-a850-1a801a53c5b1'::uuid, 'd9bbf110-3fe3-4742-bef3-9b76f2e1d170'::uuid, 'completed', now() - interval '1 day', 2);

  IF NOT public.can_view_sensitive_profile('ce8a9c5e-5cfe-4563-a850-1a801a53c5b1'::uuid, 'd9bbf110-3fe3-4742-bef3-9b76f2e1d170'::uuid) THEN
    RAISE EXCEPTION 'FAIL [6]: partner with completed booking cannot view owner';
  END IF;
  RAISE NOTICE 'PASS [6]: completed booking grants access';
END $$;

------------------------------------------------------------
-- 7. RPC denies anonymous callers (auth.uid() = NULL).
------------------------------------------------------------
DO $$
DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt
  FROM public.get_profile_sensitive('d9bbf110-3fe3-4742-bef3-9b76f2e1d170'::uuid);
  IF cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL [7]: get_profile_sensitive returned data with NULL auth.uid()';
  END IF;
  RAISE NOTICE 'PASS [7]: get_profile_sensitive returns no rows for unauthenticated callers';
END $$;

ROLLBACK;

\echo ''
\echo '======================================'
\echo '  ALL PHONE PRIVACY TESTS PASSED'
\echo '======================================'
