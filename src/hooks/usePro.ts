import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getStripeEnvironment, isPaymentsConfigured } from '@/lib/stripe';

export const FREE_LIMITS = { maxSnippets: 1, maxSeconds: 30 };
export const PRO_LIMITS = { maxSnippets: 5, maxSeconds: 60 };

interface SubscriptionInfo {
  tier: string;
  status: string;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
}

interface ProState {
  isPro: boolean;
  loading: boolean;
  limits: typeof FREE_LIMITS;
  subscription: SubscriptionInfo | null;
  refresh: () => Promise<boolean>;
}

export const usePro = (): ProState => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setSubscription(null);
      setIsPro(false);
      setLoading(false);
      return false;
    }

    let query = supabase
      .from('subscriptions')
      .select('tier, status, price_id, current_period_end, cancel_at_period_end, stripe_customer_id')
      .eq('user_id', user.id);

    if (isPaymentsConfigured()) {
      query = query.eq('environment', getStripeEnvironment());
    }

    const { data } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const active =
      data?.tier === 'pro' &&
      data?.status === 'active' &&
      (!data.current_period_end || new Date(data.current_period_end) > new Date());

    setSubscription((data as SubscriptionInfo) ?? null);
    setIsPro(!!active);
    setLoading(false);
    return !!active;
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Realtime: react as soon as the webhook writes the subscription row.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`subscriptions-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` },
        () => { load(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, load]);

  return {
    isPro,
    loading,
    limits: isPro ? PRO_LIMITS : FREE_LIMITS,
    subscription,
    refresh: load,
  };
};
