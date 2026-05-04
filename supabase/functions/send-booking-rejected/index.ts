import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escapeHtml = (str: string) =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

interface BookingRejectedRequest {
  bookingId: string;
  musicianId: string;
  requesterId: string;
  scheduledDate: string;
  durationHours: number;
  rejectionReason?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const callerId = claimsData.claims.sub;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const { bookingId, musicianId, requesterId, scheduledDate, durationHours, rejectionReason }: BookingRejectedRequest = await req.json();

    // Verify caller is the musician (only musician can reject)
    if (callerId !== musicianId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Sending booking rejected notification:", { bookingId, musicianId, requesterId, rejectionReason });

    // Fetch requester email
    const { data: requesterAuth, error: requesterAuthError } = await supabase.auth.admin.getUserById(requesterId);
    
    if (requesterAuthError || !requesterAuth.user?.email) {
      console.error("Error fetching requester email:", requesterAuthError);
      throw new Error("Could not find requester email");
    }

    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("first_name, username")
      .eq("id", requesterId)
      .single();

    const { data: musicianProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name, username, instrument, skill_level, city")
      .eq("id", musicianId)
      .single();

    const requesterName = requesterProfile?.first_name || requesterProfile?.username || "Músico";
    const musicianName = musicianProfile?.first_name && musicianProfile?.last_name 
      ? `${musicianProfile.first_name} ${musicianProfile.last_name}`
      : musicianProfile?.username || "O músico";
    
    const formattedDate = new Date(scheduledDate).toLocaleString("pt-PT", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailResponse = await resend.emails.send({
      from: "JamMate <geral@jammate.com>",
      to: [requesterAuth.user.email],
      subject: `O teu pedido de Jam Session não foi aceite`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Pedido Não Aceite</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin-top: 8px; font-size: 16px;">Infelizmente desta vez não foi possível</p>
            </div>
            
            <div style="padding: 32px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">
                Olá ${requesterName},
              </h2>
              
              <p style="color: #3f3f46; line-height: 1.6; margin-bottom: 24px;">
                Infelizmente, <strong>${musicianName}</strong> não pode aceitar o teu pedido de jam session desta vez.
              </p>
              
              ${rejectionReason ? `
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #fcd34d;">
                <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 16px;">💬 Mensagem do músico</h3>
                <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.6;">${escapeHtml(rejectionReason ?? '')}</p>
              </div>
              ` : ""}
              
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #e4e4e7;">
                <h3 style="color: #71717a; margin: 0 0 16px 0; font-size: 16px;">Detalhes do pedido</h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">📅 Data:</td>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px; font-weight: 500;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">⏱️ Duração:</td>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px; font-weight: 500;">${durationHours} hora${durationHours > 1 ? "s" : ""}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">🎵 Músico:</td>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px; font-weight: 500;">${musicianName}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #3f3f46; line-height: 1.6; margin-bottom: 24px;">
                💡 <strong>Não desanimes!</strong> Há muitos outros músicos disponíveis no JamMate. Explora o mapa e encontra novas oportunidades para tocar!
              </p>
              
              <div style="text-align: center;">
                <a href="https://jammate.lovable.app/map" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Encontrar Músicos
                </a>
              </div>
            </div>
            
            <div style="background-color: #f4f4f5; padding: 24px; text-align: center;">
              <p style="color: #71717a; font-size: 12px; margin: 0;">
                Este email foi enviado pelo JamMate. Continua a tocar! 🎶
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-booking-rejected function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
