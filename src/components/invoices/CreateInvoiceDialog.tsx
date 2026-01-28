import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Project {
  id: string;
  project_name: string;
  status: string;
  client_name: string;
  contract_id: string | null;
  contract_status: string | null;
}

interface PaymentTerm {
  id: string;
  term_name: string;
  amount: number;
  percentage: number;
  is_locked: boolean;
  has_invoice: boolean;
  evidences_count: number;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateInvoiceDialog({ open, onOpenChange, onSuccess }: CreateInvoiceDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [terms, setTerms] = useState<PaymentTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTerms(selectedProjectId);
    } else {
      setTerms([]);
      setSelectedTermId('');
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          project_name,
          status,
          contract_id,
          client:clients(name),
          contract:contracts(status)
        `)
        .eq('status', 'Won')
        .order('project_name');

      if (error) throw error;

      setProjects(
        (data || []).map((p: any) => ({
          id: p.id,
          project_name: p.project_name,
          status: p.status,
          client_name: p.client?.name || 'Unknown',
          contract_id: p.contract_id || null,
          contract_status: p.contract?.status || null,
        }))
      );
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTerms = async (projectId: string) => {
    try {
      // Fetch payment terms for the project
      const { data: termsData, error: termsError } = await supabase
        .from('payment_terms')
        .select('id, term_name, amount, percentage, is_locked')
        .eq('project_id', projectId)
        .order('term_order');

      if (termsError) throw termsError;

      // Get existing invoices for these terms
      const termIds = (termsData || []).map((t) => t.id);
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('term_id')
        .in('term_id', termIds);

      if (invoicesError) throw invoicesError;

      const invoicedTermIds = new Set((invoicesData || []).map((i) => i.term_id));

      // Get evidence counts
      const { data: evidencesData, error: evidencesError } = await supabase
        .from('term_evidences')
        .select('term_id')
        .in('term_id', termIds);

      if (evidencesError) throw evidencesError;

      const evidenceCounts: Record<string, number> = {};
      (evidencesData || []).forEach((e) => {
        evidenceCounts[e.term_id] = (evidenceCounts[e.term_id] || 0) + 1;
      });

      setTerms(
        (termsData || []).map((t) => ({
          id: t.id,
          term_name: t.term_name,
          amount: Number(t.amount),
          percentage: Number(t.percentage),
          is_locked: t.is_locked || false,
          has_invoice: invoicedTermIds.has(t.id),
          evidences_count: evidenceCounts[t.id] || 0,
        }))
      );
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedTerm = terms.find((t) => t.id === selectedTermId);
  
  // Contract must be signed before invoice can be created
  const contractSigned = selectedProject?.contract_status === 'signed';
  const canCreate = selectedTerm && !selectedTerm.has_invoice && !selectedTerm.is_locked && selectedTerm.evidences_count > 0 && contractSigned;

  const handleCreate = async () => {
    if (!selectedProjectId || !selectedTermId || !selectedTerm || !contractSigned) return;

    setCreating(true);
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
        term_id: selectedTermId,
        project_id: selectedProjectId,
        amount: selectedTerm.amount,
        invoice_date: now.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'Draft',
      });

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: `Invoice ${invoiceNumber} berhasil dibuat`,
      });

      onOpenChange(false);
      setSelectedProjectId('');
      setSelectedTermId('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal membuat invoice',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Buat Invoice Baru
          </DialogTitle>
          <DialogDescription>
            Pilih proyek dan termin pembayaran untuk membuat invoice
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Project Selection */}
            <div className="space-y-2">
              <Label>Proyek (Status: Won)</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih proyek..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Tidak ada proyek dengan status Won
                    </div>
                  ) : (
                    projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex flex-col">
                          <span>{project.project_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {project.client_name}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Term Selection */}
            {selectedProjectId && (
              <div className="space-y-2">
                <Label>Termin Pembayaran</Label>
                <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih termin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Tidak ada termin untuk proyek ini
                      </div>
                    ) : (
                      terms.map((term) => (
                        <SelectItem
                          key={term.id}
                          value={term.id}
                          disabled={term.has_invoice || term.is_locked || term.evidences_count === 0}
                        >
                          <div className="flex items-center gap-2">
                            <span>{term.term_name} ({term.percentage}%)</span>
                            {term.has_invoice && (
                              <Badge variant="secondary" className="text-xs">
                                Sudah Invoice
                              </Badge>
                            )}
                            {term.is_locked && (
                              <Badge variant="outline" className="text-xs">
                                Terkunci
                              </Badge>
                            )}
                            {!term.has_invoice && !term.is_locked && term.evidences_count === 0 && (
                              <Badge variant="destructive" className="text-xs">
                                Butuh Dokumen
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Selected Term Details */}
            {selectedTerm && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Termin:</span>
                  <span className="font-medium">{selectedTerm.term_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Persentase:</span>
                  <span className="font-medium">{selectedTerm.percentage}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Nilai:</span>
                  <span className="font-bold text-lg">{formatCurrency(selectedTerm.amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Dokumen:</span>
                  {selectedTerm.evidences_count > 0 ? (
                    <Badge variant="default">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {selectedTerm.evidences_count} file
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Belum ada
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Kontrak:</span>
                  {contractSigned ? (
                    <Badge variant="default">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Ditandatangani
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Belum Tanda Tangan
                    </Badge>
                  )}
                </div>

                {/* Validation Messages */}
                {!contractSigned && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                    <AlertCircle className="h-4 w-4" />
                    <span>Kontrak harus ditandatangani terlebih dahulu sebelum membuat invoice</span>
                  </div>
                )}
                {selectedTerm.has_invoice && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded">
                    <AlertCircle className="h-4 w-4" />
                    <span>Termin ini sudah memiliki invoice</span>
                  </div>
                )}
                {selectedTerm.is_locked && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded">
                    <AlertCircle className="h-4 w-4" />
                    <span>Termin ini terkunci, upload dokumen terlebih dahulu</span>
                  </div>
                )}
                {!selectedTerm.has_invoice && !selectedTerm.is_locked && selectedTerm.evidences_count === 0 && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                    <AlertCircle className="h-4 w-4" />
                    <span>Upload dokumen bukti terlebih dahulu sebelum membuat invoice</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate || creating}>
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Buat Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
