import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const generateEmailHtml = (subject: string, message: string, ctaUrl?: string, ctaText?: string) => {
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
            <td style="background: linear-gradient(135deg, #dc3545 0%, #a71d2a 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ⚠️ PERINGATAN
              </h1>
              <p style="margin: 5px 0 0; color: #f8d7da; font-size: 14px;">PT Zen Multimedia Indonesia - CRM</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #dc3545; font-size: 20px;">
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

    const today = new Date();
    const overdueThreshold = 14; // days
    const baseUrl = "https://crm.zefin.id";

    let emailsSent = 0;
    let emailsFailed = 0;

    // Check for overdue invoices (sent but not paid, past due date)
    const { data: overdueInvoices, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        due_date,
        amount,
        term:payment_terms!inner(
          term_name,
          project:projects!inner(
            project_name,
            client:clients!inner(name, pic_email)
          )
        )
      `)
      .eq('status', 'Sent')
      .lt('due_date', today.toISOString().split('T')[0]);

    if (invoiceError) throw invoiceError;

    console.log(`Found ${overdueInvoices?.length || 0} overdue invoices`);

    // Process each overdue invoice
    for (const invoice of overdueInvoices || []) {
      const dueDate = new Date(invoice.due_date);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Only notify if overdue by more than threshold
      if (daysOverdue >= overdueThreshold) {
        console.log(`Invoice ${invoice.invoice_number} is ${daysOverdue} days overdue`);

        // Update status to Overdue
        await supabase
          .from('invoices')
          .update({ status: 'Overdue' })
          .eq('id', invoice.id);

        const termData = invoice.term as any;
        const clientEmail = termData.project.client.pic_email || 'finance@zenmultimedia.co.id';
        const subject = `[URGENT] Invoice ${invoice.invoice_number} Jatuh Tempo ${daysOverdue} Hari`;
        const message = `Invoice <strong>${invoice.invoice_number}</strong> untuk proyek "<strong>${termData.project.project_name}</strong>" (${termData.term_name}) sudah <strong style="color: #dc3545;">jatuh tempo ${daysOverdue} hari</strong>.<br><br>Mohon segera follow-up pembayaran kepada klien <strong>${termData.project.client.name}</strong>.`;

        const htmlContent = generateEmailHtml(subject, message, `${baseUrl}/invoices`, "Lihat Invoice");
        
        // Send email
        const emailResult = await sendResendEmail(clientEmail, subject, htmlContent);
        
        if (emailResult.success) {
          emailsSent++;
        } else {
          emailsFailed++;
        }

        // Log notification
        await supabase.from('email_notifications').insert({
          notification_type: 'overdue_invoice',
          recipient_email: clientEmail,
          subject,
          related_id: invoice.id,
          status: emailResult.success ? 'sent' : 'failed',
        });
      }
    }

    // Check for terms missing documents (unlocked but no evidence)
    const { data: pendingTerms, error: termError } = await supabase
      .from('payment_terms')
      .select(`
        id,
        term_name,
        is_locked,
        due_date,
        project:projects!inner(
          project_name,
          created_by,
          client:clients!inner(name)
        )
      `)
      .eq('is_locked', false);

    if (termError) throw termError;

    // Check which terms have no evidence
    for (const term of pendingTerms || []) {
      const { data: evidences } = await supabase
        .from('term_evidences')
        .select('id')
        .eq('term_id', term.id);

      // Check if due date is approaching (within 7 days)
      const termDueDate = term.due_date ? new Date(term.due_date) : null;
      const daysUntilDue = termDueDate ? Math.floor((termDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

      if ((!evidences || evidences.length === 0) && daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0) {
        console.log(`Term ${term.term_name} needs document upload (${daysUntilDue} days until due)`);

        const termData = term.project as any;
        const subject = `[ACTION] Dokumen Dibutuhkan: ${termData.project_name} - ${term.term_name}`;
        const message = `Termin "<strong>${term.term_name}</strong>" pada proyek "<strong>${termData.project_name}</strong>" (klien: ${termData.client.name}) membutuhkan dokumen untuk membuka invoice.<br><br>⏰ <strong>Jatuh tempo dalam ${daysUntilDue} hari</strong><br><br>Mohon segera upload dokumen yang diperlukan (BAST, SPK, atau Laporan Progress).`;

        const htmlContent = generateEmailHtml(subject, message, `${baseUrl}/projects`, "Upload Dokumen");
        
        // Send to PM email
        const emailResult = await sendResendEmail('pm@zenmultimedia.co.id', subject, htmlContent);
        
        if (emailResult.success) {
          emailsSent++;
        } else {
          emailsFailed++;
        }

        // Log notification
        await supabase.from('email_notifications').insert({
          notification_type: 'missing_document',
          recipient_email: 'pm@zenmultimedia.co.id',
          subject,
          related_id: term.id,
          status: emailResult.success ? 'sent' : 'failed',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        overdueInvoicesChecked: overdueInvoices?.length || 0,
        pendingTermsChecked: pendingTerms?.length || 0,
        emailsSent,
        emailsFailed,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-overdue:", error);
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
