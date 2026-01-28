import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, TrendingDown, Percent } from 'lucide-react';
import { notifyRoleUsers } from '@/lib/notificationHelper';

interface NegotiatedPriceDialogProps {
  quotation: {
    id: string;
    project_name: string;
    grand_total: number | null;
    negotiated_price: number | null;
    negotiation_notes: string | null;
    margin_percentage: number | null;
    client_name?: string;
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

export function NegotiatedPriceDialog({
  quotation,
  open,
  onOpenChange,
  onSuccess,
}: NegotiatedPriceDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [negotiatedPrice, setNegotiatedPrice] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Reset form when quotation changes
  useEffect(() => {
    if (quotation && open) {
      setNegotiatedPrice(quotation.negotiated_price?.toString() || '');
      setNotes(quotation.negotiation_notes || '');
    }
  }, [quotation, open]);

  const handleSave = async () => {
    if (!quotation || !user) return;

    const priceValue = parseFloat(negotiatedPrice.replace(/[^0-9.-]/g, ''));
    
    if (isNaN(priceValue) || priceValue <= 0) {
      toast({
        title: 'Error',
        description: 'Masukkan harga negosiasi yang valid',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quotations')
        .update({
          negotiated_price: priceValue,
          negotiated_at: new Date().toISOString(),
          negotiated_by: user.id,
          negotiation_notes: notes.trim() || null,
          negotiation_status: 'pending', // Set to pending for BDO/COO approval
        })
        .eq('id', quotation.id);

      if (error) throw error;

      // Notify BDO/COO users for approval
      await notifyRoleUsers('bdo', 
        'Harga Negosiasi Perlu Approval',
        `Quotation "${quotation.project_name}" memiliki harga negosiasi baru: ${formatCurrency(priceValue)}. Mohon review dan approve.`,
        {
          type: 'warning',
          link: '/quotations',
          relatedId: quotation.id,
          relatedType: 'quotation',
        }
      );
      
      await notifyRoleUsers('coo', 
        'Harga Negosiasi Perlu Approval',
        `Quotation "${quotation.project_name}" memiliki harga negosiasi baru: ${formatCurrency(priceValue)}. Mohon review dan approve.`,
        {
          type: 'warning',
          link: '/quotations',
          relatedId: quotation.id,
          relatedType: 'quotation',
        }
      );

      toast({
        title: 'Berhasil',
        description: 'Harga negosiasi berhasil disubmit untuk approval BDO/COO',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving negotiated price:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan harga negosiasi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!quotation) return null;

  const originalPrice = quotation.grand_total || 0;
  const negotiatedValue = parseFloat(negotiatedPrice.replace(/[^0-9.-]/g, '')) || 0;
  const discount = originalPrice > 0 && negotiatedValue > 0 
    ? ((originalPrice - negotiatedValue) / originalPrice * 100).toFixed(1)
    : '0';
  const discountAmount = originalPrice - negotiatedValue;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Input Harga Negosiasi
          </DialogTitle>
          <DialogDescription>
            Catat hasil negosiasi harga dengan klien
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quotation Info */}
          <div className="p-4 rounded-lg bg-muted">
            <h4 className="font-medium mb-1">{quotation.project_name}</h4>
            <p className="text-sm text-muted-foreground mb-2">
              {quotation.client_name || 'Klien tidak diketahui'}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Harga Quotation:</span>
              <span className="font-semibold">{formatCurrency(originalPrice)}</span>
            </div>
            {quotation.margin_percentage && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-muted-foreground">Margin Digunakan:</span>
                <Badge variant="outline" className="gap-1">
                  <Percent className="h-3 w-3" />
                  {quotation.margin_percentage}%
                </Badge>
              </div>
            )}
          </div>

          {/* Negotiated Price Input */}
          <div className="space-y-2">
            <Label htmlFor="negotiated-price">Harga Hasil Negosiasi (Deal)</Label>
            <Input
              id="negotiated-price"
              type="text"
              placeholder="Masukkan harga deal..."
              value={negotiatedPrice}
              onChange={(e) => {
                // Allow only numbers and format
                const value = e.target.value.replace(/[^0-9]/g, '');
                setNegotiatedPrice(value);
              }}
              className="text-lg font-semibold"
            />
            {negotiatedValue > 0 && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(negotiatedValue)}
              </p>
            )}
          </div>

          {/* Discount Summary */}
          {negotiatedValue > 0 && originalPrice > 0 && (
            <div className="p-3 rounded-lg border bg-background">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Selisih/Diskon:</span>
                <span className={discountAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                  {discountAmount > 0 ? '-' : '+'}{formatCurrency(Math.abs(discountAmount))}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Persentase:</span>
                <Badge variant={parseFloat(discount) > 0 ? 'destructive' : 'default'}>
                  {parseFloat(discount) > 0 ? '-' : '+'}{Math.abs(parseFloat(discount))}%
                </Badge>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="negotiation-notes">Catatan Negosiasi (Opsional)</Label>
            <Textarea
              id="negotiation-notes"
              placeholder="Contoh: Klien minta diskon 10% karena repeat order..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
