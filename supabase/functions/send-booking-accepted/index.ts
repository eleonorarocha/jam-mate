import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingAcceptedRequest {
  bookingId: string;
  musicianId: string;
  requesterId: string;
  scheduledDate: string;
  durationHours: number;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bookingId, musicianId, requesterId, scheduledDate, durationHours }: BookingAcceptedRequest = await req.json();

    console.log("Sending booking accepted notification:", { bookingId, musicianId, requesterId });

    // Fetch requester email
    const { data: requesterAuth, error: requesterAuthError } = await supabase.auth.admin.getUserById(requesterId);
    
    if (requesterAuthError || !requesterAuth.user?.email) {
      console.error("Error fetching requester email:", requesterAuthError);
      throw new Error("Could not find requester email");
    }

    // Fetch requester profile for name
    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("first_name, username")
      .eq("id", requesterId)
      .single();

    // Fetch musician profile
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

    const skillLevelMap: Record<string, string> = {
      beginner: "Iniciante",
      intermediate: "Intermédio",
      advanced: "Avançado",
      professional: "Profissional",
    };

    const emailResponse = await resend.emails.send({
      from: "JamMate <geral@jammate.com>",
      to: [requesterAuth.user.email],
      subject: `🎉 ${musicianName} aceitou a tua Jam Session!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Jam Confirmada!</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin-top: 8px; font-size: 16px;">A tua sessão foi aceite</p>
            </div>
            
            <div style="padding: 32px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">
                Excelente notícia, ${requesterName}! 🎸
              </h2>
              
              <p style="color: #3f3f46; line-height: 1.6; margin-bottom: 24px;">
                <strong>${musicianName}</strong> aceitou o teu pedido de jam session! Prepara-te para uma sessão incrível!
              </p>
              
              <div style="background-color: #dcfce7; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #bbf7d0;">
                <h3 style="color: #166534; margin: 0 0 16px 0; font-size: 16px;">✅ Detalhes da Jam Session</h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px;">📅 Data:</td>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 500;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px;">⏱️ Duração:</td>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 500;">${durationHours} hora${durationHours > 1 ? "s" : ""}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px;">🎵 Músico:</td>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 500;">${musicianName}</td>
                  </tr>
                  ${musicianProfile?.instrument ? `
                  <tr>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px;">🎸 Instrumento:</td>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 500;">${musicianProfile.instrument}</td>
                  </tr>
                  ` : ""}
                  ${musicianProfile?.skill_level ? `
                  <tr>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px;">📊 Nível:</td>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 500;">${skillLevelMap[musicianProfile.skill_level] || musicianProfile.skill_level}</td>
                  </tr>
                  ` : ""}
                  ${musicianProfile?.city ? `
                  <tr>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px;">📍 Cidade:</td>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 500;">${musicianProfile.city}</td>
                  </tr>
                  ` : ""}
                </table>
              </div>
              
              <p style="color: #3f3f46; line-height: 1.6; margin-bottom: 24px;">
                💡 <strong>Dica:</strong> Usa o chat da app para combinar os detalhes finais como local exacto e repertório!
              </p>
              
              <div style="text-align: center;">
                <a href="https://jammate.lovable.app/messages" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Enviar Mensagem
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
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-booking-accepted function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
