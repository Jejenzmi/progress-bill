import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Contract = Database['public']['Tables']['contracts']['Row'];

export interface ContractWithDetails extends Contract {
  client: {
    id: string;
    name: string;
    address: string | null;
    pic_name: string | null;
    pic_email: string | null;
    pic_phone: string | null;
    npwp_badan: string | null;
    client_type: string;
  } | null;
  quotation: {
    id: string;
    project_name: string;
    grand_total: number | null;
  } | null;
  project: {
    id: string;
    project_name: string;
    status: string;
  } | null;
}

export function useContracts() {
  const [contracts, setContracts] = useState<ContractWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          client:clients(id, name, address, pic_name, pic_email, pic_phone, npwp_badan, client_type),
          quotation:quotations(id, project_name, grand_total),
          project:projects(id, project_name, status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setContracts(data as ContractWithDetails[] || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching contracts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  return { contracts, loading, error, refetch: fetchContracts };
}

export async function generateContractNumber(): Promise<string> {
  const now = new Date();
  const month = now.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase();
  const romanMonth = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][now.getMonth()];
  const year = now.getFullYear();

  // Get count of contracts this year
  const startOfYear = new Date(year, 0, 1).toISOString();
  const { count } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfYear);

  const sequence = (count || 0) + 1;
  return `${sequence.toString().padStart(3, '0')}/ZMI-PKS/${romanMonth}/${year}`;
}
