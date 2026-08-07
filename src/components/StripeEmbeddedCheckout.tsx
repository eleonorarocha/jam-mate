import { useMemo } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { getStripe, getStripeEnvironment } from '@/lib/stripe';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  priceId: string;
  returnUrl: string;
  onError?: (message: string) => void;
}

const StripeEmbeddedCheckout = ({ priceId, returnUrl, onError }: Props) => {
  const options = useMemo(
    () => ({
      fetchClientSecret: async (): Promise<string> => {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { priceId, returnUrl, environment: getStripeEnvironment() },
        });
        if (error || !data?.clientSecret) {
          const message = data?.error || error?.message || 'Não foi possível iniciar o pagamento.';
          onError?.(message);
          throw new Error(message);
        }
        return data.clientSecret as string;
      },
    }),
    // Intentionally created once per priceId: changing the options object
    // remounts the provider and Stripe throws on client-secret changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [priceId, returnUrl]
  );

  return (
    <div id="checkout" className="max-h-[65vh] overflow-y-auto">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
};

export default StripeEmbeddedCheckout;
