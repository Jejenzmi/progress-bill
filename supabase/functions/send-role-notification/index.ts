import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  marketing: "Marketing",
  finance: "Finance",
  project_manager: "Project Manager",
};

interface RoleChangeRequest {
  user_id: string;
  user_email: string;
  user_name: string;
  added_roles: string[];
  removed_roles: string[];
  changed_by: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Role notification function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      user_id,
      user_email,
      user_name,
      added_roles,
      removed_roles,
      changed_by,
    }: RoleChangeRequest = await req.json();

    console.log("Processing role change notification for:", user_email);
    console.log("Added roles:", added_roles);
    console.log("Removed roles:", removed_roles);

    // Validate required fields
    if (!user_email) {
      throw new Error("User email is required");
    }

    if (added_roles.length === 0 && removed_roles.length === 0) {
      console.log("No role changes to notify");
      return new Response(
        JSON.stringify({ message: "No role changes" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Build email content
    const addedRoleLabels = added_roles.map((r) => ROLE_LABELS[r] || r).join(", ");
    const removedRoleLabels = removed_roles.map((r) => ROLE_LABELS[r] || r).join(", ");

    let changeDescription = "";
    if (added_roles.length > 0) {
      changeDescription += `<p style="color: #16a34a;"><strong>Role ditambahkan:</strong> ${addedRoleLabels}</p>`;
    }
    if (removed_roles.length > 0) {
      changeDescription += `<p style="color: #dc2626;"><strong>Role dihapus:</strong> ${removedRoleLabels}</p>`;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">PT Zen Multimedia Indonesia</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Notifikasi Perubahan Role</p>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p>Halo <strong>${user_name || "User"}</strong>,</p>
          
          <p>Role akses Anda di sistem Zen Multimedia telah diperbarui:</p>
          
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            ${changeDescription}
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Perubahan dilakukan oleh: ${changed_by || "Administrator"}
          </p>
          
          <p>Jika Anda memiliki pertanyaan tentang perubahan ini, silakan hubungi administrator.</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Email ini dikirim secara otomatis oleh sistem Zen Multimedia Indonesia.<br>
            Mohon tidak membalas email ini.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Zen Multimedia <onboarding@resend.dev>",
        to: [user_email],
        subject: "Notifikasi Perubahan Role - Zen Multimedia",
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email API response:", emailResult);

    if (!emailResponse.ok) {
      throw new Error(emailResult.message || "Failed to send email");
    }

    // Log notification to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from("email_notifications").insert({
      notification_type: "role_change",
      recipient_email: user_email,
      subject: "Notifikasi Perubahan Role",
      related_id: user_id,
      status: "sent",
    });

    console.log("Notification logged to database");

    return new Response(
      JSON.stringify({ success: true, emailResult }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-role-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
