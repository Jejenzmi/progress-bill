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
import { Loader2, Plus, Trash2, FileText, Calendar, LayoutTemplate, Eye } from 'lucide-react';
import { formatCurrency } from '@/data/mockData';
import { getPaymentTermTemplates } from '@/components/settings/PaymentTermTemplateManager';
import { getContractTemplates, getDefaultContractTemplate } from '@/components/settings/ContractTemplateManager';
import { ContractPreviewDialog } from './ContractPreviewDialog';
import {
  generateContractPDF,
  ContractData,
  ContractCompanyInfo,
  ContractClientInfo,
} from '@/lib/contractPdfGenerator';

interface Quotation {
  id: string;
  project_name: string;
  grand_total: number | null;
  negotiated_price: number | null;
  negotiation_status: string | null;
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

interface ObligationItem {
  text: string;
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
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
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
  
  // Rights and Obligations - Hak dan Kewajiban
  const [party1Obligations, setParty1Obligations] = useState<ObligationItem[]>([]);
  const [party2Obligations, setParty2Obligations] = useState<ObligationItem[]>([]);
  
  // Optional settings
  const [maintenancePeriod, setMaintenancePeriod] = useState(6);
  const [freeServerMonths, setFreeServerMonths] = useState(12);
  const [freeDomainMonths, setFreeDomainMonths] = useState(24);
  const [maxPaymentDays, setMaxPaymentDays] = useState(4);

