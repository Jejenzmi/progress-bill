import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/data/mockData';

interface Quotation {
  id: string;
  project_name: string;
  grand_total: number;
  approval_status: string;
  approved_at: string | null;
  client_id: string | null;
  client?: { name: string } | null;
}

interface LinkQuotationDialogProps {
  projectId: string;
  projectName: string;
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LinkQuotationDialog({
  projectId,
  projectName,
  clientId,
  open,
  onOpenChange,
  onSuccess,
}: LinkQuotationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (open) {
      fetchApprovedQuotations();
    }
  }, [open, clientId]);

  const fetchApprovedQuotations = async () => {
    setFetching(true);
    try {
      // Fetch approved quotations that are not yet linked to any project
      const { data: linkedQuotationIds } = await supabase
        .from('projects')
        .select('quotation_id')
        .not('quotation_id', 'is', null);

      const linkedIds = (linkedQuotationIds || [])
        .map((p) => p.quotation_id)
        .filter(Boolean) as string[];

      let query = supabase
        .from('quotations')
        .select('*, client:clients(name)')
        .eq('approval_status', 'approved')
        .order('approved_at', { ascending: false });

      // Filter out already linked quotations
      if (linkedIds.length > 0) {
        query = query.not('id', 'in', `(${linkedIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error fetching quotations:', error);
    } finally {
      setFetching(false);
    }
  };

  // Separate quotations by client match
  const clientQuotations = quotations.filter((q) => q.client_id === clientId);
  const otherQuotations = quotations.filter((q) => q.client_id !== clientId);

  const selectedQuotation = quotations.find((q) => q.id === selectedQuotationId);

  const handleLink = async () => {
    if (!selectedQuotationId) {
      toast({
        title: 'Error',
        description: 'Pilih quotation terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ quotation_id: selectedQuotationId })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Quotation berhasil dihubungkan ke proyek',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Hubungkan Quotation
          </DialogTitle>
          <DialogDescription>
            Pilih quotation yang sudah disetujui untuk dihubungkan ke proyek "{projectName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {fetching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : quotations.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Tidak ada quotation yang tersedia untuk dihubungkan
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Pastikan quotation sudah disetujui dan belum terhubung ke proyek lain
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Pilih Quotation</label>
                <Select value={selectedQuotationId} onValueChange={setSelectedQuotationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih quotation..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientQuotations.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Quotation Klien Sama
                        </div>
                        {clientQuotations.map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-3 w-3 text-success" />
                              <span>{q.project_name}</span>
                              <span className="text-muted-foreground">
                                - {formatCurrency(q.grand_total || 0)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {otherQuotations.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Quotation Lainnya
                        </div>
                        {otherQuotations.map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            <div className="flex items-center gap-2">
                              <span>{q.project_name}</span>
                              <span className="text-muted-foreground">
                                ({q.client?.name || 'No Client'})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedQuotation && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedQuotation.project_name}
                    </span>
                    <Badge variant="default" className="bg-success">
                      Approved
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Klien:</span>{' '}
                      {selectedQuotation.client?.name || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nilai:</span>{' '}
                      {formatCurrency(selectedQuotation.grand_total || 0)}
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Disetujui:</span>{' '}
                      {selectedQuotation.approved_at
                        ? new Date(selectedQuotation.approved_at).toLocaleDateString('id-ID')
                        : '-'}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={handleLink}
            disabled={loading || !selectedQuotationId || quotations.length === 0}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Hubungkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
