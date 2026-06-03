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
import { generateQuotationPDF, numberToWords, type QuotationItem, type CompanyProfile, type TTESettings } from '@/lib/quotationPdfGenerator';
import { PDFPreviewDialog } from '@/components/PDFPreviewDialog';
import { AddClientDialog } from '@/components/clients/AddClientDialog';
import { useUserTTE } from '@/hooks/useUserTTE';
import { Plus, Trash2, FileText, Download, Save, Loader2, Calculator, Eye, Users, UserPlus, CalendarIcon } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

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
  const { fetchTTEForPDF } = useUserTTE();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = searchParams.get('edit');
  
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  
  // Basic Info
  const [quotationNumber, setQuotationNumber] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [quotationDate, setQuotationDate] = useState<Date>(new Date());
  
  // Items
  const [items, setItems] = useState<QuotationItem[]>([
    { item: 'Sistem Berbasis Web', quantity: 1, unit: 'Package', unitPrice: 0, total: 0 },
  ]);
  
  // Costs
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

  // Generate quotation number on mount or load edit data
  useEffect(() => {
    if (editId) {
      loadQuotationForEdit(editId);
    } else {
      const now = new Date();
      const month = now.toLocaleString('id-ID', { month: 'short' }).toUpperCase();
      const year = now.getFullYear();
      const random = Math.floor(Math.random() * 900) + 100;
      setQuotationNumber(`${random}/QUO-ZMI/${month}/${year}`);
    }
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
        
        // Set client info
        if (quotation.client_id) {
          setSelectedClientId(quotation.client_id);
        }
        if (quotation.clients) {
          const clientData = quotation.clients as { name: string; address: string | null };
          setClientName(clientData.name);
          setClientAddress(clientData.address || '');
        }

        // Set items from man_days
        const manDays = quotation.man_days as unknown as QuotationItem[];
        if (Array.isArray(manDays) && manDays.length > 0) {
          setItems(manDays);
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
    setItems([...items, { item: '', quantity: 1, unit: 'Package', unitPrice: 0, total: 0 }]);
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
  const ppnAmount = Math.round(subtotal * (ppnPercentage / 100));
  const grandTotal = subtotal + ppnAmount;

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

  // TTE settings now come from useUserTTE hook - fetchTTEForPDF()

  const buildQuotationData = () => {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    return {
      quotationNumber,
      quotationDate: new Date(),
      validUntil,
      clientName: clientName || 'Klien',
      clientAddress: clientAddress || '',
      projectName,
      projectDescription: projectDescription || undefined,
      items,
      subtotal,
      ppnPercentage,
      ppnAmount,
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
        client_id: selectedClientId || null,
        man_days: items as any,
        hosting_cost: 0,
        maintenance_cost: 0,
        maintenance_period: 'Tahunan',
        total_development: subtotal,
        grand_total: grandTotal,
        valid_until: validUntil.toISOString().split('T')[0],
        status: 'Draft',
      };

      if (editingQuotationId) {
        // Update existing
        const { error } = await supabase
          .from('quotations')
          .update(quotationData)
          .eq('id', editingQuotationId);

        if (error) throw error;

        toast({
          title: 'Berhasil',
          description: 'Quotation berhasil diupdate',
        });
      } else {
        // Insert new
        const { error } = await supabase.from('quotations').insert([quotationData]);

        if (error) throw error;

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

    const company = await getCompanyProfile();
    const tteSettings = await fetchTTEForPDF();
    const quotationData = buildQuotationData();
    const html = await generateQuotationPDF(quotationData, company, tteSettings);
    setPreviewHtml(html);
    setPreviewOpen(true);
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

    const company = await getCompanyProfile();
    const tteSettings = await fetchTTEForPDF();
    const quotationData = buildQuotationData();
    const html = await generateQuotationPDF(quotationData, company, tteSettings);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
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
                <Button onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Item
                </Button>
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
                  <div key={index} className="grid grid-cols-12 gap-3 items-center">
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
                ))}

                {/* Subtotal & PPN */}
                <div className="border-t pt-4 mt-4 space-y-2">
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

              <div className="space-y-2 pt-4">
                <Button className="w-full" variant="outline" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview PDF
                </Button>
                <Button className="w-full" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
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
    </AppLayout>
  );
}
