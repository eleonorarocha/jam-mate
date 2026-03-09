import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FeedbackNotificationRequest {
  userId: string;
  category: string;
  rating: number | null;
  message: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, category, rating, message }: FeedbackNotificationRequest = await req.json();

    // Fetch submitter profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, username")
      .eq("id", userId)
      .single();

    const userName = profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.username || "Utilizador desconhecido";

    // Fetch admin users
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found, skipping notification");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch admin emails
    const adminEmails: string[] = [];
    for (const adminRole of adminRoles) {
      const { data: adminAuth } = await supabase.auth.admin.getUserById(adminRole.user_id);
      if (adminAuth?.user?.email) {
        adminEmails.push(adminAuth.user.email);
      }
    }

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const categoryMap: Record<string, string> = {
      suggestion: "💡 Sugestão",
      bug: "🐛 Bug",
      complaint: "⚠️ Reclamação",
      praise: "🌟 Elogio",
      other: "📝 Outro",
    };

    const ratingStars = rating ? "⭐".repeat(rating) + "☆".repeat(5 - rating) : "Não avaliado";

    const emailResponse = await resend.emails.send({
      from: "JamMate <onboarding@resend.dev>",
      to: adminEmails,
      subject: `📬 Novo feedback de ${userName} — ${categoryMap[category] || category}`,
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
              <p style="color: rgba(255, 255, 255, 0.9); margin-top: 8px; font-size: 16px;">Novo Feedback Recebido</p>
            </div>
            
            <div style="padding: 32px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">
                ${categoryMap[category] || category}
              </h2>
              
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">👤 Utilizador:</td>
                    <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">${userName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">📂 Categoria:</td>
                    <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">${categoryMap[category] || category}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">⭐ Avaliação:</td>
                    <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">${ratingStars}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background-color: #fafafa; border-left: 4px solid #8b5cf6; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="color: #71717a; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Mensagem</p>
                <p style="color: #18181b; font-size: 14px; margin: 0; line-height: 1.6;">${message}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="https://jammate.lovable.app/admin" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Ver no Painel Admin
                </a>
              </div>
            </div>
            
            <div style="background-color: #f4f4f5; padding: 24px; text-align: center;">
              <p style="color: #71717a; font-size: 12px; margin: 0;">
                Este email foi enviado automaticamente pelo JamMate quando um utilizador submeteu feedback.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Feedback notification sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-feedback-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
