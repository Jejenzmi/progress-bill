import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'overdue_invoice' | 'missing_document' | 'term_unlocked' | 'quotation_submitted' | 'quotation_approved' | 'quotation_rejected';
  data: {
    invoiceId?: string;
    termId?: string;
    quotationId?: string;
    projectName?: string;
    termName?: string;
    daysOverdue?: number;
    recipientEmail?: string;
    recipientName?: string;
    submitterName?: string;
    approverName?: string;
    rejectionReason?: string;
  };
}

const sendResendEmail = async (to: string, subject: string, htmlContent: string) => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured, skipping email send");
    return { success: false, reason: "API key not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Zen CRM <noreply@zefin.id>",
        to: [to],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      return { success: false, reason: error };
    }

    const result = await response.json();
    console.log("Email sent successfully:", result.id);
    return { success: true, emailId: result.id };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, reason: String(error) };
  }
};

const generateEmailHtml = (type: string, subject: string, message: string, ctaUrl?: string, ctaText?: string) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3d5a80 0%, #2c3e50 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                PT Zen Multimedia Indonesia
              </h1>
              <p style="margin: 5px 0 0; color: #a0c4e8; font-size: 14px;">CRM Notification</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #3d5a80; font-size: 20px;">
                ${subject}
              </h2>
              <p style="margin: 0 0 25px; color: #555; font-size: 16px; line-height: 1.6;">
                ${message}
              </p>
              ${ctaUrl ? `
              <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="background-color: #3d5a80; padding: 12px 30px; border-radius: 6px;">
                    <a href="${ctaUrl}" style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      ${ctaText || 'Lihat Detail'}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #888; font-size: 12px; text-align: center;">
                Email ini dikirim otomatis oleh sistem CRM PT Zen Multimedia Indonesia.<br>
                © ${new Date().getFullYear()} PT Zen Multimedia Indonesia
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
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
    let ctaUrl = "";
    let ctaText = "";
    const baseUrl = "https://crm.zefin.id";

    switch (type) {
      case 'overdue_invoice':
        subject = `[URGENT] Invoice Jatuh Tempo - ${data.projectName}`;
        message = `Invoice untuk proyek "<strong>${data.projectName}</strong>" (${data.termName}) sudah jatuh tempo <strong>${data.daysOverdue} hari</strong>.<br><br>Mohon segera follow-up pembayaran kepada klien.`;
        ctaUrl = `${baseUrl}/invoices`;
        ctaText = "Lihat Invoice";
        break;

      case 'missing_document':
        subject = `[ACTION] Dokumen Dibutuhkan - ${data.projectName}`;
        message = `Termin "<strong>${data.termName}</strong>" pada proyek "<strong>${data.projectName}</strong>" membutuhkan dokumen untuk membuka invoice.<br><br>Mohon segera upload dokumen yang diperlukan (BAST, SPK, atau Laporan Progress).`;
        ctaUrl = `${baseUrl}/projects`;
        ctaText = "Upload Dokumen";
        break;

      case 'term_unlocked':
        subject = `[INFO] Termin Siap Invoice - ${data.projectName}`;
        message = `Dokumen untuk termin "<strong>${data.termName}</strong>" pada proyek "<strong>${data.projectName}</strong>" sudah lengkap.<br><br>Invoice dapat segera dibuat untuk termin ini.`;
        ctaUrl = `${baseUrl}/invoices`;
        ctaText = "Buat Invoice";
        break;

      case 'quotation_submitted':
        subject = `[REVIEW] Quotation Diajukan - ${data.projectName}`;
        message = `Quotation untuk proyek "<strong>${data.projectName}</strong>" telah diajukan oleh <strong>${data.submitterName || 'Marketing'}</strong> untuk direview.<br><br>Mohon segera review dan berikan keputusan approval.`;
        ctaUrl = `${baseUrl}/quotations`;
        ctaText = "Review Quotation";
        break;

      case 'quotation_approved':
        subject = `[APPROVED] Quotation Disetujui - ${data.projectName}`;
        message = `Selamat! Quotation untuk proyek "<strong>${data.projectName}</strong>" telah <strong style="color: #28a745;">DISETUJUI</strong> oleh ${data.approverName || 'Management'}.<br><br>Quotation dapat dikirimkan ke klien.`;
        ctaUrl = `${baseUrl}/quotations`;
        ctaText = "Lihat Quotation";
        break;

      case 'quotation_rejected':
        subject = `[REJECTED] Quotation Ditolak - ${data.projectName}`;
        message = `Quotation untuk proyek "<strong>${data.projectName}</strong>" <strong style="color: #dc3545;">DITOLAK</strong> oleh ${data.approverName || 'Management'}.<br><br><strong>Alasan:</strong> ${data.rejectionReason || 'Tidak ada alasan diberikan'}<br><br>Silakan revisi quotation dan ajukan kembali.`;
        ctaUrl = `${baseUrl}/quotations`;
        ctaText = "Revisi Quotation";
        break;
    }

    const htmlContent = generateEmailHtml(type, subject, message, ctaUrl, ctaText);
    const recipientEmail = data.recipientEmail || 'finance@zenmultimedia.co.id';

    // Send email via Resend
    const emailResult = await sendResendEmail(recipientEmail, subject, htmlContent);

    // Log notification to database
    const { error: logError } = await supabase
      .from('email_notifications')
      .insert({
        notification_type: type,
        recipient_email: recipientEmail,
        subject,
        related_id: data.invoiceId || data.termId || data.quotationId,
        status: emailResult.success ? 'sent' : 'failed',
      });

    if (logError) {
      console.error("Error logging notification:", logError);
    }

    console.log(`Notification processed: ${subject}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailSent: emailResult.success,
        message: emailResult.success ? "Email sent successfully" : "Email not sent (API key not configured or error)",
        details: { subject, recipientEmail }
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
