import { loadStripe, Stripe } from '@stripe/stripe-js';

export type StripeEnv = 'sandbox' | 'live';

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith('pk_test_')) return 'sandbox';
  if (clientToken?.startsWith('pk_live_')) return 'live';
  throw new Error(
    'Os pagamentos não estão configurados nesta build. Conclui o go-live do Stripe para ativar o checkout em produção.'
  );
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}

export function isPaymentsConfigured(): boolean {
  return !!clientToken && (clientToken.startsWith('pk_test_') || clientToken.startsWith('pk_live_'));
}

export function isTestMode(): boolean {
  return !!clientToken?.startsWith('pk_test_');
}

export const PRO_PLANS = [
  {
    priceId: 'pro_monthly',
    label: 'Mensal',
    price: '4,99 €',
    period: '/mês',
    note: 'Cancela quando quiseres',
  },
  {
    priceId: 'pro_yearly',
    label: 'Anual',
    price: '39,99 €',
    period: '/ano',
    note: 'Poupa ~33% — equivale a 3,33 €/mês',
    highlight: true,
  },
] as const;
