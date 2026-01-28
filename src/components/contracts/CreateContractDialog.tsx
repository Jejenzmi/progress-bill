import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { generateContractNumber } from '@/hooks/useContracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, Plus, Trash2, FileText, Calendar } from 'lucide-react';
import { formatCurrency } from '@/data/mockData';
import { getPaymentTermTemplates } from '@/components/settings/PaymentTermTemplateManager';

interface Quotation {
  id: string;
  project_name: string;
  grand_total: number | null;
  client_id: string | null;
  man_days: any;
  created_at: string;
  clients?: {
    id: string;
    name: string;
    address: string | null;
    pic_name: string | null;
    pic_email: string | null;
    pic_phone: string | null;
    npwp_badan: string | null;
    client_type: string;
  } | null;
}

interface CreateContractDialogProps {
  quotation: Quotation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface PaymentTerm {
  term_name: string;
  percentage: number;
  description: string;
}

interface AdditionalCost {
  description: string;
  amount: number;
  notes: string;
}

interface CustomClause {
  title: string;
  content: string;
}

export function CreateContractDialog({
  quotation,
  open,
  onOpenChange,
  onSuccess,
}: CreateContractDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [contractNumber, setContractNumber] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationMonths, setDurationMonths] = useState(3);
  const [signerType, setSignerType] = useState<'ceo' | 'coo'>('ceo');
  const [clientSignerName, setClientSignerName] = useState('');
  const [clientSignerPosition, setClientSignerPosition] = useState('Direktur');
  const [clientSignerNik, setClientSignerNik] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  
  // Payment terms
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  
  // Additional costs
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>([]);
  
  // Custom clauses
  const [customClauses, setCustomClauses] = useState<CustomClause[]>([]);
  
  // Optional settings
  const [maintenancePeriod, setMaintenancePeriod] = useState(6);
  const [freeServerMonths, setFreeServerMonths] = useState(12);
  const [freeDomainMonths, setFreeDomainMonths] = useState(24);
  const [maxPaymentDays, setMaxPaymentDays] = useState(4);

  useEffect(() => {
    if (open && quotation) {
      initializeForm();
    }
  }, [open, quotation]);

  const initializeForm = async () => {
    if (!quotation) return;
    
    // Generate contract number
    const number = await generateContractNumber();
    setContractNumber(number);
    
    // Set default dates
    const today = new Date();
    const endDateDefault = new Date(today);
    endDateDefault.setMonth(endDateDefault.getMonth() + 3);
    
    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(endDateDefault.toISOString().split('T')[0]);
    
    // Set client signer from quotation
    if (quotation.clients?.pic_name) {
      setClientSignerName(quotation.clients.pic_name);
    }
    
    // Load payment term templates
    try {
      const templates = await getPaymentTermTemplates();
      const terms: PaymentTerm[] = templates.map((t) => ({
        term_name: t.term_name,
        percentage: t.percentage,
        description: t.trigger_description || '',
      }));
      setPaymentTerms(terms.length > 0 ? terms : [
        { term_name: 'Termin 1 (DP)', percentage: 30, description: 'setelah penandatanganan perjanjian (sebagai uang muka)' },
        { term_name: 'Termin 2 (Progress)', percentage: 30, description: 'setelah penyelesaian tahap pengembangan dan presentasi prototipe/sistem' },
        { term_name: 'Termin 3 (Final)', percentage: 40, description: 'setelah pengujian dan penerimaan sistem (User Acceptance Test) serta sistem go-live' },
      ]);
    } catch (error) {
      console.error('Error loading payment term templates:', error);
      setPaymentTerms([
        { term_name: 'Termin 1 (DP)', percentage: 30, description: 'setelah penandatanganan perjanjian (sebagai uang muka)' },
        { term_name: 'Termin 2 (Progress)', percentage: 30, description: 'setelah penyelesaian tahap pengembangan dan presentasi prototipe/sistem' },
        { term_name: 'Termin 3 (Final)', percentage: 40, description: 'setelah pengujian dan penerimaan sistem (User Acceptance Test) serta sistem go-live' },
      ]);
    }
  };

  const handleAddPaymentTerm = () => {
    setPaymentTerms([...paymentTerms, { term_name: '', percentage: 0, description: '' }]);
  };

  const handleRemovePaymentTerm = (index: number) => {
    setPaymentTerms(paymentTerms.filter((_, i) => i !== index));
  };

