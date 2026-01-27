import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Activity {
  id: string;
  subject: string;
  reminder_at: string;
  assigned_to: string;
  lead_id?: string;
  client_id?: string;
  project_id?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get activities with pending reminders
    const now = new Date().toISOString();
    const { data: activities, error: fetchError } = await supabase
      .from('activities')
      .select(`
        id,
        subject,
        description,
        activity_type,
        reminder_at,
        scheduled_at,
        assigned_to,
        lead_id,
        client_id,
        project_id,
        lead:leads(name, company_name),
        client:clients(name),
        project:projects(project_name)
      `)
      .eq('reminder_sent', false)
      .eq('is_completed', false)
      .lte('reminder_at', now);

    if (fetchError) {
      throw fetchError;
    }

    if (!activities || activities.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending reminders' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: { id: string; status: string; error?: string }[] = [];

    for (const activity of activities) {
      try {
        // Get user email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
          activity.assigned_to
        );

        if (userError || !userData.user?.email) {
          results.push({ id: activity.id, status: 'skipped', error: 'User not found' });
          continue;
        }

        const userEmail = userData.user.email;
        const userName = userData.user.user_metadata?.full_name || 'User';

        // Get relation name
        let relationName = '';
        if (activity.lead) {
          relationName = (activity.lead as any).company_name || (activity.lead as any).name;
        } else if (activity.client) {
          relationName = (activity.client as any).name;
        } else if (activity.project) {
          relationName = (activity.project as any).project_name;
        }

        // Create in-app notification
        await supabase.from('notifications').insert({
          user_id: activity.assigned_to,
          title: `Reminder: ${activity.subject}`,
          message: `Aktivitas "${activity.subject}" untuk ${relationName} sudah waktunya dilakukan.`,
          type: 'reminder',
          link: '/activities',
          related_id: activity.id,
          related_type: 'activity',
        });

        // Send email if Resend is configured
        if (resendApiKey) {
          const scheduledDate = activity.scheduled_at 
            ? new Date(activity.scheduled_at).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Tidak dijadwalkan';

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Sales Order <noreply@zenmultimedia.co.id>',
              to: [userEmail],
              subject: `[Reminder] ${activity.subject}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1a5f7a;">🔔 Reminder Aktivitas</h2>
                  <p>Halo ${userName},</p>
                  <p>Ini adalah pengingat untuk aktivitas berikut:</p>
                  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1a5f7a;">${activity.subject}</h3>
                    <p><strong>Tipe:</strong> ${activity.activity_type}</p>
                    <p><strong>Terkait:</strong> ${relationName}</p>
                    <p><strong>Jadwal:</strong> ${scheduledDate}</p>
                    ${activity.description ? `<p><strong>Deskripsi:</strong> ${activity.description}</p>` : ''}
                  </div>
                  <p>Silakan cek aplikasi Sales Order untuk detail lebih lanjut.</p>
                  <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    Email ini dikirim secara otomatis. Jangan balas email ini.
                  </p>
                </div>
              `,
            }),
          });

          if (!emailResponse.ok) {
            console.error('Failed to send email:', await emailResponse.text());
          }
        }

        // Mark reminder as sent
        await supabase
          .from('activities')
          .update({ reminder_sent: true })
          .eq('id', activity.id);

        results.push({ id: activity.id, status: 'success' });
      } catch (err: any) {
        console.error(`Error processing activity ${activity.id}:`, err);
        results.push({ id: activity.id, status: 'error', error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} reminders`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
