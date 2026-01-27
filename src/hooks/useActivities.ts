import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ActivityType = 'meeting' | 'call' | 'email' | 'whatsapp' | 'note' | 'follow_up';

export interface Activity {
  id: string;
  activity_type: ActivityType;
  subject: string;
  description: string | null;
  lead_id: string | null;
  client_id: string | null;
  project_id: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  is_completed: boolean;
  reminder_at: string | null;
  reminder_sent: boolean;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  lead?: { name: string; company_name: string | null } | null;
  client?: { name: string } | null;
  project?: { project_name: string } | null;
}

export interface ActivityInput {
  activity_type: ActivityType;
  subject: string;
  description?: string;
  lead_id?: string;
  client_id?: string;
  project_id?: string;
  scheduled_at?: string;
  reminder_at?: string;
  assigned_to?: string;
}

export function useActivities(filters?: { 
  lead_id?: string; 
  client_id?: string; 
  project_id?: string;
  upcoming?: boolean;
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('activities')
        .select(`
          *,
          lead:leads(name, company_name),
          client:clients(name),
          project:projects(project_name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.lead_id) {
        query = query.eq('lead_id', filters.lead_id);
      }
      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id);
      }
      if (filters?.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters?.upcoming) {
        query = query
          .eq('is_completed', false)
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true });
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities((data || []) as Activity[]);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching activities:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters?.lead_id, filters?.client_id, filters?.project_id, filters?.upcoming]);

  const createActivity = useCallback(async (input: ActivityInput) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Ensure at least one relation exists
    if (!input.lead_id && !input.client_id && !input.project_id) {
      throw new Error('Activity must be linked to a lead, client, or project');
    }

    const { data, error } = await supabase
      .from('activities')
      .insert({
        ...input,
        created_by: user.id,
        assigned_to: input.assigned_to || user.id,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchActivities();
    return data as Activity;
  }, [fetchActivities]);

  const updateActivity = useCallback(async (id: string, input: Partial<ActivityInput> & { is_completed?: boolean }) => {
    const updateData: any = { ...input };
    
    if (input.is_completed) {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('activities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchActivities();
    return data as Activity;
  }, [fetchActivities]);

  const completeActivity = useCallback(async (id: string) => {
    return updateActivity(id, { is_completed: true });
  }, [updateActivity]);

  const deleteActivity = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('activities-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities' },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
    createActivity,
    updateActivity,
    completeActivity,
    deleteActivity,
  };
}