  const handlePaymentTermChange = (index: number, field: keyof PaymentTerm, value: string | number) => {
    const updated = [...paymentTerms];
    updated[index] = { ...updated[index], [field]: value };
    setPaymentTerms(updated);
  };

  const handleAddAdditionalCost = () => {
    setAdditionalCosts([...additionalCosts, { description: '', amount: 0, notes: '' }]);
  };

  const handleRemoveAdditionalCost = (index: number) => {
    setAdditionalCosts(additionalCosts.filter((_, i) => i !== index));
  };

  const handleAdditionalCostChange = (index: number, field: keyof AdditionalCost, value: string | number) => {
    const updated = [...additionalCosts];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalCosts(updated);
  };

  const handleAddCustomClause = () => {
    setCustomClauses([...customClauses, { title: '', content: '' }]);
  };

  const handleRemoveCustomClause = (index: number) => {
    setCustomClauses(customClauses.filter((_, i) => i !== index));
  };

  const handleCustomClauseChange = (index: number, field: keyof CustomClause, value: string) => {
    const updated = [...customClauses];
    updated[index] = { ...updated[index], [field]: value };
    setCustomClauses(updated);
  };

  const calculateDuration = () => {
    if (!startDate || !endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    setDurationMonths(Math.max(1, months));
  };

  useEffect(() => {
    calculateDuration();
  }, [startDate, endDate]);

  const totalPercentage = paymentTerms.reduce((sum, t) => sum + (Number(t.percentage) || 0), 0);

  const handleSubmit = async () => {
    if (!quotation || !user) return;

    // Validate
    if (!contractNumber.trim()) {
      toast({ title: 'Error', description: 'Nomor kontrak wajib diisi', variant: 'destructive' });
      return;
    }
    if (!startDate || !endDate) {
      toast({ title: 'Error', description: 'Tanggal mulai dan selesai wajib diisi', variant: 'destructive' });
      return;
    }
    if (totalPercentage !== 100) {
      toast({ title: 'Error', description: 'Total persentase termin harus 100%', variant: 'destructive' });
      return;
    }
    if (!clientSignerName.trim()) {
      toast({ title: 'Error', description: 'Nama penandatangan klien wajib diisi', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Get signer info
      const signerInfo = signerType === 'ceo' 
        ? { name: 'Jejen Jaenudin, SM., M.Kom', position: 'Direktur Utama' }
        : { name: 'Indra Apriana, S.Kom', position: 'Chief Operating Officer' };

      // Get company settings
      const { data: settings } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'company_profile')
        .maybeSingle();

      const contractData = {
        contract_number: contractNumber,
        quotation_id: quotation.id,
        client_id: quotation.client_id!,
        project_name: quotation.project_name,
        project_description: projectDescription,
        total_value: quotation.grand_total || 0,
        start_date: startDate,
        end_date: endDate,
        duration_months: durationMonths,
        payment_terms_snapshot: paymentTerms as unknown as any,
        additional_costs: additionalCosts.filter(c => c.description && c.amount > 0) as unknown as any,
        additional_notes: additionalNotes || null,
        custom_clauses: customClauses.filter(c => c.title && c.content) as unknown as any,
        company_settings: settings?.value || null,
        signer_type: signerType,
        signer_name: signerInfo.name,
        signer_position: signerInfo.position,
        client_signer_name: clientSignerName,
        client_signer_position: clientSignerPosition,
        client_signer_nik: clientSignerNik || null,
        status: 'draft',
        created_by: user.id,
      };

      const { error } = await supabase
        .from('contracts')
        .insert(contractData);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: `Kontrak ${contractNumber} berhasil dibuat`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating contract:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal membuat kontrak',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!quotation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Buat Kontrak Kerjasama (SPK)
          </DialogTitle>
          <DialogDescription>
            Buat kontrak dari quotation yang sudah disetujui
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-6 py-4">
            {/* Quotation Info */}
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{quotation.project_name}</h4>
                  <p className="text-sm text-muted-foreground">{quotation.clients?.name || 'Klien tidak diketahui'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatCurrency(quotation.grand_total || 0)}</p>
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Approved</Badge>
                </div>
              </div>
            </div>

            {/* Contract Number & Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nomor Kontrak</Label>
                <Input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Durasi Proyek</Label>
                <Input value={`${durationMonths} bulan`} disabled />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Selesai</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {/* Project Description */}
            <div className="space-y-2">
              <Label>Deskripsi Proyek</Label>
              <Textarea 
                placeholder="Deskripsi singkat proyek..."
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={3}
              />
            </div>

            <Separator />

            {/* Signer Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Penandatangan (Pihak Pertama)</Label>
                <Select value={signerType} onValueChange={(v) => setSignerType(v as 'ceo' | 'coo')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ceo">CEO - Jejen Jaenudin, SM., M.Kom</SelectItem>
                    <SelectItem value="coo">COO - Indra Apriana, S.Kom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Client Signer */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Penandatangan (Pihak Kedua)</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nama</Label>
                  <Input value={clientSignerName} onChange={(e) => setClientSignerName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Jabatan</Label>
                  <Input value={clientSignerPosition} onChange={(e) => setClientSignerPosition(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>NIK (Opsional)</Label>
                  <Input value={clientSignerNik} onChange={(e) => setClientSignerNik(e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Terms */}
            <Accordion type="single" collapsible defaultValue="payment-terms">
              <AccordionItem value="payment-terms">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <span>Termin Pembayaran</span>
                    <Badge variant={totalPercentage === 100 ? 'default' : 'destructive'}>
                      {totalPercentage}%
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {paymentTerms.map((term, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-start">
                        <div className="col-span-3">
                          <Input
                            placeholder="Nama termin"
                            value={term.term_name}
                            onChange={(e) => handlePaymentTermChange(index, 'term_name', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="%"
                            value={term.percentage}
                            onChange={(e) => handlePaymentTermChange(index, 'percentage', Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-6">
                          <Input
                            placeholder="Deskripsi"
                            value={term.description}
                            onChange={(e) => handlePaymentTermChange(index, 'description', e.target.value)}
                          />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemovePaymentTerm(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={handleAddPaymentTerm}>
                      <Plus className="h-4 w-4 mr-1" /> Tambah Termin
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Additional Costs */}
              <AccordionItem value="additional-costs">
                <AccordionTrigger>
                  <span>Biaya Tambahan (Opsional)</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {additionalCosts.map((cost, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-start">
                        <div className="col-span-5">
                          <Input
                            placeholder="Deskripsi biaya"
                            value={cost.description}
                            onChange={(e) => handleAdditionalCostChange(index, 'description', e.target.value)}
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            placeholder="Jumlah (Rp)"
                            value={cost.amount || ''}
                            onChange={(e) => handleAdditionalCostChange(index, 'amount', Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            placeholder="Catatan"
                            value={cost.notes}
                            onChange={(e) => handleAdditionalCostChange(index, 'notes', e.target.value)}
                          />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveAdditionalCost(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={handleAddAdditionalCost}>
                      <Plus className="h-4 w-4 mr-1" /> Tambah Biaya
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Custom Clauses */}
              <AccordionItem value="custom-clauses">
                <AccordionTrigger>
                  <span>Pasal Tambahan (Opsional)</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {customClauses.map((clause, index) => (
                      <div key={index} className="space-y-2 p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder={`Judul Pasal ${11 + index}`}
                            value={clause.title}
                            onChange={(e) => handleCustomClauseChange(index, 'title', e.target.value)}
                          />
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveCustomClause(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <Textarea
                          placeholder="Isi pasal..."
                          value={clause.content}
                          onChange={(e) => handleCustomClauseChange(index, 'content', e.target.value)}
                          rows={3}
                        />
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={handleAddCustomClause}>
                      <Plus className="h-4 w-4 mr-1" /> Tambah Pasal
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Service Settings */}
              <AccordionItem value="service-settings">
                <AccordionTrigger>
                  <span>Pengaturan Layanan</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label>Periode Pemeliharaan (bulan)</Label>
                      <Input
                        type="number"
                        value={maintenancePeriod}
                        onChange={(e) => setMaintenancePeriod(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Server Gratis (bulan)</Label>
                      <Input
                        type="number"
                        value={freeServerMonths}
                        onChange={(e) => setFreeServerMonths(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Domain Gratis (bulan)</Label>
                      <Input
                        type="number"
                        value={freeDomainMonths}
                        onChange={(e) => setFreeDomainMonths(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Maksimal Pembayaran (hari)</Label>
                      <Input
                        type="number"
                        value={maxPaymentDays}
                        onChange={(e) => setMaxPaymentDays(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label>Catatan Tambahan (Opsional)</Label>
              <Textarea
                placeholder="Catatan khusus yang akan ditampilkan di kontrak..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={loading || totalPercentage !== 100}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Buat Kontrak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
