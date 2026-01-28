import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Zap, CheckCircle2 } from 'lucide-react';

interface ReadyTerm {
  id: string;
  term_name: string;
  amount: number;
  percentage: number;
  project_id: string;
  project_name: string;
  client_name: string;
  evidences_count: number;
}

interface ReadyTermsWidgetProps {
  onInvoiceCreated?: () => void;
}

export function ReadyTermsWidget({ onInvoiceCreated }: ReadyTermsWidgetProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [readyTerms, setReadyTerms] = useState<ReadyTerm[]>([]);
  const [creatingInvoice, setCreatingInvoice] = useState<string | null>(null);

  useEffect(() => {
    fetchReadyTerms();
  }, []);

  const fetchReadyTerms = async () => {
    try {
      setLoading(true);

      // Fetch payment terms that are ready for invoicing
      // Criteria: project status = Won, has evidences, not locked, no invoice yet
      const { data: termsData, error: termsError } = await supabase
        .from('payment_terms')
        .select(`
          id,
          term_name,
          amount,
          percentage,
          project_id,
          is_locked,
          project:projects!inner(
            id,
            project_name,
            status,
            client:clients(name)
          )
        `)
        .eq('is_locked', false);

      if (termsError) throw termsError;

      // Filter for Won projects
      const wonTerms = (termsData || []).filter(
        (t: any) => t.project?.status === 'Won'
      );

      // Get existing invoices to exclude terms that already have invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('term_id');

      if (invoicesError) throw invoicesError;

      const invoicedTermIds = new Set((invoicesData || []).map((i) => i.term_id));

      // Get evidence counts for each term
      const { data: evidencesData, error: evidencesError } = await supabase
        .from('term_evidences')
        .select('term_id');

      if (evidencesError) throw evidencesError;

      // Count evidences per term
      const evidenceCounts: Record<string, number> = {};
      (evidencesData || []).forEach((e) => {
        evidenceCounts[e.term_id] = (evidenceCounts[e.term_id] || 0) + 1;
      });

      // Filter terms that have evidences and no invoice
      const ready = wonTerms
        .filter((t: any) => !invoicedTermIds.has(t.id) && (evidenceCounts[t.id] || 0) > 0)
        .map((t: any) => ({
          id: t.id,
          term_name: t.term_name,
          amount: Number(t.amount),
          percentage: Number(t.percentage),
          project_id: t.project.id,
          project_name: t.project.project_name,
          client_name: t.project.client?.name || 'Unknown',
          evidences_count: evidenceCounts[t.id] || 0,
        }));

      setReadyTerms(ready);
    } catch (error) {
      console.error('Error fetching ready terms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (term: ReadyTerm) => {
    setCreatingInvoice(term.id);
    try {
      // Get invoice settings for prefix
      const { data: settingsData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'invoice_settings')
        .maybeSingle();

      const invoiceSettings = settingsData?.value as Record<string, unknown> | null;
      const prefix = (invoiceSettings?.prefix as string) || 'INV/ZEN';
      const defaultTopDays = (invoiceSettings?.default_top_days as number) || 14;

      // Generate invoice number
      const now = new Date();
      const month = now.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase();
      const year = now.getFullYear();

      // Get next sequence number
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true });

      const sequence = (count || 0) + 1;
      const invoiceNumber = `${sequence.toString().padStart(3, '0')}/${prefix}/${month}/${year}`;

      // Calculate due date
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + defaultTopDays);

      // Insert invoice
      const { error } = await supabase.from('invoices').insert({
        invoice_number: invoiceNumber,
        term_id: term.id,
        project_id: term.project_id,
        amount: term.amount,
        invoice_date: now.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'Draft',
      });

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: `Invoice ${invoiceNumber} berhasil dibuat`,
      });

      // Refresh data
      fetchReadyTerms();
      onInvoiceCreated?.();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal membuat invoice',
        variant: 'destructive',
      });
    } finally {
      setCreatingInvoice(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Termin Siap Invoice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Termin Siap Invoice
        </CardTitle>
        <CardDescription>
          {readyTerms.length} termin siap dibuatkan invoice
        </CardDescription>
      </CardHeader>
      <CardContent>
        {readyTerms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
            <p>Semua termin sudah dibuatkan invoice</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {readyTerms.map((term) => (
              <div
                key={term.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{term.term_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {term.project_name} • {term.client_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {term.percentage}%
                    </Badge>
                    <Badge variant="outline" className="text-xs text-success border-success">
                      {term.evidences_count} dokumen
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <p className="font-semibold text-sm">{formatCurrency(term.amount)}</p>
                  <Button
                    size="sm"
                    onClick={() => handleCreateInvoice(term)}
                    disabled={creatingInvoice === term.id}
                  >
                    {creatingInvoice === term.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <FileText className="h-3 w-3 mr-1" />
                        Buat Invoice
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
