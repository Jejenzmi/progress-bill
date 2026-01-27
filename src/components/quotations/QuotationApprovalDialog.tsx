import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Clock, Send } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Quotation {
  id: string;
  project_name: string;
  grand_total: number | null;
  approval_status: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  client_name?: string;
}

interface QuotationApprovalDialogProps {
  quotation: Quotation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  mode: 'submit' | 'review';
}

export function QuotationApprovalDialog({
  quotation,
  open,
  onOpenChange,
  onSuccess,
  mode,
}: QuotationApprovalDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSubmitForApproval = async () => {
    if (!quotation || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quotations')
        .update({
          approval_status: 'pending',
          submitted_at: new Date().toISOString(),
          submitted_by: user.id,
        })
        .eq('id', quotation.id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Quotation telah disubmit untuk approval COO',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting quotation:', error);
      toast({
        title: 'Error',
        description: 'Gagal submit quotation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!quotation || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quotations')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          status: 'Sent', // Auto update status to Sent when approved
        })
        .eq('id', quotation.id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Quotation telah disetujui',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error approving quotation:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyetujui quotation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!quotation || !user) return;

    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Alasan penolakan wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quotations')
        .update({
          approval_status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejection_reason: rejectionReason,
        })
        .eq('id', quotation.id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Quotation telah ditolak',
      });

      onSuccess();
      onOpenChange(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      toast({
        title: 'Error',
        description: 'Gagal menolak quotation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!quotation) return null;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" /> Menunggu Approval</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> Disetujui</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" /> Ditolak</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'submit' ? 'Submit untuk Approval' : 'Review Quotation'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'submit'
              ? 'Kirim quotation ini untuk direview oleh COO'
              : 'Review dan berikan keputusan untuk quotation ini'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium">{quotation.project_name}</h4>
                <p className="text-sm text-muted-foreground">{quotation.client_name || 'Klien tidak diketahui'}</p>
              </div>
              {getStatusBadge(quotation.approval_status)}
            </div>
            <div className="text-lg font-bold text-primary">
              {formatCurrency(quotation.grand_total || 0)}
            </div>
            {quotation.submitted_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Disubmit: {format(new Date(quotation.submitted_at), 'dd MMM yyyy HH:mm', { locale: id })}
              </p>
            )}
          </div>

          {mode === 'review' && (
            <div className="space-y-3">
              <Label htmlFor="rejection-reason">Alasan Penolakan (jika ditolak)</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Masukkan alasan penolakan..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          )}

          {quotation.rejection_reason && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Alasan Penolakan:</p>
              <p className="text-sm text-red-700 dark:text-red-300">{quotation.rejection_reason}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          
          {mode === 'submit' && quotation.approval_status !== 'pending' && (
            <Button onClick={handleSubmitForApproval} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit untuk Approval
            </Button>
          )}

          {mode === 'review' && quotation.approval_status === 'pending' && (
            <>
              <Button variant="destructive" onClick={handleReject} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Tolak
              </Button>
              <Button onClick={handleApprove} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Setujui
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
