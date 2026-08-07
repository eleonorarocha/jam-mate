import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getStripeEnvironment, isPaymentsConfigured } from '@/lib/stripe';
import { useToast } from '@/hooks/use-toast';

/** Opens the Stripe customer portal in a new tab. Shared by settings and the upgrade dialog. */
export const useCustomerPortal = () => {
  const { toast } = useToast();
  const [opening, setOpening] = useState(false);

  const openPortal = useCallback(async (directUrl?: string) => {
    if (directUrl) {
      window.open(directUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!isPaymentsConfigured()) {
      toast({
        title: 'Pagamentos indisponíveis',
        description: 'A configuração de pagamentos ainda não está concluída.',
        variant: 'destructive',
      });
      return;
    }
    setOpening(true);
    const { data, error } = await supabase.functions.invoke('customer-portal', {
      body: { environment: getStripeEnvironment(), returnUrl: window.location.href },
    });
    setOpening(false);

    if (error || !data?.url) {
      toast({
        title: 'Erro',
        description: data?.error || error?.message || 'Não foi possível abrir o portal de subscrição.',
        variant: 'destructive',
      });
      return;
    }
    window.open(data.url as string, '_blank', 'noopener,noreferrer');
  }, [toast]);

  return { openPortal, opening };
};
