import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { History, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface Revision {
  id: string;
  quotation_id: string;
  revision_number: number;
  quotation_number: string | null;
  project_name: string;
  grand_total: number | null;
  approval_status: string | null;
  revised_by: string | null;
  revision_reason: string | null;
  created_at: string;
  revised_by_name?: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function QuotationRevisionHistory({ clientId }: { clientId: string }) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevisions();
  }, [clientId]);

  const fetchRevisions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quotation_revisions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch user names for revised_by
        const userIds = [...new Set(data.filter(r => r.revised_by).map(r => r.revised_by!))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

        setRevisions(data.map(r => ({
          ...r,
          revised_by_name: r.revised_by ? profileMap.get(r.revised_by) || 'Unknown' : undefined,
        })));
      } else {
        setRevisions([]);
      }
    } catch (error) {
      console.error('Error fetching revisions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Memuat riwayat revisi...</span>
      </div>
    );
  }

  if (revisions.length === 0) return null;

  return (
    <div>
      <Separator className="my-2" />
      <div className="flex items-center gap-2 mb-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">Riwayat Revisi Quotation</h4>
        <Badge variant="secondary" className="text-xs">{revisions.length}</Badge>
      </div>
      <ScrollArea className="max-h-48">
        <div className="space-y-3">
          {revisions.map((rev) => (
            <div key={rev.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{rev.project_name}</span>
                  <Badge variant="outline" className="text-xs">
                    {rev.revision_number === 0 ? 'Original' : `R${rev.revision_number}`}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  {rev.quotation_number && (
                    <p className="font-mono">{rev.quotation_number}</p>
                  )}
                  <p>Total: {rev.grand_total ? formatCurrency(rev.grand_total) : '-'}</p>
                  {rev.revised_by_name && (
                    <p>Direvisi oleh: {rev.revised_by_name}</p>
                  )}
                  {rev.revision_reason && (
                    <p className="text-foreground/70 italic">Alasan: {rev.revision_reason}</p>
                  )}
                  <p>{format(new Date(rev.created_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
