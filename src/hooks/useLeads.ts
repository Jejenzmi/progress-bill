import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type LeadStatus = 'cold' | 'warm' | 'hot';

export interface Lead {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  source: string | null;
  status: LeadStatus;
  score: number;
  estimated_value: number;
  notes: string | null;
  assigned_to: string | null;
  converted_to_client_id: string | null;
  converted_at: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Segmentation fields
  industry: string | null;
  company_size: string | null;
  tags: string[];
}

export interface LeadInput {
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  source?: string;
  status?: LeadStatus;
  estimated_value?: number;
  notes?: string;
  assigned_to?: string;
  next_follow_up_at?: string;
  // Segmentation fields
  industry?: string;
  company_size?: string;
  tags?: string[];
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads((data || []) as Lead[]);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createLead = useCallback(async (input: LeadInput) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Anda harus login terlebih dahulu');

    console.log('Creating lead with input:', input);
    console.log('Current user:', user.id);

    const { data, error } = await supabase
      .from('leads')
      .insert({
        ...input,
        created_by: user.id,
        assigned_to: input.assigned_to || user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      if (error.code === '42501') {
        throw new Error('Anda tidak memiliki akses untuk menambah lead. Hubungi admin untuk mendapatkan role Marketing atau BDO.');
      }
      throw error;
    }
    
    console.log('Lead created successfully:', data);
    await fetchLeads();
    return data as Lead;
  }, [fetchLeads]);

  const updateLead = useCallback(async (id: string, input: Partial<LeadInput>) => {
    const { data, error } = await supabase
      .from('leads')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchLeads();
    return data as Lead;
  }, [fetchLeads]);

  const deleteLead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchLeads();
  }, [fetchLeads]);

  const updateLeadStatus = useCallback(async (id: string, status: LeadStatus) => {
    // Calculate new score based on status
    const scoreMap: Record<LeadStatus, number> = {
      cold: 20,
      warm: 50,
      hot: 80,
    };

    const { error } = await supabase
      .from('leads')
      .update({ status, score: scoreMap[status] })
      .eq('id', id);

    if (error) throw error;
    await fetchLeads();
  }, [fetchLeads]);

  const convertToClient = useCallback(async (leadId: string) => {
    // Get lead data
    const lead = leads.find(l => l.id === leadId);
    if (!lead) throw new Error('Lead tidak ditemukan');

    if (lead.converted_to_client_id) {
      throw new Error('Lead ini sudah dikonversi menjadi klien');
    }

    console.log('Converting lead to client:', lead);

    // Create client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: lead.company_name || lead.name,
        pic_name: lead.name,
        pic_email: lead.email,
        pic_phone: lead.phone,
        address: lead.address,
      })
      .select()
      .single();

    if (clientError) {
      console.error('Error creating client:', clientError);
      if (clientError.code === '42501') {
        throw new Error('Anda tidak memiliki akses untuk membuat klien. Hubungi admin.');
      }
      throw clientError;
    }

    console.log('Client created:', client);

    // Update lead with conversion info
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        converted_to_client_id: client.id,
        converted_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead conversion status:', updateError);
      throw updateError;
    }
    
    console.log('Lead successfully converted to client');
    await fetchLeads();
    return client;
  }, [leads, fetchLeads]);

  const importLeadsFromCSV = useCallback(async (csvData: LeadInput[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const leadsToInsert = csvData.map(lead => ({
      ...lead,
      created_by: user.id,
      assigned_to: user.id,
      status: lead.status || 'cold',
      score: lead.status === 'hot' ? 80 : lead.status === 'warm' ? 50 : 20,
    }));

    const { data, error } = await supabase
      .from('leads')
      .insert(leadsToInsert)
      .select();

    if (error) throw error;
    await fetchLeads();
    return data as Lead[];
  }, [fetchLeads]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeads]);

  return {
    leads,
    loading,
    error,
    refetch: fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    updateLeadStatus,
    convertToClient,
    importLeadsFromCSV,
  };
}