  // Contract templates
  const [contractTemplates, setContractTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

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
    
    // Load contract templates
    try {
      const templates = await getContractTemplates();
      setContractTemplates(templates);
      
      // Get default template and apply it
      const defaultTemplate = templates.find(t => t.is_default) || templates[0];
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
        applyTemplate(defaultTemplate);
      } else {
        // Fallback to hardcoded defaults if no templates exist
        setDefaultObligations();
      }
    } catch (error) {
      console.error('Error loading contract templates:', error);
      setDefaultObligations();
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

  const setDefaultObligations = () => {
    setParty1Obligations([
      { text: 'Menyediakan tenaga ahli yang kompeten dan berpengalaman untuk pelaksanaan proyek.' },
      { text: 'Menyelesaikan proyek sesuai dengan jadwal yang telah disepakati dalam perjanjian ini.' },
      { text: 'Memberikan dukungan teknis dan pemeliharaan setelah sistem selesai dibangun sesuai ketentuan pada Pasal 5.' },
      { text: 'Menyediakan dokumentasi sistem dan memberikan pelatihan kepada pengguna.' },
    ]);
    setParty2Obligations([
      { text: 'Menyediakan data dan informasi yang dibutuhkan oleh PIHAK PERTAMA untuk menyelesaikan proyek.' },
      { text: 'Melakukan review terhadap hasil kerja PIHAK PERTAMA sesuai dengan jadwal yang disepakati.' },
      { text: 'Membayar biaya proyek sesuai dengan jadwal pembayaran yang disepakati.' },
      { text: 'Menyediakan akses untuk pengujian sistem di lingkungan PIHAK KEDUA.' },
    ]);
  };

  const applyTemplate = (template: any) => {
    // Apply party 1 obligations
    if (Array.isArray(template.party1_obligations)) {
      setParty1Obligations(template.party1_obligations.map((text: string) => ({ text })));
    }
    
    // Apply party 2 obligations
    if (Array.isArray(template.party2_obligations)) {
      setParty2Obligations(template.party2_obligations.map((text: string) => ({ text })));
    }
    
    // Apply standard clauses
    if (Array.isArray(template.standard_clauses)) {
      setCustomClauses(template.standard_clauses.map((c: any) => ({
        title: c.title || '',
        content: c.content || '',
      })));
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = contractTemplates.find(t => t.id === templateId);
    if (template) {
      applyTemplate(template);
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

  // Handlers for Party 1 Obligations
  const handleAddParty1Obligation = () => {
    setParty1Obligations([...party1Obligations, { text: '' }]);
  };

  const handleRemoveParty1Obligation = (index: number) => {
    setParty1Obligations(party1Obligations.filter((_, i) => i !== index));
  };

  const handleParty1ObligationChange = (index: number, value: string) => {
    const updated = [...party1Obligations];
    updated[index] = { text: value };
    setParty1Obligations(updated);
  };

  // Handlers for Party 2 Obligations
  const handleAddParty2Obligation = () => {
    setParty2Obligations([...party2Obligations, { text: '' }]);
  };

  const handleRemoveParty2Obligation = (index: number) => {
    setParty2Obligations(party2Obligations.filter((_, i) => i !== index));
  };

  const handleParty2ObligationChange = (index: number, value: string) => {
    const updated = [...party2Obligations];
    updated[index] = { text: value };
    setParty2Obligations(updated);
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

  const getSignerInfo = () => {
    return signerType === 'ceo' 
      ? { name: 'Jejen Jaenudin, SM., M.Kom', position: 'Direktur Utama' }
      : { name: 'Indra Apriana, S.Kom', position: 'Chief Operating Officer' };
  };

  const prepareContractPreviewData = async () => {
    if (!quotation || !user) return null;

    // Get company settings
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'company_profile')
      .maybeSingle();

    const { data: bankAccount } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();

    const companySettings = settings?.value as Record<string, any> || {};
    const signerInfo = getSignerInfo();

    const company: ContractCompanyInfo = {
      name: companySettings.name || 'PT Zen Multimedia Indonesia',
      npwp: companySettings.npwp || '41.439.836.2-409.000',
      address: companySettings.address || 'Jl. Taman Pahlawan No.166, Purwamekar, Purwakarta, INDONESIA',
      director_name: signerInfo.name,
      director_position: signerInfo.position,
      email: companySettings.email || 'info@zenmultimedia.co.id',
      phone: companySettings.phone || '085121045798',
      logo_url: companySettings.logo_url,
    };

    const client: ContractClientInfo = {
      company_name: quotation.clients?.name || '',
      npwp: quotation.clients?.npwp_badan || '',
      address: quotation.clients?.address || '',
      pic_name: clientSignerName || quotation.clients?.pic_name || '',
      pic_nik: clientSignerNik || '',
      pic_position: clientSignerPosition,
      pic_phone: quotation.clients?.pic_phone || '',
      pic_email: quotation.clients?.pic_email || '',
    };

    const contractValue = quotation.negotiation_status === 'approved' && quotation.negotiated_price
      ? quotation.negotiated_price
      : quotation.grand_total || 0;

    const contractData: ContractData = {
      contract_number: contractNumber,
      contract_date: new Date(),
      project_name: quotation.project_name,
      project_description: projectDescription,
      total_value: contractValue,
      start_date: new Date(startDate),
      end_date: new Date(endDate),
      duration_months: durationMonths,
      payment_terms: paymentTerms,
      bank_info: {
        bank_name: bankAccount?.bank_name || 'BCA',
        account_name: bankAccount?.account_name || 'PT Zen Multimedia Indonesia',
        account_number: bankAccount?.account_number || '2312665213',
        branch: 'Purwakarta',
      },
      additional_costs: additionalCosts.filter(c => c.description && c.amount > 0),
      additional_notes: additionalNotes || undefined,
      custom_clauses: customClauses.filter(c => c.title && c.content),
      maintenance_period_months: maintenancePeriod,
      free_server_months: freeServerMonths,
      free_domain_months: freeDomainMonths,
      max_payment_days: maxPaymentDays,
      party1_obligations: party1Obligations.filter(o => o.text.trim()),
      party2_obligations: party2Obligations.filter(o => o.text.trim()),
    };

    return { contractData, company, client, signerInfo };
  };

  const handlePreviewContract = async () => {
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

    setPreviewLoading(true);
    try {
      const data = await prepareContractPreviewData();
      if (!data) throw new Error('Gagal mempersiapkan data kontrak');

      // Generate HTML preview (without TTE for now - just preview)
      const html = await generateContractPDF(
        data.contractData,
        data.company,
        data.client,
        data.signerInfo.name,
        data.signerInfo.position
      );

      setPreviewHtml(html);
      setShowPreview(true);
    } catch (error: any) {
      console.error('Error generating preview:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal membuat preview kontrak',
        variant: 'destructive',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmCreate = async () => {
    if (!quotation || !user) return;

    setLoading(true);
    try {
      const signerInfo = getSignerInfo();

      // Get company settings
      const { data: settings } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'company_profile')
        .maybeSingle();

      // Get the final contract value - use negotiated price if approved, otherwise grand_total
      const contractValue = quotation.negotiation_status === 'approved' && quotation.negotiated_price
        ? quotation.negotiated_price
        : quotation.grand_total || 0;

      const contractData = {
        contract_number: contractNumber,
        quotation_id: quotation.id,
        client_id: quotation.client_id!,
        project_name: quotation.project_name,
        project_description: projectDescription,
        total_value: contractValue,
        start_date: startDate,
        end_date: endDate,
        duration_months: durationMonths,
        payment_terms_snapshot: paymentTerms as unknown as any,
        additional_costs: additionalCosts.filter(c => c.description && c.amount > 0) as unknown as any,
        additional_notes: additionalNotes || null,
        custom_clauses: customClauses.filter(c => c.title && c.content) as unknown as any,
        party1_obligations: party1Obligations.filter(o => o.text.trim()) as unknown as any,
        party2_obligations: party2Obligations.filter(o => o.text.trim()) as unknown as any,
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

      setShowPreview(false);
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
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Buat Kontrak Kerjasama (SPK)
          </DialogTitle>
          <DialogDescription>
            Buat kontrak dari quotation yang sudah disetujui
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(80vh - 180px)' }}>
          <div className="space-y-6 py-2">
            {/* Quotation Info */}
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{quotation.project_name}</h4>
                  <p className="text-sm text-muted-foreground">{quotation.clients?.name || 'Klien tidak diketahui'}</p>
                </div>
                <div className="text-right">
                  {quotation.negotiation_status === 'approved' && quotation.negotiated_price ? (
                    <>
                      <p className="text-sm text-muted-foreground line-through">
                        {formatCurrency(quotation.grand_total || 0)}
                      </p>
                      <p className="font-bold text-lg text-primary">
                        {formatCurrency(quotation.negotiated_price)}
                      </p>
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        Harga Deal
                      </Badge>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-lg">{formatCurrency(quotation.grand_total || 0)}</p>
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        Approved
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Template Selection */}
            {contractTemplates.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4" />
                  Template Kontrak
                </Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contractTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                        {template.is_default && ' (Default)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Template akan mengisi otomatis Hak/Kewajiban dan Pasal standar. Anda dapat mengeditnya setelah dipilih.
                </p>
              </div>
            )}

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

              {/* Party 1 Obligations - Hak dan Kewajiban Pihak 1 */}
              <AccordionItem value="party1-obligations">
                <AccordionTrigger>
                  <span>Hak & Kewajiban Pihak Pertama (ZMI)</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-muted-foreground mb-2">
                      Kewajiban yang harus dipenuhi oleh PT Zen Multimedia Indonesia
                    </p>
                    {party1Obligations.map((obligation, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <span className="text-sm font-medium mt-2 min-w-[24px]">{index + 1}.</span>
                        <Textarea
                          placeholder="Masukkan kewajiban..."
                          value={obligation.text}
                          onChange={(e) => handleParty1ObligationChange(index, e.target.value)}
                          rows={2}
                          className="flex-1"
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveParty1Obligation(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={handleAddParty1Obligation}>
                      <Plus className="h-4 w-4 mr-1" /> Tambah Kewajiban
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Party 2 Obligations - Hak dan Kewajiban Pihak 2 */}
              <AccordionItem value="party2-obligations">
                <AccordionTrigger>
                  <span>Hak & Kewajiban Pihak Kedua (Klien)</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-muted-foreground mb-2">
                      Kewajiban yang harus dipenuhi oleh klien
                    </p>
                    {party2Obligations.map((obligation, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <span className="text-sm font-medium mt-2 min-w-[24px]">{index + 1}.</span>
                        <Textarea
                          placeholder="Masukkan kewajiban..."
                          value={obligation.text}
                          onChange={(e) => handleParty2ObligationChange(index, e.target.value)}
                          rows={2}
                          className="flex-1"
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveParty2Obligation(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={handleAddParty2Obligation}>
                      <Plus className="h-4 w-4 mr-1" /> Tambah Kewajiban
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button 
            onClick={handlePreviewContract} 
            disabled={previewLoading || totalPercentage !== 100}
          >
            {previewLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Preview Kontrak
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Contract Preview Dialog */}
      <ContractPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        html={previewHtml}
        title={`Preview Kontrak SPK - ${contractNumber}`}
        description="Periksa kontrak sebelum menyimpan. Setelah konfirmasi, kontrak akan dibuat dalam status draft."
        onConfirm={handleConfirmCreate}
        confirmLabel="Konfirmasi & Buat Kontrak"
        confirmLoading={loading}
        showConfirmButton={true}
      />
    </Dialog>
  );
}
