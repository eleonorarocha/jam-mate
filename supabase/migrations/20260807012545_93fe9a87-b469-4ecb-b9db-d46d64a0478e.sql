ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pro_until timestamptz;
CREATE INDEX IF NOT EXISTS idx_profiles_pro_until ON public.profiles(pro_until);

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS price_id text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox';

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_provider_sub_id
  ON public.subscriptions(provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

CREATE OR REPLACE FUNCTION public.sync_pro_until()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pro_until timestamptz;
BEGIN
  SELECT MAX(s.current_period_end) INTO v_pro_until
  FROM public.subscriptions s
  WHERE s.user_id = NEW.user_id
    AND s.tier = 'pro'
    AND s.status = 'active';

  UPDATE public.profiles
  SET pro_until = v_pro_until
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_sync_pro_until ON public.subscriptions;
CREATE TRIGGER subscriptions_sync_pro_until
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_pro_until();