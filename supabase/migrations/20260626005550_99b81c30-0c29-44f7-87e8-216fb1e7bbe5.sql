
-- =========================================================
-- Pro subscriptions + snippet gating (structure only, no payments yet)
-- =========================================================

-- 1. Subscriptions table
CREATE TYPE public.subscription_tier AS ENUM ('free', 'pro');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'expired');

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier public.subscription_tier NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  provider TEXT,
  provider_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Helper: is the user currently Pro?
CREATE OR REPLACE FUNCTION public.is_pro(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND tier = 'pro'
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())
  )
$$;

-- 3. Relax snippet constraints to allow Pro (multiple snippets, up to 60s)
DROP INDEX IF EXISTS public.music_snippets_one_per_user;
ALTER TABLE public.music_snippets DROP CONSTRAINT IF EXISTS music_snippets_duration_seconds_check;
ALTER TABLE public.music_snippets ADD CONSTRAINT music_snippets_duration_seconds_check
  CHECK (duration_seconds > 0 AND duration_seconds <= 60);

-- 4. Enforce per-tier limits via trigger
CREATE OR REPLACE FUNCTION public.enforce_snippet_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_pro BOOLEAN;
  v_count INT;
  v_max_count INT;
  v_max_seconds NUMERIC;
BEGIN
  v_is_pro := public.is_pro(NEW.user_id);
  v_max_count := CASE WHEN v_is_pro THEN 5 ELSE 1 END;
  v_max_seconds := CASE WHEN v_is_pro THEN 60 ELSE 30 END;

  IF NEW.duration_seconds > v_max_seconds + 0.5 THEN
    RAISE EXCEPTION 'Snippet duration exceeds the limit for your plan (% s).', v_max_seconds
      USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.music_snippets
  WHERE user_id = NEW.user_id;

  IF v_count >= v_max_count THEN
    RAISE EXCEPTION 'Snippet limit reached for your plan (% snippets). Upgrade to Pro for more.', v_max_count
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER music_snippets_enforce_limits
  BEFORE INSERT ON public.music_snippets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_snippet_limits();
