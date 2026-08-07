import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

function periodEnd(subscription: any): string | null {
  const item = subscription.items?.data?.[0];
  const end = item?.current_period_end ?? subscription.current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}

function resolvePriceId(subscription: any): string | null {
  const price = subscription.items?.data?.[0]?.price;
  return price?.lookup_key || price?.metadata?.lovable_external_id || price?.id || null;
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  let userId: string | undefined = subscription.metadata?.userId;

  // Fallback: read userId from the Stripe Customer metadata.
  if (!userId && subscription.customer) {
    try {
      const stripe = createStripeClient(env);
      const customer: any = await stripe.customers.retrieve(
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      );
      userId = customer?.metadata?.userId;
    } catch (e) {
      console.error("Failed to resolve customer metadata:", e);
    }
  }
  if (!userId) {
    console.error("No userId for subscription", subscription.id);
    return;
  }

  const active = ["active", "trialing", "past_due"].includes(subscription.status);
  const tier = active ? "pro" : "free";
  const status = active ? "active" : subscription.status === "canceled" ? "cancelled" : "expired";

  const { error } = await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        tier,
        status,
        provider: "stripe",
        provider_subscription_id: subscription.id,
        stripe_customer_id: typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id ?? null,
        price_id: resolvePriceId(subscription),
        current_period_end: periodEnd(subscription),
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider_subscription_id" },
    );

  if (error) console.error("Failed to upsert subscription:", error);
}

async function cancelSubscription(subscription: any, env: StripeEnv) {
  const { error } = await getSupabase()
    .from("subscriptions")
    .update({
      tier: "free",
      status: "cancelled",
      cancel_at_period_end: false,
      current_period_end: periodEnd(subscription),
      updated_at: new Date().toISOString(),
    })
    .eq("provider_subscription_id", subscription.id)
    .eq("environment", env);

  if (error) console.error("Failed to cancel subscription:", error);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Invalid env query parameter:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;

  try {
    const event = await verifyWebhook(req, env);

    // Idempotency: skip events already processed.
    const { error: insertError } = await getSupabase()
      .from("processed_stripe_events")
      .insert({ event_id: event.id, event_type: event.type });
    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      console.error("Failed to record event:", insertError);
    }

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await upsertSubscription(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await cancelSubscription(event.data.object, env);
        break;
      case "checkout.session.completed": {
        const session: any = event.data.object;
        if (session.payment_status !== "unpaid" && session.subscription) {
          const stripe = createStripeClient(env);
          const subscription = await stripe.subscriptions.retrieve(
            typeof session.subscription === "string" ? session.subscription : session.subscription.id,
          );
          await upsertSubscription(
            { ...subscription, metadata: { userId: session.metadata?.userId, ...subscription.metadata } },
            env,
          );
        }
        break;
      }
      default:
        console.log("Unhandled event:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
