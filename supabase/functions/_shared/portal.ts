import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "./stripe.ts";

export interface ActiveSubscription {
  stripe_customer_id: string | null;
  current_period_end: string | null;
  price_id: string | null;
}

/**
 * Returns the user's active Pro subscription for this environment, or null.
 * Uses the service-role client, so it does not depend on RLS or client state.
 */
export async function findActiveSubscription(
  supabase: SupabaseClient,
  userId: string,
  environment: StripeEnv,
): Promise<ActiveSubscription | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, current_period_end, price_id")
    .eq("user_id", userId)
    .eq("environment", environment)
    .eq("tier", "pro")
    .eq("status", "active")
    .or(`current_period_end.is.null,current_period_end.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as ActiveSubscription | null) ?? null;
}

/** Creates a Stripe billing portal session for a customer. */
export async function createPortalUrl(options: {
  customerId: string;
  environment: StripeEnv;
  returnUrl?: string;
}): Promise<string> {
  const stripe = createStripeClient(options.environment);
  const portal = await stripe.billingPortal.sessions.create({
    customer: options.customerId,
    ...(options.returnUrl && { return_url: options.returnUrl }),
  });
  return portal.url;
}
