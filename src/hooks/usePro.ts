import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const FREE_LIMITS = { maxSnippets: 1, maxSeconds: 30 };
export const PRO_LIMITS = { maxSnippets: 5, maxSeconds: 60 };

interface ProState {
  isPro: boolean;
  loading: boolean;
  limits: typeof FREE_LIMITS;
  refresh: () => Promise<void>;
}

export const usePro = (): ProState => {
  const { user } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setIsPro(false);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('subscriptions')
      .select('tier, status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    const active =
      data?.tier === 'pro' &&
      data?.status === 'active' &&
      (!data.current_period_end || new Date(data.current_period_end) > new Date());
    setIsPro(!!active);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return {
    isPro,
    loading,
    limits: isPro ? PRO_LIMITS : FREE_LIMITS,
    refresh: load,
  };
};
