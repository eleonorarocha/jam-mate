DROP INDEX IF EXISTS public.idx_subscriptions_provider_sub_id;
CREATE UNIQUE INDEX idx_subscriptions_provider_sub_id ON public.subscriptions (provider_subscription_id);