import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];
type PaymentTerm = Database['public']['Tables']['payment_terms']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];
type TermEvidence = Database['public']['Tables']['term_evidences']['Row'];
type Quotation = Database['public']['Tables']['quotations']['Row'];

export interface ProjectWithDetails extends Project {
  client: Client | null;
  quotation: Quotation | null;
  payment_terms: (PaymentTerm & { invoice: Invoice | null; evidences: TermEvidence[] })[];
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch projects with client and quotation info
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          client:clients(*),
          quotation:quotations(*)
        `)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch payment terms
      const { data: termsData, error: termsError } = await supabase
        .from('payment_terms')
        .select('*')
        .order('term_order');

      if (termsError) throw termsError;

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*');

      if (invoicesError) throw invoicesError;

      // Fetch term evidences
      const { data: evidencesData, error: evidencesError } = await supabase
        .from('term_evidences')
        .select('*')
        .order('created_at', { ascending: false });

      if (evidencesError) throw evidencesError;

      // Combine data
      const projectsWithDetails: ProjectWithDetails[] = (projectsData || []).map((project) => {
        const projectTerms = (termsData || [])
          .filter((term) => term.project_id === project.id)
          .map((term) => ({
            ...term,
            invoice: (invoicesData || []).find((inv) => inv.term_id === term.id) || null,
            evidences: (evidencesData || []).filter((ev) => ev.term_id === term.id),
          }));

        return {
          ...project,
          client: project.client,
          quotation: project.quotation,
          payment_terms: projectTerms,
        };
      });

      setProjects(projectsWithDetails);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, refetch: fetchProjects };
}
