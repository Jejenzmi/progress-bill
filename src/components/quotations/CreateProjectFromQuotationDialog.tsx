import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Loader2, FolderPlus, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/data/mockData';
import { Database } from '@/integrations/supabase/types';

type PipelineStage = Database['public']['Enums']['pipeline_stage'];

interface QuotationData {
  id: string;
  project_name: string;
  client_id: string | null;
  client_name?: string | null;
  grand_total: number | null;
}

interface CreateProjectFromQuotationDialogProps {
  quotation: QuotationData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const PIPELINE_STAGE_OPTIONS: { value: PipelineStage; label: string }[] = [
  { value: 'Meeting', label: 'Meeting' },
  { value: 'Proposal', label: 'Proposal' },
  { value: 'Negosiasi', label: 'Negosiasi' },
  { value: 'Closing', label: 'Closing' },
];

export function CreateProjectFromQuotationDialog({
  quotation,
  open,
  onOpenChange,
  onSuccess,
}: CreateProjectFromQuotationDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('Proposal');

  // Reset form when quotation changes
  useState(() => {
    if (quotation) {
      setProjectName(quotation.project_name);
      setTotalValue(String(quotation.grand_total || 0));
    }
  });

  const handleCreate = async () => {
    if (!quotation || !quotation.client_id) {
      toast({
        title: 'Error',
        description: 'Quotation harus memiliki klien yang terhubung',
        variant: 'destructive',
      });
      return;
    }

    if (!projectName.trim()) {
      toast({
        title: 'Error',
        description: 'Nama proyek harus diisi',
        variant: 'destructive',
      });
      return;
    }

    const projectValue = parseFloat(totalValue) || 0;
    if (projectValue <= 0) {
      toast({
        title: 'Error',
        description: 'Nilai proyek harus lebih dari 0',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Get default probability based on pipeline stage
      const probability = pipelineStage === 'Meeting' ? 10 
        : pipelineStage === 'Proposal' ? 30 
        : pipelineStage === 'Negosiasi' ? 60 
        : 90;

      const { data, error } = await supabase
        .from('projects')
        .insert({
          project_name: projectName.trim(),
          client_id: quotation.client_id,
          quotation_id: quotation.id,
          description: description.trim() || null,
          total_value: projectValue,
          start_date: startDate,
          status: 'Pipeline',
          pipeline_stage: pipelineStage,
          probability,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: `Proyek "${projectName}" berhasil dibuat dari quotation`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal membuat proyek',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset form when dialog opens with new quotation
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && quotation) {
      setProjectName(quotation.project_name);
      setTotalValue(String(quotation.grand_total || 0));
      setDescription('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setPipelineStage('Proposal');
    }
    onOpenChange(newOpen);
  };

  if (!quotation) return null;

  const hasClient = !!quotation.client_id;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Buat Proyek dari Quotation
          </DialogTitle>
          <DialogDescription>
            Buat proyek baru di pipeline berdasarkan quotation yang sudah disetujui
          </DialogDescription>
        </DialogHeader>

        {!hasClient ? (
          <div className="flex flex-col items-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-warning mb-3" />
            <p className="font-medium">Quotation Tidak Memiliki Klien</p>
            <p className="text-sm text-muted-foreground mt-1">
              Quotation harus memiliki klien yang terhubung sebelum dapat dibuat menjadi proyek
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div>
              <Label>Quotation</Label>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-2 mt-1">
                {quotation.project_name} - {quotation.client_name || 'No Client'}
              </p>
            </div>

            <div>
              <Label htmlFor="projectName">Nama Proyek *</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Nama proyek"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="totalValue">Nilai Proyek *</Label>
                <Input
                  id="totalValue"
                  type="number"
                  value={totalValue}
                  onChange={(e) => setTotalValue(e.target.value)}
                />
                {parseFloat(totalValue) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(parseFloat(totalValue))}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="startDate">Tanggal Mulai</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pipelineStage">Pipeline Stage</Label>
              <Select value={pipelineStage} onValueChange={(v) => setPipelineStage(v as PipelineStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsi proyek (opsional)"
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleCreate} disabled={loading || !hasClient}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Buat Proyek
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
