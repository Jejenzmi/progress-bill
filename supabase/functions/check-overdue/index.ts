import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

        // Log notification
        await supabase.from('email_notifications').insert({
          notification_type: 'overdue_invoice',
          recipient_email: (invoice.term as any).project.client.pic_email || 'finance@zenmultimedia.co.id',
          subject: `Invoice ${invoice.invoice_number} Jatuh Tempo ${daysOverdue} Hari`,
          related_id: invoice.id,
          status: 'logged',
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
        project:projects!inner(
          project_name,
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

      if (!evidences || evidences.length === 0) {
        console.log(`Term ${term.term_name} needs document upload`);

        // Log notification for PM
        await supabase.from('email_notifications').insert({
          notification_type: 'missing_document',
          recipient_email: 'pm@zenmultimedia.co.id',
          subject: `Dokumen Dibutuhkan: ${(term.project as any).project_name} - ${term.term_name}`,
          related_id: term.id,
          status: 'logged',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        overdueInvoicesChecked: overdueInvoices?.length || 0,
        pendingTermsChecked: pendingTerms?.length || 0,
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
