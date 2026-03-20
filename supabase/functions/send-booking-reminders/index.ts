import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify this is called with service role key (cron job) or valid auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    // Allow service role key (for cron) or verify as authenticated user
    if (token !== serviceRoleKey) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const anonClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Only admins can manually trigger reminders
      const supabaseCheck = createClient(supabaseUrl, serviceRoleKey);
      const { data: isAdmin } = await supabaseCheck.rpc("has_role", {
        _user_id: claimsData.claims.sub,
        _role: "admin",
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const resend = new Resend(resendApiKey);

    // Find accepted bookings starting between 55 and 65 minutes from now
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

    // Send reminder emails for each booking
    let emailsSent = 0;
    for (const booking of bookings) {
      try {
        const [requesterAuth, musicianAuth] = await Promise.all([
          supabase.auth.admin.getUserById(booking.requester_id),
          supabase.auth.admin.getUserById(booking.musician_id),
        ]);

        const [requesterProfile, musicianProfile] = await Promise.all([
          supabase.from("profiles").select("first_name, username, instrument").eq("id", booking.requester_id).single(),
          supabase.from("profiles").select("first_name, username, instrument").eq("id", booking.musician_id).single(),
        ]);

        const requesterName = requesterProfile.data?.first_name || requesterProfile.data?.username || "Músico";
        const musicianName = musicianProfile.data?.first_name || musicianProfile.data?.username || "Músico";

        const formattedDate = new Date(booking.scheduled_date).toLocaleString("pt-PT", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        });

        const buildEmail = (recipientName: string, partnerName: string, partnerInstrument: string | null) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">⏰ Jam Session em Breve!</h1>
                <p style="color: rgba(255, 255, 255, 0.9); margin-top: 8px; font-size: 16px;">Falta menos de 1 hora</p>
              </div>
              
              <div style="padding: 32px;">
                <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">
                  Olá ${recipientName}! 🎸
                </h2>
                
                <p style="color: #3f3f46; line-height: 1.6; margin-bottom: 24px;">
                  A tua jam session com <strong>${partnerName}</strong> começa em breve. Prepara-te!
                </p>
                
                <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #fde68a;">
                  <h3 style="color: #92400e; margin: 0 0 16px 0; font-size: 16px;">📋 Detalhes</h3>
                  
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #92400e; font-size: 14px;">📅 Quando:</td>
                      <td style="padding: 8px 0; color: #92400e; font-size: 14px; font-weight: 500;">${formattedDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #92400e; font-size: 14px;">⏱️ Duração:</td>
                      <td style="padding: 8px 0; color: #92400e; font-size: 14px; font-weight: 500;">${booking.duration_hours} hora${booking.duration_hours > 1 ? "s" : ""}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #92400e; font-size: 14px;">🎵 Parceiro:</td>
                      <td style="padding: 8px 0; color: #92400e; font-size: 14px; font-weight: 500;">${partnerName}</td>
                    </tr>
                    ${partnerInstrument ? `
                    <tr>
                      <td style="padding: 8px 0; color: #92400e; font-size: 14px;">🎸 Instrumento:</td>
                      <td style="padding: 8px 0; color: #92400e; font-size: 14px; font-weight: 500;">${partnerInstrument}</td>
                    </tr>
                    ` : ""}
                  </table>
                </div>
                
                <p style="color: #3f3f46; line-height: 1.6; margin-bottom: 24px;">
                  💡 <strong>Dica:</strong> Confirma os últimos detalhes com o teu parceiro pelo chat!
                </p>
                
                <div style="text-align: center;">
                  <a href="https://jammate.lovable.app/messages" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Abrir Chat
                  </a>
                </div>
              </div>
              
              <div style="background-color: #f4f4f5; padding: 24px; text-align: center;">
                <p style="color: #71717a; font-size: 12px; margin: 0;">
                  Este email foi enviado pelo JamMate. Boas jams! 🎶
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        const requesterEmail = requesterAuth.data?.user?.email;
        if (requesterEmail) {
          await resend.emails.send({
            from: "JamMate <geral@jammate.com>",
            to: [requesterEmail],
            subject: `⏰ Jam session com ${musicianName} começa em breve!`,
            html: buildEmail(requesterName, musicianName, musicianProfile.data?.instrument || null),
          });
          emailsSent++;
          console.log(`Reminder email sent to requester: ${requesterEmail}`);
        }

        const musicianEmail = musicianAuth.data?.user?.email;
        if (musicianEmail) {
          await resend.emails.send({
            from: "JamMate <geral@jammate.com>",
            to: [musicianEmail],
            subject: `⏰ Jam session com ${requesterName} começa em breve!`,
            html: buildEmail(musicianName, requesterName, requesterProfile.data?.instrument || null),
          });
          emailsSent++;
          console.log(`Reminder email sent to musician: ${musicianEmail}`);
        }
      } catch (emailErr) {
        console.error(`Error sending reminder emails for booking ${booking.id}:`, emailErr);
      }
    }

    console.log(`Processed ${ids.length} booking(s), sent ${emailsSent} email(s)`);

    return new Response(
      JSON.stringify({ message: "Reminders sent", count: ids.length, emailsSent }),
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
