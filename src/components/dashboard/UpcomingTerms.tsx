import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Clock, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionableTerm {
  id: string;
  term_name: string;
  amount: number;
  project_name: string;
  client_name: string;
  has_evidence: boolean;
  has_invoice: boolean;
  invoice_status: string | null;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function UpcomingTerms() {
  const [terms, setTerms] = useState<ActionableTerm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActionableTerms();
  }, []);

  const fetchActionableTerms = async () => {
    try {
      const { data: termsData, error } = await supabase
        .from('payment_terms')
        .select(`
          id,
          term_name,
          amount,
          is_locked,
          project:projects!inner(
            project_name,
            client:clients!inner(name)
          )
        `)
        .eq('is_locked', false)
        .order('due_date', { ascending: true })
        .limit(10);

      if (error) throw error;

      // Check evidences and invoices for each term
      const actionableTerms: ActionableTerm[] = [];

      for (const term of termsData || []) {
        const { data: evidences } = await supabase
          .from('term_evidences')
          .select('id')
          .eq('term_id', term.id);

        const { data: invoice } = await supabase
          .from('invoices')
          .select('status')
          .eq('term_id', term.id)
          .maybeSingle();

        const hasEvidence = (evidences?.length || 0) > 0;
        const hasInvoice = !!invoice;

        // Only add if needs action (no evidence or sent but not paid)
        if (!hasEvidence || (invoice?.status === 'Sent')) {
          actionableTerms.push({
            id: term.id,
            term_name: term.term_name,
            amount: Number(term.amount),
            project_name: (term.project as any).project_name,
            client_name: (term.project as any).client.name,
            has_evidence: hasEvidence,
            has_invoice: hasInvoice,
            invoice_status: invoice?.status || null,
          });
        }
      }

      setTerms(actionableTerms.slice(0, 5));
    } catch (error) {
      console.error('Error fetching terms:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionType = (term: ActionableTerm) => {
    if (!term.has_evidence) {
      return { type: 'upload', label: 'Upload Dokumen', icon: AlertTriangle, style: 'text-warning' };
    }
    if (term.invoice_status === 'Sent') {
      return { type: 'followup', label: 'Follow-up Pembayaran', icon: Clock, style: 'text-info' };
    }
    return { type: 'done', label: 'Selesai', icon: CheckCircle, style: 'text-success' };
  };

  if (loading) {
    return (
      <div className="rounded-xl border bg-card shadow-card animate-fade-in">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-card animate-fade-in">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Perlu Tindakan</h3>
        </div>
        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-warning/10 text-warning text-sm font-semibold">
          {terms.length}
        </span>
      </div>

      <div className="divide-y">
        {terms.length === 0 ? (
          <div className="p-5 text-center text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
            <p>Semua termin sudah ditangani</p>
          </div>
        ) : (
          terms.map((term) => {
            const action = getActionType(term);
            const Icon = action.icon;
            return (
              <div key={term.id} className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors">
                <div className={cn('mt-0.5', action.style)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{term.term_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{term.project_name}</p>
                  <p className="text-xs text-muted-foreground">{term.client_name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={cn('text-xs font-medium', action.style)}>{action.label}</span>
                    <span className="text-sm font-semibold">{formatCurrency(term.amount)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
