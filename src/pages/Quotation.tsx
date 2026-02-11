import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from '@/hooks/useClients';
import { generateQuotationPDF, numberToWords, type QuotationItem, type CompanyProfile } from '@/lib/quotationPdfGenerator';
import { PDFPreviewDialog } from '@/components/PDFPreviewDialog';
import { AddClientDialog } from '@/components/clients/AddClientDialog';
import { ProductSelectorDialog } from '@/components/quotations/ProductSelectorDialog';
import { useUserTTE } from '@/hooks/useUserTTE';
import type { TTESettings } from '@/hooks/useUserTTE';
import { Plus, Trash2, FileText, Download, Save, Loader2, Calculator, Eye, Users, UserPlus, Stamp, Package } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

// Predefined TTE signers
const TTE_SIGNERS = [
  { id: 'self', label: 'Marketing (Saya Sendiri)', name: '', position: '' },
  { id: 'coo', label: 'COO - Indra Apriana, S.Kom', name: 'Indra Apriana, S.Kom', position: 'Chief Operational Officer' },
  { id: 'ceo', label: 'CEO - Jejen Jaenudin, SM., M.Kom', name: 'Jejen Jaenudin, SM., M.Kom', position: 'Chief Executive Officer' },
];

const formatCurrencyLocal = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function Quotation() {
  const { toast } = useToast();
  const { clients, loading: clientsLoading, refetch: refetchClients } = useClients();
  const { fetchTTEForPDF, tteSettings: userTTESettings } = useUserTTE();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = searchParams.get('edit');
  
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  
  // TTE Signer selection
  const [selectedTTESigner, setSelectedTTESigner] = useState('self');
  
  // Basic Info
  const [quotationNumber, setQuotationNumber] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  
  // Items
  const [items, setItems] = useState<QuotationItem[]>([
    { item: 'Sistem Berbasis Web', description: '', quantity: 1, unit: 'Package', unitPrice: 0, total: 0 },
  ]);
  
  // Costs
  const [ppnMode, setPpnMode] = useState<'exclude' | 'include'>('exclude');
  const [ppnPercentage, setPpnPercentage] = useState(11);
  const [estimatedDuration, setEstimatedDuration] = useState('1–30 hari kalender');
  const [paymentTerms, setPaymentTerms] = useState<string[]>([
    '50% – Down Payment',
    '50% – Setelah progress 100%',
  ]);
  const [guaranteeTerms, setGuaranteeTerms] = useState<string[]>([
    'Garansi bug fixing 60 hari',
    'Support teknis selama masa garansi',
    'Opsional maintenance bulanan tersedia jika diperlukan',
  ]);
  
  // Margin tracking (from catalog products)
  const [usedMarginPercentage, setUsedMarginPercentage] = useState<number | null>(null);
  const [defaultMarginPercentage, setDefaultMarginPercentage] = useState<number>(20);
  const [applyMarginToMandays, setApplyMarginToMandays] = useState<boolean>(true);

  // Fetch quotation settings, margin settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      // Fetch margin settings
      try {
        const { data: marginData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'margin_settings')
          .maybeSingle();
        
        if (marginData?.value && typeof marginData.value === 'object') {
          const settings = marginData.value as { default_margin_percentage?: number; apply_to_mandays?: boolean };
          if (settings.default_margin_percentage !== undefined) {
            setDefaultMarginPercentage(settings.default_margin_percentage);
            setUsedMarginPercentage(settings.default_margin_percentage);
          }
          if (settings.apply_to_mandays !== undefined) {
            setApplyMarginToMandays(settings.apply_to_mandays);
          }
        }
      } catch (error) {
        console.log('Using default margin settings');
      }

      if (editId) {
        loadQuotationForEdit(editId);
      } else {
        // Fetch quotation settings (prefix and last_number)
        let prefix = 'QUO-ZMI';
        let lastNumber = 0;
        try {
          const { data } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'quotation_settings')
            .maybeSingle();
          
          if (data?.value && typeof data.value === 'object') {
            const settings = data.value as { prefix?: string; last_number?: number };
            if (settings.prefix) prefix = settings.prefix;
            if (settings.last_number) lastNumber = settings.last_number;
          }
        } catch (error) {
          console.log('Using default quotation settings');
        }
        
        const now = new Date();
        const month = now.toLocaleString('id-ID', { month: 'short' }).toUpperCase();
        const year = now.getFullYear();
        
        // Next number is last_number + 1
        const nextNumber = lastNumber + 1;
        
        // Format number with leading zeros (e.g., 001, 012, 123)
        const formattedNumber = String(nextNumber).padStart(3, '0');
        setQuotationNumber(`${formattedNumber}/${prefix}/${month}/${year}`);
      }
    };
    
    loadSettings();
  }, [editId]);

  const loadQuotationForEdit = async (id: string) => {
    setLoadingEdit(true);
    try {
      const { data: quotation, error } = await supabase
        .from('quotations')
        .select('*, clients(name, address)')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (quotation) {
        setEditingQuotationId(quotation.id);
        setProjectName(quotation.project_name);
        
        // Set project description
        if ((quotation as any).project_description) {
          setProjectDescription((quotation as any).project_description);
        }
        
        // Set quotation number from database (fixed, never changes)
        if ((quotation as any).quotation_number) {
          setQuotationNumber((quotation as any).quotation_number);
        }
        
        // Set client info
        if (quotation.client_id) {
          setSelectedClientId(quotation.client_id);
        }
        if (quotation.clients) {
          const clientData = quotation.clients as { name: string; address: string | null };
          setClientName(clientData.name);
          setClientAddress(clientData.address || '');
        }

        // Set items from man_days (including description field if exists)
        const manDays = quotation.man_days as unknown as QuotationItem[];
        if (Array.isArray(manDays) && manDays.length > 0) {
          setItems(manDays);
        }

        // Restore margin percentage if saved
        if (quotation.margin_percentage !== null && quotation.margin_percentage !== undefined) {
          setUsedMarginPercentage(quotation.margin_percentage);
        }

        toast({
          title: 'Quotation Dimuat',
          description: `Editing: ${quotation.project_name}`,
        });
      }
    } catch (error: any) {
      console.error('Error loading quotation:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat quotation untuk diedit',
        variant: 'destructive',
      });
    } finally {
      setLoadingEdit(false);
    }
  };

  // Auto-fill client data when selected
  const handleClientSelect = (clientId: string) => {
    if (clientId === 'manual') {
      setSelectedClientId('manual');
      setClientName('');
      setClientAddress('');
      return;
    }
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setClientName(client.name);
      setClientAddress(client.address || '');
    }
  };

  const handleClientCreated = (newClient: { id: string; name: string; address: string | null }) => {
    refetchClients();
    setSelectedClientId(newClient.id);
    setClientName(newClient.name);
    setClientAddress(newClient.address || '');
  };

  const addItem = () => {
    setItems([...items, { item: '', description: '', quantity: 1, unit: 'Package', unitPrice: 0, total: 0 }]);
  };

  const addProductsFromCatalog = (products: Array<{
    item: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>, marginPercentage: number) => {
    setItems([...items, ...products]);
    // Track the margin percentage used
    setUsedMarginPercentage(marginPercentage);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
    }
    
    setItems(updated);
  };

  const addPaymentTerm = () => {
    setPaymentTerms([...paymentTerms, '']);
  };

  const updatePaymentTerm = (index: number, value: string) => {
    const updated = [...paymentTerms];
    updated[index] = value;
    setPaymentTerms(updated);
  };

  const removePaymentTerm = (index: number) => {
    setPaymentTerms(paymentTerms.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  
  // PPN calculation based on mode
  // Exclude: subtotal + PPN = grandTotal
  // Include: subtotal already includes PPN, so we extract it
  const ppnAmount = ppnMode === 'exclude' 
    ? Math.round(subtotal * (ppnPercentage / 100))
    : Math.round(subtotal - (subtotal / (1 + ppnPercentage / 100)));
  const grandTotal = ppnMode === 'exclude' 
    ? subtotal + ppnAmount 
    : subtotal;
  const subtotalBeforePPN = ppnMode === 'include' 
    ? Math.round(subtotal / (1 + ppnPercentage / 100))
    : subtotal;

  const getCompanyProfile = async (): Promise<CompanyProfile> => {
    const { data: companyData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'company_profile')
      .maybeSingle();

    const value = companyData?.value as Record<string, unknown> | null;
    
    return {
      name: (value?.name as string) || 'PT. ZEN MULTIMEDIA INDONESIA',
      npwp: (value?.npwp as string) || '-',
      address: (value?.address as string) || 'Jl. Taman Pahlawan No.166, Purwamekar, Purwakarta, Jawa Barat - Indonesia',
      phone: (value?.phone as string) || '085121045798',
      email: (value?.email as string) || 'info@zenmultimedia.co.id',
      website: (value?.website as string) || 'www.zenmultimedia.co.id',
      bank_info: (value?.bank_info as string) || '-',
      logo_url: (value?.logo_url as string) || undefined,
    };
  };

  // Get TTE settings based on selected signer
  const getSelectedTTESettings = async (): Promise<TTESettings> => {
    const selected = TTE_SIGNERS.find(s => s.id === selectedTTESigner);
    
    if (selectedTTESigner === 'self') {
      // Use user's own TTE settings
      const userTTE = await fetchTTEForPDF();
      return userTTE;
    }
    
    // Use predefined signer settings
    if (selected) {
      return {
        signer_name: selected.name,
        signer_position: selected.position,
        enabled: true,
      };
    }
    
    // Fallback to user's TTE settings
    return await fetchTTEForPDF();
  };

  const buildQuotationData = () => {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    // For PDF, always show subtotal before PPN and then add PPN
    const displaySubtotal = ppnMode === 'include' ? subtotalBeforePPN : subtotal;
    const displayPpnAmount = ppnAmount;

    return {
      quotationNumber,
      quotationDate: new Date(),
      validUntil,
      clientName: clientName || 'Klien',
      clientAddress: clientAddress || '',
      projectName,
      projectDescription: projectDescription || undefined,
      items,
      subtotal: displaySubtotal,
      ppnPercentage,
      ppnAmount: displayPpnAmount,
      grandTotal,
      paymentTerms: paymentTerms.filter(t => t.trim()),
      estimatedDuration: estimatedDuration || undefined,
      guaranteeTerms: guaranteeTerms.filter(t => t.trim()),
    };
  };

  const handleSave = async () => {
    if (!projectName) {
      toast({
        title: 'Error',
        description: 'Nama proyek wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      const quotationData = {
        project_name: projectName,
        project_description: projectDescription || null,
        client_id: (selectedClientId && selectedClientId !== 'manual') ? selectedClientId : null,
        man_days: items as any,
        hosting_cost: 0,
        maintenance_cost: 0,
        maintenance_period: 'Tahunan',
        total_development: subtotal,
        grand_total: grandTotal,
        valid_until: validUntil.toISOString().split('T')[0],
        status: 'Draft',
        margin_percentage: usedMarginPercentage,
        quotation_number: quotationNumber,
        created_by: user?.id || null,
      };

      if (editingQuotationId) {
        // Update existing (don't change the quotation_number or revision_number)
        const { quotation_number: _, ...updateData } = quotationData;
        const { error } = await supabase
          .from('quotations')
          .update({ ...updateData, status: updateData.status })
          .eq('id', editingQuotationId);

        if (error) throw error;

        toast({
          title: 'Berhasil',
          description: 'Quotation berhasil diupdate',
        });
      } else {
        // Insert new with quotation_number
        const { error } = await supabase.from('quotations').insert([quotationData]);

        if (error) throw error;

        // Update last_number in quotation_settings
        const numberMatch = quotationNumber.match(/^(\d+)\//);
        if (numberMatch) {
          const currentNumber = parseInt(numberMatch[1], 10);
          // Fetch current settings and update last_number
          const { data: currentSettings } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'quotation_settings')
            .single();
          
          const updatedValue = {
            ...(currentSettings?.value as object || {}),
            last_number: currentNumber,
          };
          
          await supabase
            .from('settings')
            .update({ value: updatedValue })
            .eq('key', 'quotation_settings');
        }

        toast({
          title: 'Berhasil',
          description: 'Quotation berhasil disimpan',
        });
      }
      
      navigate('/quotations');
    } catch (error: any) {
      console.error('Error saving quotation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan quotation',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!projectName) {
      toast({
        title: 'Error',
        description: 'Nama proyek wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setLoadingPreview(true);
    try {
      const company = await getCompanyProfile();
      const tteSettings = await getSelectedTTESettings();
      const quotationData = buildQuotationData();
      const html = await generateQuotationPDF(quotationData, company, tteSettings);
      setPreviewHtml(html);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: 'Error',
        description: 'Gagal membuat preview',
        variant: 'destructive',
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!projectName) {
      toast({
        title: 'Error',
        description: 'Nama proyek wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setLoadingDownload(true);
    try {
      const company = await getCompanyProfile();
      const tteSettings = await getSelectedTTESettings();
      const quotationData = buildQuotationData();
      const html = await generateQuotationPDF(quotationData, company, tteSettings);
      
      // Generate verification ID (same as in PDF generator)
      const verificationId = btoa(quotationData.quotationNumber).substring(0, 16).toUpperCase();
      
      // Save to signed_documents if TTE is enabled
      if (tteSettings?.enabled !== false && tteSettings?.signer_name) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Check if this quotation was already signed
          const { data: existing } = await supabase
            .from('signed_documents')
            .select('id')
            .eq('verification_id', verificationId)
            .maybeSingle();
          
          if (!existing) {
            const { error: dbError } = await supabase
              .from('signed_documents')
              .insert({
                user_id: user.id,
                original_file_name: `Quotation-${quotationData.quotationNumber}.pdf`,
                original_file_path: `quotations/${quotationData.quotationNumber}`,
                signed_file_path: null,
                file_type: 'application/pdf',
                file_size: null,
                qr_position: 'bottom-left',
                signer_name: tteSettings.signer_name,
                signer_position: tteSettings.signer_position || '',
                signed_at: new Date().toISOString(),
                verification_id: verificationId,
              });
            
            if (dbError) {
              console.error('Error saving to signed_documents:', dbError);
            } else {
              toast({
                title: 'TTE Tersimpan',
                description: 'Dokumen telah ditandatangani dan tercatat dalam sistem',
              });
            }
          }
        }
      }
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Gagal membuat PDF',
        variant: 'destructive',
      });
    } finally {
      setLoadingDownload(false);
    }
  };

  if (loadingEdit) {
    return (
      <AppLayout title="Quotation Builder" subtitle="Memuat data...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Quotation Builder" subtitle="Buat penawaran harga sesuai format PT Zen Multimedia Indonesia">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Quotation</CardTitle>
              <CardDescription>Detail dasar penawaran</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quotationNumber">Nomor Quotation</Label>
                  <Input
                    id="quotationNumber"
                    value={quotationNumber}
                    onChange={(e) => setQuotationNumber(e.target.value)}
                    placeholder="128/QUO-ZMI/XII/2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectName">Nama Proyek *</Label>
                  <Input
                    id="projectName"
                    placeholder="Sistem Pengecekan Komponen Produksi"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectDescription">Deskripsi Proyek</Label>
                <Textarea
                  id="projectDescription"
                  placeholder="Deskripsi singkat sistem yang akan dibuat..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={2}
                />
              </div>
              
              {/* Client Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Pilih Klien dari Database
                  </Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setAddClientOpen(true)}
                    className="h-7 text-xs"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Tambah Klien Baru
                  </Button>
                </div>
                <Select value={selectedClientId} onValueChange={handleClientSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={clientsLoading ? "Memuat..." : "Pilih klien..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">-- Isi Manual --</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} ({client.client_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nama Klien *</Label>
                  <Input
                    id="clientName"
                    placeholder="PT. Harmonic Techindo Agung"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientAddress">Alamat Klien</Label>
                <Input
                  id="clientAddress"
                  placeholder="Alamat lengkap klien"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Item Penawaran
                  </CardTitle>
                  <CardDescription>Daftar item yang ditawarkan</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setProductSelectorOpen(true)} size="sm" variant="outline">
                    <Package className="h-4 w-4 mr-2" />
                    Dari Katalog
                  </Button>
                  <Button onClick={addItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Manual
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-3 text-sm font-medium text-muted-foreground px-2">
                  <div className="col-span-4">Item</div>
                  <div className="col-span-1">Jml</div>
                  <div className="col-span-2">Satuan</div>
                  <div className="col-span-2">Harga Satuan</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Rows */}
                {items.map((item, index) => (
                  <div key={index} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-4">
                        <Input
                          value={item.item}
                          onChange={(e) => updateItem(index, 'item', e.target.value)}
                          placeholder="Nama item"
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          min={1}
                        />
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={item.unit}
                          onValueChange={(value) => updateItem(index, 'unit', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Package">Package</SelectItem>
                            <SelectItem value="Unit">Unit</SelectItem>
                            <SelectItem value="License">License</SelectItem>
                            <SelectItem value="Modul">Modul</SelectItem>
                            <SelectItem value="Tahun">Tahun</SelectItem>
                            <SelectItem value="Bulan">Bulan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2 text-right font-semibold text-sm">
                        {formatCurrencyLocal(item.total)}
                      </div>
                      <div className="col-span-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Description field */}
                    <div className="pl-0">
                      <Input
                        value={item.description || ''}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Deskripsi item (opsional)"
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                ))}

                {/* Subtotal & PPN */}
                <div className="border-t pt-4 mt-4 space-y-3">
                  {/* Margin Info */}
                  {usedMarginPercentage !== null && (
                    <div className="flex items-center justify-between px-2 pb-2 border-b bg-muted/50 rounded-md p-2">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Margin Profit:</span>
                        <span className="text-sm font-bold text-primary">{usedMarginPercentage}%</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {applyMarginToMandays ? 'Diterapkan ke semua item' : 'Hanya untuk produk katalog'}
                      </span>
                    </div>
                  )}

                  {/* PPN Mode Selection */}
                  <div className="flex items-center gap-4 px-2 pb-2 border-b">
                    <span className="text-sm font-medium">Mode PPN:</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={ppnMode === 'exclude' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPpnMode('exclude')}
                      >
                        Exclude PPN
                      </Button>
                      <Button
                        type="button"
                        variant={ppnMode === 'include' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPpnMode('include')}
                      >
                        Include PPN
                      </Button>
                    </div>
                  </div>

                  {ppnMode === 'exclude' ? (
                    <>
                      <div className="flex justify-between items-center px-2">
                        <span className="font-medium">Subtotal</span>
                        <span className="text-lg font-semibold">{formatCurrencyLocal(subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center px-2">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">PPN</span>
                          <Input
                            type="number"
                            value={ppnPercentage}
                            onChange={(e) => setPpnPercentage(parseInt(e.target.value) || 0)}
                            className="w-16 h-8"
                            min={0}
                            max={100}
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                        <span className="text-muted-foreground">{formatCurrencyLocal(ppnAmount)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center px-2">
                        <span className="text-muted-foreground">Harga Sebelum PPN</span>
                        <span className="text-muted-foreground">{formatCurrencyLocal(subtotalBeforePPN)}</span>
                      </div>
                      <div className="flex justify-between items-center px-2">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">PPN</span>
                          <Input
                            type="number"
                            value={ppnPercentage}
                            onChange={(e) => setPpnPercentage(parseInt(e.target.value) || 0)}
                            className="w-16 h-8"
                            min={0}
                            max={100}
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                        <span className="text-muted-foreground">{formatCurrencyLocal(ppnAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center px-2">
                        <span className="font-medium">Total (Include PPN)</span>
                        <span className="text-lg font-semibold">{formatCurrencyLocal(subtotal)}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-between items-center px-2 pt-2 border-t">
                    <span className="font-bold">Grand Total</span>
                    <span className="text-xl font-bold text-primary">{formatCurrencyLocal(grandTotal)}</span>
                  </div>
                  <div className="px-2 pt-2">
                    <p className="text-sm text-muted-foreground italic">
                      Terbilang: {numberToWords(grandTotal)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle>Ketentuan & Garansi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Estimasi Waktu Pengerjaan</Label>
                <Input
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  placeholder="1–30 hari kalender"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ketentuan Pembayaran</Label>
                  <Button variant="ghost" size="sm" onClick={addPaymentTerm}>
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah
                  </Button>
                </div>
                {paymentTerms.map((term, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={term}
                      onChange={(e) => updatePaymentTerm(index, e.target.value)}
                      placeholder="50% – Down Payment"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removePaymentTerm(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Section */}
        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ringkasan Penawaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">No. Quotation</p>
                <p className="font-medium">{quotationNumber}</p>
              </div>
              {projectName && (
                <div>
                  <p className="text-sm text-muted-foreground">Proyek</p>
                  <p className="font-medium">{projectName}</p>
                </div>
              )}
              {clientName && (
                <div>
                  <p className="text-sm text-muted-foreground">Klien</p>
                  <p className="font-medium">{clientName}</p>
                </div>
              )}

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal ({items.length} item)</span>
                  <span>{formatCurrencyLocal(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>PPN {ppnPercentage}%</span>
                  <span>{formatCurrencyLocal(ppnAmount)}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Grand Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrencyLocal(grandTotal)}
                  </span>
                </div>
              </div>

              {/* TTE Signer Selection */}
              <div className="border-t pt-4 space-y-2">
                <Label className="flex items-center gap-2">
                  <Stamp className="h-4 w-4" />
                  Penandatangan TTE
                </Label>
                <Select value={selectedTTESigner} onValueChange={setSelectedTTESigner}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih penandatangan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TTE_SIGNERS.map((signer) => (
                      <SelectItem key={signer.id} value={signer.id}>
                        {signer.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {selectedTTESigner === 'self' 
                    ? `TTE menggunakan data: ${userTTESettings?.signer_name || 'Nama belum diatur'}`
                    : `TTE: ${TTE_SIGNERS.find(s => s.id === selectedTTESigner)?.name || '-'}`
                  }
                </p>
              </div>

              <div className="space-y-2 pt-4">
                <Button className="w-full" variant="outline" onClick={handlePreview} disabled={loadingPreview}>
                  {loadingPreview ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                  {loadingPreview ? 'Memuat Preview...' : 'Preview PDF'}
                </Button>
                <Button className="w-full" onClick={handleDownloadPDF} disabled={loadingDownload}>
                  {loadingDownload ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  {loadingDownload ? 'Memuat...' : 'Download PDF'}
                </Button>
                <Button variant="outline" className="w-full" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Simpan Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PDF Preview Dialog */}
      <PDFPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        html={previewHtml}
        title="Preview Quotation"
        description={`${quotationNumber} - ${projectName}`}
      />

      {/* Add Client Dialog */}
      <AddClientDialog
        open={addClientOpen}
        onOpenChange={setAddClientOpen}
        onClientCreated={handleClientCreated}
      />

      {/* Product Selector Dialog */}
      <ProductSelectorDialog
        open={productSelectorOpen}
        onOpenChange={setProductSelectorOpen}
        onProductsSelected={addProductsFromCatalog}
      />
    </AppLayout>
  );
}
