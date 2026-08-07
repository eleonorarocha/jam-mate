import { useMemo } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { getStripe, getStripeEnvironment } from '@/lib/stripe';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface Props {
  priceId: string;
  returnUrl: string;
  onError?: (message: string) => void;
  /** Called when the server refuses checkout because a Pro subscription already exists. */
  onAlreadyPro?: (portalUrl: string) => void;
}

const StripeEmbeddedCheckout = ({ priceId, returnUrl, onError, onAlreadyPro }: Props) => {
  const options = useMemo(
    () => ({
      fetchClientSecret: async (): Promise<string> => {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { priceId, returnUrl, environment: getStripeEnvironment() },
        });

        // Non-2xx responses (e.g. the 409 "already Pro" guard) arrive as an
        // error with the JSON body in error.context — parse it before failing.
        let payload: any = data;
        if (error && error instanceof FunctionsHttpError) {
          payload = await error.context.json().catch(() => null);
        }

        if (payload?.portalUrl) {
          onAlreadyPro?.(payload.portalUrl as string);
          throw new Error('already_pro');
        }
        if (error || !payload?.clientSecret) {
          const message = payload?.error || error?.message || 'Não foi possível iniciar o pagamento.';
          onError?.(message);
          throw new Error(message);
        }
        return payload.clientSecret as string;
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
