import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find accepted bookings starting between 55 and 65 minutes from now
    // that haven't had a reminder sent yet
    const now = new Date();
    const from = new Date(now.getTime() + 55 * 60 * 1000);
    const to = new Date(now.getTime() + 65 * 60 * 1000);

    const { data: bookings, error: fetchError } = await supabase
      .from("bookings")
      .select("id, requester_id, musician_id, scheduled_date, duration_hours")
      .eq("status", "accepted")
      .eq("reminder_sent", false)
      .gte("scheduled_date", from.toISOString())
      .lte("scheduled_date", to.toISOString());

    if (fetchError) {
      console.error("Error fetching bookings:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders to send", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark all found bookings as reminder_sent
    const ids = bookings.map((b) => b.id);
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ reminder_sent: true })
      .in("id", ids);

    if (updateError) {
      console.error("Error updating bookings:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sent reminders for ${ids.length} booking(s):`, ids);

    return new Response(
      JSON.stringify({ message: "Reminders sent", count: ids.length, ids }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
