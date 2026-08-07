import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, getStripeErrorMessage } from "../_shared/stripe.ts";
import { createPortalUrl } from "../_shared/portal.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const environment: StripeEnv = body?.environment === "live" ? "live" : "sandbox";
    const returnUrl: string | undefined = typeof body?.returnUrl === "string" ? body.returnUrl : undefined;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .eq("environment", environment)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_customer_id) return json({ error: "No subscription found" }, 404);

    const url = await createPortalUrl({
      customerId: sub.stripe_customer_id as string,
      environment,
      returnUrl,
    });

    return json({ url });
  } catch (error) {
    console.error("customer-portal error:", error);
    return json({ error: getStripeErrorMessage(error) }, 500);
  }
});
