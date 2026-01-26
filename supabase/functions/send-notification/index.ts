import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'overdue_invoice' | 'missing_document' | 'term_unlocked';
  data: {
    invoiceId?: string;
    termId?: string;
    projectName?: string;
    termName?: string;
    daysOverdue?: number;
    recipientEmail?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, data }: NotificationRequest = await req.json();

    console.log(`Processing notification: ${type}`, data);

    let subject = "";
    let message = "";

    switch (type) {
      case 'overdue_invoice':
        subject = `[URGENT] Invoice Jatuh Tempo - ${data.projectName}`;
        message = `Invoice untuk proyek "${data.projectName}" (${data.termName}) sudah jatuh tempo ${data.daysOverdue} hari. Mohon segera follow-up pembayaran.`;
        break;

      case 'missing_document':
        subject = `[ACTION] Dokumen Dibutuhkan - ${data.projectName}`;
        message = `Termin "${data.termName}" pada proyek "${data.projectName}" membutuhkan dokumen untuk membuka invoice. Mohon segera upload dokumen yang diperlukan.`;
        break;

      case 'term_unlocked':
        subject = `[INFO] Termin Siap Invoice - ${data.projectName}`;
        message = `Dokumen untuk termin "${data.termName}" pada proyek "${data.projectName}" sudah lengkap. Invoice dapat segera dibuat.`;
        break;
    }

    // Log notification (in production, this would send actual email via Resend/SendGrid)
    const { error: logError } = await supabase
      .from('email_notifications')
      .insert({
        notification_type: type,
        recipient_email: data.recipientEmail || 'finance@zenmultimedia.co.id',
        subject,
        related_id: data.invoiceId || data.termId,
        status: 'logged', // Would be 'sent' after actual email sending
      });

    if (logError) {
      console.error("Error logging notification:", logError);
    }

    console.log(`Notification logged: ${subject}`);
    console.log(`Message: ${message}`);

    // Note: To actually send emails, integrate with Resend:
    // 1. Add RESEND_API_KEY secret
    // 2. Import Resend and send email
    // For now, we just log the notification

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification logged successfully",
        details: { subject, message }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-notification:", error);
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
