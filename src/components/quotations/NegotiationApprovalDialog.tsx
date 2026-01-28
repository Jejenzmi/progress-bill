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
import { Loader2, CheckCircle, XCircle, TrendingDown, Percent } from 'lucide-react';
import { createNotification, notifyRoleUsers } from '@/lib/notificationHelper';

interface NegotiationApprovalDialogProps {
  quotation: {
    id: string;
    project_name: string;
    grand_total: number | null;
    negotiated_price: number | null;
    negotiation_notes: string | null;
    margin_percentage: number | null;
    client_name?: string;
    submitted_by?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function NegotiationApprovalDialog({
  quotation,
  open,
  onOpenChange,
  onSuccess,
}: NegotiationApprovalDialogProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    if (!quotation || !user) return;

    setLoading(true);
    setAction('approve');
    try {
      const { error } = await supabase
        .from('quotations')
        .update({
          negotiation_status: 'approved',
          negotiation_approved_at: new Date().toISOString(),
          negotiation_approved_by: user.id,
        })
        .eq('id', quotation.id);

      if (error) throw error;

      // Notify Marketing that negotiation was approved
      await notifyRoleUsers('marketing',
        'Harga Negosiasi Disetujui',
        `Harga negosiasi untuk quotation "${quotation.project_name}" telah DISETUJUI oleh ${profile?.full_name || 'Management'}`,
        {
          type: 'success',
          link: '/quotations',
          relatedId: quotation.id,
          relatedType: 'quotation',
        }
      );

      // Also notify Finance
      await notifyRoleUsers('finance',
        'Harga Negosiasi Final',
        `Quotation "${quotation.project_name}" sudah memiliki harga deal final: ${formatCurrency(quotation.negotiated_price || 0)}`,
        {
          type: 'success',
          link: '/quotations',
          relatedId: quotation.id,
          relatedType: 'quotation',
        }
      );

      toast({
        title: 'Berhasil',
        description: 'Harga negosiasi telah disetujui',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error approving negotiation:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyetujui harga negosiasi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleReject = async () => {
    if (!quotation || !user) return;

    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Alasan penolakan harus diisi',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setAction('reject');
    try {
      const { error } = await supabase
        .from('quotations')
        .update({
          negotiation_status: 'rejected',
          negotiation_approved_at: new Date().toISOString(),
          negotiation_approved_by: user.id,
          negotiation_rejection_reason: rejectionReason.trim(),
        })
        .eq('id', quotation.id);

      if (error) throw error;

      // Notify Marketing that negotiation was rejected
      await notifyRoleUsers('marketing',
        'Harga Negosiasi Ditolak',
        `Harga negosiasi untuk quotation "${quotation.project_name}" DITOLAK. Alasan: ${rejectionReason}`,
        {
          type: 'error',
          link: '/quotations',
          relatedId: quotation.id,
          relatedType: 'quotation',
        }
      );

      toast({
        title: 'Berhasil',
        description: 'Harga negosiasi telah ditolak',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error rejecting negotiation:', error);
      toast({
        title: 'Error',
        description: 'Gagal menolak harga negosiasi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  if (!quotation) return null;

  const originalPrice = quotation.grand_total || 0;
  const negotiatedValue = quotation.negotiated_price || 0;
  const discount = originalPrice > 0 && negotiatedValue > 0
    ? ((originalPrice - negotiatedValue) / originalPrice * 100)
    : 0;
  const discountAmount = originalPrice - negotiatedValue;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Review Harga Negosiasi
          </DialogTitle>
          <DialogDescription>
            Setujui atau tolak harga negosiasi yang diajukan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quotation Info */}
          <div className="p-4 rounded-lg bg-muted">
            <h4 className="font-medium mb-1">{quotation.project_name}</h4>
            <p className="text-sm text-muted-foreground mb-3">
              {quotation.client_name || 'Klien tidak diketahui'}
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Harga Quotation:</span>
                <span className="font-medium">{formatCurrency(originalPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Harga Negosiasi:</span>
                <span className="font-semibold text-primary">{formatCurrency(negotiatedValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Selisih:</span>
                <span className="text-destructive">
                  -{formatCurrency(discountAmount)} ({discount.toFixed(1)}%)
                </span>
              </div>
              {quotation.margin_percentage && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Margin Awal:</span>
                  <Badge variant="outline" className="gap-1">
                    <Percent className="h-3 w-3" />
                    {quotation.margin_percentage}%
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Negotiation Notes */}
          {quotation.negotiation_notes && (
            <div className="p-3 rounded-lg border">
              <Label className="text-sm text-muted-foreground">Catatan dari Marketing:</Label>
              <p className="text-sm mt-1">{quotation.negotiation_notes}</p>
            </div>
          )}

          {/* Rejection Reason */}
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Alasan Penolakan (jika ditolak)</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Masukkan alasan jika ingin menolak..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={loading}
          >
            {loading && action === 'reject' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Tolak
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading}
          >
            {loading && action === 'approve' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Setujui
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
