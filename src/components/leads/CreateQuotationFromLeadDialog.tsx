import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/hooks/useLeads';
import { Loader2, FileText, Building2, User, DollarSign, ArrowRight } from 'lucide-react';

interface CreateQuotationFromLeadDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
};

export function CreateQuotationFromLeadDialog({
  lead,
  open,
  onOpenChange,
  onSuccess,
}: CreateQuotationFromLeadDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [autoConvert, setAutoConvert] = useState(true);
  
  // Form state - allow editing the negotiated price
  const [projectName, setProjectName] = useState('');
  const [dealValue, setDealValue] = useState(0);
  const [notes, setNotes] = useState('');

  // Reset form when lead changes
  useEffect(() => {
    if (lead && open) {
      setProjectName(lead.company_name || lead.name);
      setDealValue(lead.estimated_value || 0);
      setNotes('');
      setAutoConvert(true);
    }
  }, [lead, open]);

  const handleCreate = async () => {
    if (!lead) return;
    
    if (!projectName.trim()) {
      toast({
        title: 'Error',
        description: 'Nama proyek harus diisi',
        variant: 'destructive',
      });
      return;
    }

    if (dealValue <= 0) {
      toast({
        title: 'Error',
        description: 'Nilai deal harus lebih dari 0',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      let clientId = lead.converted_to_client_id;
      
      // Auto-convert lead to client if not yet converted and autoConvert is enabled
      if (!clientId && autoConvert) {
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
          if (clientError.code === '42501') {
            throw new Error('Anda tidak memiliki akses untuk membuat klien');
          }
          throw clientError;
        }

        clientId = client.id;

        // Update lead with conversion info
        await supabase
          .from('leads')
          .update({
            converted_to_client_id: clientId,
            converted_at: new Date().toISOString(),
          })
          .eq('id', lead.id);
      }

      // Generate quotation number
      let prefix = 'QUO-ZMI';
      try {
        const { data: settings } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'quotation_prefix')
          .maybeSingle();
        if (settings?.value) {
          prefix = typeof settings.value === 'string' ? settings.value : String(settings.value);
        }
      } catch (e) {
        console.warn('Could not fetch quotation prefix:', e);
      }
      
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const quotationNumber = `${randomPart}/${prefix}/${month}/${year}`;

      // Calculate valid until (30 days)
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      // Create quotation with simple line item
      const quotationData = {
        project_name: projectName,
        client_id: clientId,
        man_days: [
          {
            item: `Pengembangan ${projectName}`,
            quantity: 1,
            unit: 'Package',
            unitPrice: dealValue,
            total: dealValue,
          }
        ],
        hosting_cost: 0,
        maintenance_cost: 0,
        maintenance_period: 'Tahunan',
        total_development: dealValue,
        grand_total: dealValue,
        valid_until: validUntil.toISOString().split('T')[0],
        status: 'Draft',
      };

      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([quotationData])
        .select()
        .single();

      if (quotationError) throw quotationError;

      toast({
        title: 'Berhasil',
        description: `Quotation berhasil dibuat${autoConvert && !lead.converted_to_client_id ? ' dan Lead dikonversi ke Client' : ''}`,
      });

      onOpenChange(false);
      onSuccess?.();
      
      // Navigate to edit the quotation for more details
      navigate(`/quotation?edit=${quotation.id}`);
    } catch (error: any) {
      console.error('Error creating quotation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal membuat quotation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Buat Quotation dari Lead
          </DialogTitle>
          <DialogDescription>
            Buat quotation langsung dari lead yang sudah Hot. Masukkan harga deal hasil negosiasi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Lead Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Hot Lead</Badge>
              <Badge variant="outline">{lead.source || 'Unknown Source'}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{lead.name}</span>
            </div>
            {lead.company_name && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{lead.company_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>Estimasi: {formatCurrency(lead.estimated_value || 0)}</span>
            </div>
          </div>

          {/* Conversion indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="bg-red-50">Hot Lead</Badge>
            <ArrowRight className="h-4 w-4" />
            <Badge variant="outline" className="bg-amber-50">Client</Badge>
            <ArrowRight className="h-4 w-4" />
            <Badge variant="outline" className="bg-blue-50">Quotation</Badge>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Proyek *</Label>
              <Input
                placeholder="Nama proyek untuk quotation"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Nilai Deal (Harga Negosiasi) *</Label>
              <Input
                type="number"
                placeholder="0"
                value={dealValue || ''}
                onChange={(e) => setDealValue(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Masukkan harga final setelah negosiasi. Estimasi awal: {formatCurrency(lead.estimated_value || 0)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Catatan (opsional)</Label>
              <Textarea
                placeholder="Catatan tambahan untuk quotation..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Auto convert checkbox */}
            {!lead.converted_to_client_id && (
              <div className="flex items-center space-x-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Checkbox
                  id="autoConvert"
                  checked={autoConvert}
                  onCheckedChange={(checked) => setAutoConvert(checked === true)}
                />
                <label
                  htmlFor="autoConvert"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Otomatis konversi Lead ke Client
                </label>
              </div>
            )}

            {lead.converted_to_client_id && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    Sudah Client
                  </Badge>
                  Lead ini sudah dikonversi menjadi Client
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Buat Quotation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
