import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingNotificationRequest {
  musicianId: string;
  requesterId: string;
  scheduledDate: string;
  durationHours: number;
  message?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { musicianId, requesterId, scheduledDate, durationHours, message }: BookingNotificationRequest = await req.json();

    console.log("Sending booking notification:", { musicianId, requesterId, scheduledDate });

    // Fetch musician profile (to get email)
    const { data: musicianAuth, error: musicianAuthError } = await supabase.auth.admin.getUserById(musicianId);
    
    if (musicianAuthError || !musicianAuth.user?.email) {
      console.error("Error fetching musician email:", musicianAuthError);
      throw new Error("Could not find musician email");
    }

    // Fetch musician profile for name
    const { data: musicianProfile } = await supabase
      .from("profiles")
      .select("first_name, username")
      .eq("id", musicianId)
      .single();

    // Fetch requester profile
    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name, username, instrument, skill_level")
      .eq("id", requesterId)
      .single();

    const musicianName = musicianProfile?.first_name || musicianProfile?.username || "Músico";
    const requesterName = requesterProfile?.first_name && requesterProfile?.last_name 
      ? `${requesterProfile.first_name} ${requesterProfile.last_name}`
      : requesterProfile?.username || "Um músico";
    
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
      to: [musicianAuth.user.email],
      subject: `🎸 Novo pedido de Jam Session de ${requesterName}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎵 JamMate</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin-top: 8px; font-size: 16px;">Novo Pedido de Jam Session</p>
            </div>
            
            <div style="padding: 32px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">
                Olá ${musicianName}! 👋
              </h2>
              
              <p style="color: #3f3f46; line-height: 1.6; margin-bottom: 24px;">
                <strong>${requesterName}</strong> quer tocar contigo! Recebeste um novo pedido de jam session.
              </p>
              
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #18181b; margin: 0 0 16px 0; font-size: 16px;">📋 Detalhes do Pedido</h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">📅 Data:</td>
                    <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">⏱️ Duração:</td>
                    <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">${durationHours} hora${durationHours > 1 ? "s" : ""}</td>
                  </tr>
                  ${requesterProfile?.instrument ? `
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">🎸 Instrumento:</td>
                    <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">${requesterProfile.instrument}</td>
                  </tr>
                  ` : ""}
                  ${requesterProfile?.skill_level ? `
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">📊 Nível:</td>
                    <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">${skillLevelMap[requesterProfile.skill_level] || requesterProfile.skill_level}</td>
                  </tr>
                  ` : ""}
                </table>
                
                ${message ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e4e4e7;">
                  <p style="color: #71717a; font-size: 14px; margin: 0 0 8px 0;">💬 Mensagem:</p>
                  <p style="color: #18181b; font-size: 14px; margin: 0; font-style: italic;">"${message}"</p>
                </div>
                ` : ""}
              </div>
              
              <p style="color: #3f3f46; line-height: 1.6; margin-bottom: 24px;">
                Entra na app para aceitar ou recusar este pedido. Não deixes o teu futuro parceiro de jam à espera! 🎶
              </p>
              
              <div style="text-align: center;">
                <a href="https://jammate.lovable.app/calendar" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Ver Pedido
                </a>
              </div>
            </div>
            
            <div style="background-color: #f4f4f5; padding: 24px; text-align: center;">
              <p style="color: #71717a; font-size: 12px; margin: 0;">
                Este email foi enviado pelo JamMate. Se não reconheces este pedido, podes ignorar este email.
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
    console.error("Error in send-booking-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
