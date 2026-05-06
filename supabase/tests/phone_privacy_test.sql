-- Tests for phone PII protection on profiles table.
-- Verifies that the `phone` column is never returned to:
--   * anonymous users
--   * authenticated users that are NOT the profile owner and NOT booking partners
-- And that it IS returned for:
--   * the profile owner
--   * a partner with an accepted/completed booking
--
-- Uses the two seeded profiles + a random UUID as a stranger.
-- Wraps everything in a transaction that is rolled back at the end.

\set ON_ERROR_STOP on
\set OWNER_ID    '\'d9bbf110-3fe3-4742-bef3-9b76f2e1d170\''
\set PARTNER_ID  '\'ce8a9c5e-5cfe-4563-a850-1a801a53c5b1\''
\set STRANGER_ID '\'00000000-0000-0000-0000-0000deadbeef\''
\set BOOKING_ID  '\'00000000-0000-0000-0000-0000feedface\''

BEGIN;

-- Make sure the owner profile has a phone we can assert on.
UPDATE public.profiles
   SET phone = '+351 900 000 001'
 WHERE id = :OWNER_ID;

-- Insert a fresh accepted booking between owner and partner.
INSERT INTO public.bookings (id, requester_id, musician_id, status, scheduled_date, duration_hours)
VALUES (:BOOKING_ID, :PARTNER_ID, :OWNER_ID, 'accepted', now() + interval '1 day', 2);

------------------------------------------------------------
-- 1. Column-level grants must NOT include sensitive columns
--    for anon / authenticated.
------------------------------------------------------------
DO $$
DECLARE
  bad_grants int;
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
    RAISE EXCEPTION 'FAIL: anon/authenticated still have SELECT on % sensitive profile columns', bad_grants;
  END IF;
  RAISE NOTICE 'PASS [1]: no anon/authenticated SELECT grant on sensitive columns';
END $$;

------------------------------------------------------------
-- 2. anon: direct SELECT of phone is denied.
------------------------------------------------------------
DO $$
DECLARE err text;
BEGIN
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM phone FROM public.profiles WHERE id = 'd9bbf110-3fe3-4742-bef3-9b76f2e1d170';
    err := 'NO_ERROR';
  EXCEPTION WHEN OTHERS THEN
    err := SQLERRM;
  END;
  RESET ROLE;
  IF err = 'NO_ERROR' THEN
    RAISE EXCEPTION 'FAIL [2]: anon was able to SELECT profiles.phone';
  END IF;
  RAISE NOTICE 'PASS [2]: anon blocked from SELECT phone (%)', err;
END $$;

------------------------------------------------------------
-- 3. Authenticated stranger: direct phone read denied AND
--    get_profile_sensitive returns no rows.
------------------------------------------------------------
DO $$
DECLARE
  err text;
  cnt int;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub','00000000-0000-0000-0000-0000deadbeef',
                      'role','authenticated')::text, true);

  BEGIN
    PERFORM phone FROM public.profiles WHERE id = 'd9bbf110-3fe3-4742-bef3-9b76f2e1d170';
    err := 'NO_ERROR';
  EXCEPTION WHEN OTHERS THEN
    err := SQLERRM;
  END;

  IF err = 'NO_ERROR' THEN
    RESET ROLE;
    RAISE EXCEPTION 'FAIL [3a]: authenticated stranger could SELECT profiles.phone';
  END IF;

  SELECT count(*) INTO cnt
  FROM public.get_profile_sensitive('d9bbf110-3fe3-4742-bef3-9b76f2e1d170');
  RESET ROLE;

  IF cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL [3b]: get_profile_sensitive leaked % row(s) to a stranger', cnt;
  END IF;
  RAISE NOTICE 'PASS [3]: stranger blocked on direct read and RPC';
END $$;

------------------------------------------------------------
-- 4. Owner gets their own phone via RPC.
------------------------------------------------------------
DO $$
DECLARE v_phone text;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub','d9bbf110-3fe3-4742-bef3-9b76f2e1d170',
                      'role','authenticated')::text, true);
  SELECT phone INTO v_phone
  FROM public.get_profile_sensitive('d9bbf110-3fe3-4742-bef3-9b76f2e1d170');
  RESET ROLE;
  IF v_phone IS DISTINCT FROM '+351 900 000 001' THEN
    RAISE EXCEPTION 'FAIL [4]: owner did not get own phone (got %)', v_phone;
  END IF;
  RAISE NOTICE 'PASS [4]: owner receives own phone via RPC';
END $$;

------------------------------------------------------------
-- 5. Accepted-booking partner gets the owner's phone.
------------------------------------------------------------
DO $$
DECLARE v_phone text;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub','ce8a9c5e-5cfe-4563-a850-1a801a53c5b1',
                      'role','authenticated')::text, true);
  SELECT phone INTO v_phone
  FROM public.get_profile_sensitive('d9bbf110-3fe3-4742-bef3-9b76f2e1d170');
  RESET ROLE;
  IF v_phone IS DISTINCT FROM '+351 900 000 001' THEN
    RAISE EXCEPTION 'FAIL [5]: accepted-booking partner did not get phone (got %)', v_phone;
  END IF;
  RAISE NOTICE 'PASS [5]: accepted-booking partner gets phone via RPC';
END $$;

------------------------------------------------------------
-- 6. Pending-booking partner does NOT get phone.
------------------------------------------------------------
DO $$
DECLARE cnt int;
BEGIN
  UPDATE public.bookings SET status = 'pending' WHERE id = '00000000-0000-0000-0000-0000feedface';

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub','ce8a9c5e-5cfe-4563-a850-1a801a53c5b1',
                      'role','authenticated')::text, true);
  SELECT count(*) INTO cnt
  FROM public.get_profile_sensitive('d9bbf110-3fe3-4742-bef3-9b76f2e1d170');
  RESET ROLE;

  IF cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL [6]: pending-booking partner received phone';
  END IF;
  RAISE NOTICE 'PASS [6]: pending-booking partner does NOT receive phone';
END $$;

------------------------------------------------------------
-- 7. Completed booking grants phone access.
------------------------------------------------------------
DO $$
DECLARE v_phone text;
BEGIN
  UPDATE public.bookings SET status = 'completed' WHERE id = '00000000-0000-0000-0000-0000feedface';

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub','ce8a9c5e-5cfe-4563-a850-1a801a53c5b1',
                      'role','authenticated')::text, true);
  SELECT phone INTO v_phone
  FROM public.get_profile_sensitive('d9bbf110-3fe3-4742-bef3-9b76f2e1d170');
  RESET ROLE;
  IF v_phone IS DISTINCT FROM '+351 900 000 001' THEN
    RAISE EXCEPTION 'FAIL [7]: completed-booking partner did not get phone';
  END IF;
  RAISE NOTICE 'PASS [7]: completed-booking partner gets phone via RPC';
END $$;

ROLLBACK;

\echo ''
\echo '======================================'
\echo '  ALL PHONE PRIVACY TESTS PASSED ✓'
\echo '======================================'
