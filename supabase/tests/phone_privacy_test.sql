-- Tests for phone PII protection on profiles table.
-- Verifies that the `phone` column is never returned to:
--   * anonymous users
--   * authenticated users that are NOT the profile owner and NOT booking partners
-- And that it IS returned for:
--   * the profile owner
--   * a partner with an accepted booking
--
-- Uses existing seeded profiles. Inserts are rolled back at the end.
-- Sandbox role has only INSERT/SELECT, so we cannot UPDATE existing rows;
-- we only insert a new accepted booking and assert against it.

\set ON_ERROR_STOP on

BEGIN;

-- Insert an accepted booking between the two seeded profiles.
INSERT INTO public.bookings (id, requester_id, musician_id, status, scheduled_date, duration_hours)
VALUES (
  '00000000-0000-0000-0000-0000feedface',
  'ce8a9c5e-5cfe-4563-a850-1a801a53c5b1',  -- partner (requester)
  'd9bbf110-3fe3-4742-bef3-9b76f2e1d170',  -- owner   (musician)
  'accepted',
  now() + interval '1 day',
  2
);

-- Capture the owner's real phone for assertion.
\gset
SELECT phone AS owner_phone FROM public.profiles
 WHERE id = 'd9bbf110-3fe3-4742-bef3-9b76f2e1d170' \gset

\echo 'Owner phone under test:' :owner_phone

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
  RAISE NOTICE 'PASS [2]: anon blocked from SELECT phone';
END $$;

------------------------------------------------------------
-- 3. Authenticated stranger: direct phone read denied AND
--    get_profile_sensitive returns no rows.
------------------------------------------------------------
DO $$
DECLARE err text; cnt int;
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
DECLARE v_phone text; expected text := :'owner_phone';
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub','d9bbf110-3fe3-4742-bef3-9b76f2e1d170',
                      'role','authenticated')::text, true);
  SELECT phone INTO v_phone
  FROM public.get_profile_sensitive('d9bbf110-3fe3-4742-bef3-9b76f2e1d170');
  RESET ROLE;
  IF v_phone IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'FAIL [4]: owner did not get own phone (got %, expected %)', v_phone, expected;
  END IF;
  RAISE NOTICE 'PASS [4]: owner receives own phone via RPC';
END $$;

------------------------------------------------------------
-- 5. Accepted-booking partner gets the owner's phone.
------------------------------------------------------------
DO $$
DECLARE v_phone text; expected text := :'owner_phone';
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub','ce8a9c5e-5cfe-4563-a850-1a801a53c5b1',
                      'role','authenticated')::text, true);
  SELECT phone INTO v_phone
  FROM public.get_profile_sensitive('d9bbf110-3fe3-4742-bef3-9b76f2e1d170');
  RESET ROLE;
  IF v_phone IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'FAIL [5]: accepted-booking partner did not get phone (got %)', v_phone;
  END IF;
  RAISE NOTICE 'PASS [5]: accepted-booking partner gets phone via RPC';
END $$;

------------------------------------------------------------
-- 6. Direct view of public profile columns must NOT include phone.
------------------------------------------------------------
DO $$
DECLARE has_phone bool;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles_public' AND column_name='phone'
  ) INTO has_phone;
  IF has_phone THEN
    RAISE EXCEPTION 'FAIL [6]: profiles_public view exposes phone column';
  END IF;
  RAISE NOTICE 'PASS [6]: profiles_public view does NOT expose phone';
END $$;

ROLLBACK;

\echo ''
\echo '======================================'
\echo '  ALL PHONE PRIVACY TESTS PASSED ✓'
\echo '======================================'
