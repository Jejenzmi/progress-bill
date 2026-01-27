import { useState, useEffect } from 'react';
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
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/data/mockData';
import { Database } from '@/integrations/supabase/types';

type TermTrigger = Database['public']['Enums']['term_trigger'];

interface PaymentTermInput {
  id: string;
  term_name: string;
  percentage: number;
  trigger_condition: TermTrigger;
  trigger_description: string;
}

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TRIGGER_OPTIONS: { value: TermTrigger; label: string }[] = [
  { value: 'SPK_SIGNED', label: 'SPK Ditandatangani' },
  { value: 'PROGRESS_REPORT', label: 'Laporan Progress' },
  { value: 'BAST', label: 'BAST' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'CUSTOM', label: 'Custom' },
];

export function CreateProjectDialog({ open, onOpenChange, onSuccess }: CreateProjectDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  // Project form state
  const [projectName, setProjectName] = useState('');
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Payment terms
  const [terms, setTerms] = useState<PaymentTermInput[]>([
    {
      id: crypto.randomUUID(),
      term_name: 'Termin 1 (DP)',
      percentage: 30,
      trigger_condition: 'SPK_SIGNED',
      trigger_description: 'Setelah SPK ditandatangani',
    },
  ]);

  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name').order('name');
    if (data) setClients(data);
  };

  const totalPercentage = terms.reduce((sum, t) => sum + (t.percentage || 0), 0);
  const projectValueNum = parseFloat(totalValue) || 0;

  const addTerm = () => {
    const termNumber = terms.length + 1;
    setTerms([
      ...terms,
      {
        id: crypto.randomUUID(),
        term_name: `Termin ${termNumber}`,
        percentage: 0,
        trigger_condition: 'PROGRESS_REPORT',
        trigger_description: '',
      },
    ]);
  };

  const removeTerm = (id: string) => {
    if (terms.length > 1) {
      setTerms(terms.filter((t) => t.id !== id));
    }
  };

  const updateTerm = (id: string, field: keyof PaymentTermInput, value: any) => {
    setTerms(terms.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const resetForm = () => {
    setProjectName('');
    setClientId('');
    setDescription('');
    setTotalValue('');
    setStartDate('');
    setEndDate('');
    setTerms([
      {
        id: crypto.randomUUID(),
        term_name: 'Termin 1 (DP)',
        percentage: 30,
        trigger_condition: 'SPK_SIGNED',
        trigger_description: 'Setelah SPK ditandatangani',
      },
    ]);
  };

  const handleSubmit = async () => {
    // Validation
    if (!projectName.trim()) {
      toast({ title: 'Error', description: 'Nama proyek harus diisi', variant: 'destructive' });
      return;
    }
    if (!clientId) {
      toast({ title: 'Error', description: 'Pilih klien terlebih dahulu', variant: 'destructive' });
      return;
    }
    if (!totalValue || projectValueNum <= 0) {
      toast({ title: 'Error', description: 'Nilai proyek harus diisi', variant: 'destructive' });
      return;
    }
    if (!startDate) {
      toast({ title: 'Error', description: 'Tanggal mulai harus diisi', variant: 'destructive' });
      return;
    }
    if (totalPercentage !== 100) {
      toast({
        title: 'Error',
        description: `Total persentase termin harus 100% (saat ini ${totalPercentage}%)`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Insert project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          project_name: projectName.trim(),
          client_id: clientId,
          description: description.trim() || null,
          total_value: projectValueNum,
          start_date: startDate,
          end_date: endDate || null,
          status: 'Pipeline',
          pipeline_stage: 'Meeting',
          created_by: user?.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Insert payment terms
      const termsToInsert = terms.map((term, index) => ({
        project_id: project.id,
        term_name: term.term_name,
        percentage: term.percentage,
        amount: (projectValueNum * term.percentage) / 100,
        trigger_condition: term.trigger_condition,
        trigger_description: term.trigger_description || null,
        term_order: index + 1,
        is_locked: index === 0 ? false : true, // First term unlocked (for SPK)
      }));

      const { error: termsError } = await supabase.from('payment_terms').insert(termsToInsert);

      if (termsError) throw termsError;

      toast({
        title: 'Berhasil',
        description: `Proyek "${projectName}" berhasil dibuat dengan ${terms.length} termin`,
      });

      resetForm();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Proyek Baru</DialogTitle>
          <DialogDescription>
            Isi detail proyek dan setup termin pembayaran
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Info Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Informasi Proyek
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="projectName">Nama Proyek *</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Contoh: Dashboard Eksekutif Pemkab"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="client">Klien *</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih klien" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="totalValue">Nilai Proyek *</Label>
                <Input
                  id="totalValue"
                  type="number"
                  value={totalValue}
                  onChange={(e) => setTotalValue(e.target.value)}
                  placeholder="0"
                />
                {projectValueNum > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(projectValueNum)}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="startDate">Tanggal Mulai *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Tanggal Selesai</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat proyek..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Payment Terms Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Termin Pembayaran
              </h3>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium ${
                    totalPercentage === 100
                      ? 'text-green-600'
                      : totalPercentage > 100
                      ? 'text-red-600'
                      : 'text-amber-600'
                  }`}
                >
                  Total: {totalPercentage}%
                </span>
                <Button type="button" variant="outline" size="sm" onClick={addTerm}>
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {terms.map((term, index) => (
                <div
                  key={term.id}
                  className="grid grid-cols-12 gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="col-span-12 sm:col-span-3">
                    <Label className="text-xs">Nama Termin</Label>
                    <Input
                      value={term.term_name}
                      onChange={(e) => updateTerm(term.id, 'term_name', e.target.value)}
                      placeholder="Termin 1"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Label className="text-xs">Persentase</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={term.percentage}
                        onChange={(e) =>
                          updateTerm(term.id, 'percentage', parseFloat(e.target.value) || 0)
                        }
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        %
                      </span>
                    </div>
                    {projectValueNum > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatCurrency((projectValueNum * term.percentage) / 100)}
                      </p>
                    )}
                  </div>
                  <div className="col-span-8 sm:col-span-3">
                    <Label className="text-xs">Trigger</Label>
                    <Select
                      value={term.trigger_condition}
                      onValueChange={(v) => updateTerm(term.id, 'trigger_condition', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGER_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-11 sm:col-span-3">
                    <Label className="text-xs">Keterangan</Label>
                    <Input
                      value={term.trigger_description}
                      onChange={(e) => updateTerm(term.id, 'trigger_description', e.target.value)}
                      placeholder="Keterangan..."
                    />
                  </div>
                  <div className="col-span-1 flex items-end justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTerm(term.id)}
                      disabled={terms.length === 1}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Buat Proyek
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
