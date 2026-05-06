-- Tests for phone PII protection on profiles table.
-- Verifies that the `phone` column is never returned to:
--   * anonymous users
--   * authenticated users that are NOT the profile owner and NOT booking partners
-- And that it IS returned for:
--   * the profile owner
--   * a partner with an accepted/completed booking
--
-- Run inside a transaction that is rolled back at the end.
-- Exits with non-zero if any assertion fails.

\set ON_ERROR_STOP on
BEGIN;

-- Seed two synthetic users + one stranger
DO $$
DECLARE
  v_owner uuid := '00000000-0000-0000-0000-00000000aaaa';
  v_partner uuid := '00000000-0000-0000-0000-00000000bbbb';
  v_stranger uuid := '00000000-0000-0000-0000-00000000cccc';
BEGIN
  -- Insert directly bypassing RLS (we're superuser/owner here).
  INSERT INTO public.profiles (id, username, instrument, phone, first_name, last_name, onboarding_completed)
  VALUES
    (v_owner,   'owner_test',   'guitar',  '+351 900 000 001', 'Owner',   'Test', true),
    (v_partner, 'partner_test', 'drums',   '+351 900 000 002', 'Partner', 'Test', true),
    (v_stranger,'stranger_test','bass',    '+351 900 000 003', 'Stranger','Test', true)
  ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone;

  -- Accepted booking owner <-> partner
  INSERT INTO public.bookings (id, requester_id, musician_id, status, scheduled_date, duration_hours)
  VALUES (
    '00000000-0000-0000-0000-0000000bbbb1',
    v_partner, v_owner, 'accepted', now() + interval '1 day', 2
  ) ON CONFLICT (id) DO NOTHING;
END $$;

------------------------------------------------------------
-- 1. Column-level grants: anon and authenticated must NOT have
--    SELECT on the `phone` column.
------------------------------------------------------------
DO $$
DECLARE
  bad_grants int;
BEGIN
  SELECT count(*) INTO bad_grants
  FROM information_schema.column_privileges
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name IN ('phone','phone_verified','email_verified','identity_verified','last_name','latitude','longitude')
    AND grantee IN ('anon','authenticated')
    AND privilege_type = 'SELECT';

  IF bad_grants > 0 THEN
    RAISE EXCEPTION 'FAIL: anon/authenticated still have SELECT on sensitive profile columns (% grants)', bad_grants;
  END IF;
  RAISE NOTICE 'PASS: no anon/authenticated SELECT grant on sensitive profile columns';
END $$;

------------------------------------------------------------
-- 2. As anon: direct SELECT of phone must be denied.
------------------------------------------------------------
DO $$
DECLARE
  err text;
BEGIN
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM phone FROM public.profiles WHERE id = '00000000-0000-0000-0000-00000000aaaa';
    err := 'no error';
  EXCEPTION WHEN insufficient_privilege OR others THEN
    err := SQLERRM;
  END;
  RESET ROLE;
  IF err = 'no error' THEN
    RAISE EXCEPTION 'FAIL: anon was able to SELECT profiles.phone';
  END IF;
  RAISE NOTICE 'PASS: anon blocked from SELECT phone (%)', err;
END $$;

------------------------------------------------------------
-- 3. As authenticated stranger: direct SELECT of phone must be denied,
--    and get_profile_sensitive must return zero rows for someone else.
------------------------------------------------------------
DO $$
DECLARE
  err text;
  cnt int;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub','00000000-0000-0000-0000-00000000cccc','role','authenticated')::text,
    true);

  -- Direct column read must fail
  BEGIN
    PERFORM phone FROM public.profiles WHERE id = '00000000-0000-0000-0000-00000000aaaa';
    err := 'no error';
  EXCEPTION WHEN insufficient_privilege OR others THEN
    err := SQLERRM;
  END;
  IF err = 'no error' THEN
    RESET ROLE;
    RAISE EXCEPTION 'FAIL: authenticated stranger was able to SELECT profiles.phone';
  END IF;

  -- RPC must return no rows
  SELECT count(*) INTO cnt
  FROM public.get_profile_sensitive('00000000-0000-0000-0000-00000000aaaa');
  RESET ROLE;

  IF cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL: get_profile_sensitive leaked % row(s) to a stranger', cnt;
  END IF;
  RAISE NOTICE 'PASS: stranger gets no phone via direct read or RPC';
END $$;

------------------------------------------------------------
-- 4. As the owner: get_profile_sensitive returns own phone.
------------------------------------------------------------
DO $$
DECLARE
  v_phone text;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub','00000000-0000-0000-0000-00000000aaaa','role','authenticated')::text,
    true);
  SELECT phone INTO v_phone
  FROM public.get_profile_sensitive('00000000-0000-0000-0000-00000000aaaa');
  RESET ROLE;
  IF v_phone IS DISTINCT FROM '+351 900 000 001' THEN
    RAISE EXCEPTION 'FAIL: owner did not receive own phone (got %)', v_phone;
  END IF;
  RAISE NOTICE 'PASS: owner receives own phone via RPC';
END $$;

------------------------------------------------------------
-- 5. As the booking partner: RPC returns the owner's phone.
------------------------------------------------------------
DO $$
DECLARE
  v_phone text;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub','00000000-0000-0000-0000-00000000bbbb','role','authenticated')::text,
    true);
  SELECT phone INTO v_phone
  FROM public.get_profile_sensitive('00000000-0000-0000-0000-00000000aaaa');
  RESET ROLE;
  IF v_phone IS DISTINCT FROM '+351 900 000 001' THEN
    RAISE EXCEPTION 'FAIL: accepted-booking partner did not receive phone (got %)', v_phone;
  END IF;
  RAISE NOTICE 'PASS: accepted-booking partner receives phone via RPC';
END $$;

------------------------------------------------------------
-- 6. Pending-booking partner must NOT receive phone.
------------------------------------------------------------
DO $$
DECLARE
  cnt int;
BEGIN
  -- Downgrade the booking to pending and re-test
  UPDATE public.bookings SET status = 'pending'
  WHERE id = '00000000-0000-0000-0000-0000000bbbb1';

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub','00000000-0000-0000-0000-00000000bbbb','role','authenticated')::text,
    true);
  SELECT count(*) INTO cnt
  FROM public.get_profile_sensitive('00000000-0000-0000-0000-00000000aaaa');
  RESET ROLE;

  IF cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL: pending-booking partner received phone';
  END IF;
  RAISE NOTICE 'PASS: pending-booking partner does NOT receive phone';
END $$;

ROLLBACK;
