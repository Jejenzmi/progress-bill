import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useUserTTE } from '@/hooks/useUserTTE';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { generateInvoicePDF, type CompanyProfile, type InvoiceItem, type TTESettings } from '@/lib/invoicePdfGenerator';
import { PDFPreviewDialog } from '@/components/PDFPreviewDialog';
import { Search, Filter, Download, Eye, Receipt, CheckCircle, Clock, AlertTriangle, FileText, Loader2, CreditCard, FileCheck, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreateInvoiceDialog } from '@/components/invoices/CreateInvoiceDialog';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';

const statusFilters = [
  { value: 'all', label: 'Semua Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Sent', label: 'Terkirim' },
  { value: 'Paid', label: 'Lunas' },
  { value: 'Overdue', label: 'Jatuh Tempo' },
];

const statusStyles: Record<string, { bg: string; text: string; icon: any }> = {
  Draft: { bg: 'bg-muted', text: 'text-muted-foreground', icon: Receipt },
  Sent: { bg: 'bg-info/10', text: 'text-info', icon: Clock },
  Paid: { bg: 'bg-success/10', text: 'text-success', icon: CheckCircle },
  Overdue: { bg: 'bg-destructive/10', text: 'text-destructive', icon: AlertTriangle },
};

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  amount: number;
  invoice_date: string;
  due_date: string;
  status: InvoiceStatus;
  term_id: string;
  term_name: string;
  percentage: number;
  project_id: string;
  project_name: string;
  client_name: string;
  client_address: string;
  tax_invoice_number: string | null;
  tax_invoice_issued: boolean;
  bank_account_id: string | null;
}

export default function Invoices() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const { fetchTTEForPDF } = useUserTTE();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  
  // PPN Dialog state
  const [ppnDialogOpen, setPpnDialogOpen] = useState(false);
  const [ppnMode, setPpnMode] = useState<'exclude' | 'include' | 'none'>('none');
  const [ppnPercentage, setPpnPercentage] = useState(11);
  const [pendingAction, setPendingAction] = useState<'preview' | 'download' | null>(null);
  const [pendingInvoice, setPendingInvoice] = useState<InvoiceData | null>(null);
  
  // PPh state
  const [showPph, setShowPph] = useState(false);
  const [pphPercentage, setPphPercentage] = useState(2);
  
  // Bank account state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  
  // Track if preferences loaded
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  
  // Tax invoice management
  const [taxInvoiceDialogOpen, setTaxInvoiceDialogOpen] = useState(false);
  const [taxInvoiceNumber, setTaxInvoiceNumber] = useState('');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  
  // Create invoice dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const canCreateInvoice = hasRole('admin') || hasRole('finance');

  useEffect(() => {
    fetchInvoices();
    loadTaxPreferences();
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setBankAccounts(data || []);
      
      // Set default bank account
      const defaultAccount = data?.find(acc => acc.is_default);
      if (defaultAccount) {
        setSelectedBankAccountId(defaultAccount.id);
      } else if (data && data.length > 0) {
        setSelectedBankAccountId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  // Load saved tax preferences from settings
  const loadTaxPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'invoice_settings')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        const value = data.value as Record<string, unknown>;
        if (value.ppn_mode) setPpnMode(value.ppn_mode as 'exclude' | 'include' | 'none');
        if (value.ppn_percentage !== undefined) setPpnPercentage(value.ppn_percentage as number);
        if (value.show_pph !== undefined) setShowPph(value.show_pph as boolean);
        if (value.pph_percentage !== undefined) setPphPercentage(value.pph_percentage as number);
      }
      setPreferencesLoaded(true);
    } catch (error) {
      console.error('Error loading tax preferences:', error);
      setPreferencesLoaded(true);
    }
  };

  // Save tax preferences to settings
  const saveTaxPreferences = async () => {
    try {
      // Get current invoice_settings first
      const { data: currentData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'invoice_settings')
        .maybeSingle();

      const currentValue = (currentData?.value as Record<string, unknown>) || {};
      
      // Merge with new tax preferences
      const updatedValue = {
        ...currentValue,
        ppn_mode: ppnMode,
        ppn_percentage: ppnPercentage,
        show_pph: showPph,
        pph_percentage: pphPercentage,
      };

      const { error } = await supabase
        .from('settings')
        .update({ value: updatedValue })
        .eq('key', 'invoice_settings');

      if (error) throw error;
    } catch (error) {
      console.error('Error saving tax preferences:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          amount,
          invoice_date,
          due_date,
          status,
          term_id,
          project_id,
          tax_invoice_number,
          tax_invoice_issued,
          bank_account_id,
          term:payment_terms!inner(
            term_name,
            percentage,
            project:projects!inner(
              project_name,
              client:clients!inner(name, address)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvoices(
        (data || []).map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          amount: Number(inv.amount),
          invoice_date: inv.invoice_date,
          due_date: inv.due_date,
          status: inv.status as InvoiceStatus,
          term_id: inv.term_id,
          term_name: (inv.term as any).term_name,
          percentage: Number((inv.term as any).percentage),
          project_id: inv.project_id,
          project_name: (inv.term as any).project.project_name,
          client_name: (inv.term as any).project.client.name,
          client_address: (inv.term as any).project.client.address || '',
          tax_invoice_number: inv.tax_invoice_number,
          tax_invoice_issued: inv.tax_invoice_issued || false,
          bank_account_id: inv.bank_account_id,
        }))
      );
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data invoice',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.client_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getCompanyProfile = async (bankAccountId?: string): Promise<CompanyProfile> => {
    const { data: companyData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'company_profile')
      .maybeSingle();

    const value = companyData?.value as Record<string, unknown> | null;
    
    // Get bank info from selected account
    let bankInfo = (value?.bank_info as string) || '-';
    if (bankAccountId) {
      const account = bankAccounts.find(acc => acc.id === bankAccountId);
      if (account) {
        bankInfo = `${account.bank_name}\nNo. Rekening: ${account.account_number}\nA.n. ${account.account_name}`;
      }
    }
    
    return {
      name: (value?.name as string) || 'PT. ZEN MULTIMEDIA INDONESIA',
      npwp: (value?.npwp as string) || '-',
      address: (value?.address as string) || 'Jl. Taman Pahlawan No.166, Purwamekar, Purwakarta, Jawa Barat - Indonesia',
      phone: (value?.phone as string) || '085121045798',
      email: (value?.email as string) || 'info@zenmultimedia.co.id',
      website: (value?.website as string) || 'www.zenmultimedia.co.id',
      bank_info: bankInfo,
      logo_url: (value?.logo_url as string) || undefined,
    };
  };

  // TTE settings now come from useUserTTE hook - fetchTTEForPDF()

  const buildInvoicePDFData = (
    invoice: InvoiceData, 
    mode: 'exclude' | 'include' | 'none', 
    ppn: number,
    includePph: boolean,
    pphRate: number
  ) => {
    const baseAmount = invoice.amount;
    let subtotal: number;
    let ppnAmount: number;
    let grandTotal: number;
    let pphAmount = 0;

    if (mode === 'exclude') {
      // PPN ditambahkan di atas harga
      subtotal = baseAmount;
      ppnAmount = Math.round(baseAmount * (ppn / 100));
      grandTotal = subtotal + ppnAmount;
    } else if (mode === 'include') {
      // Harga sudah termasuk PPN, ekstrak PPN
      grandTotal = baseAmount;
      subtotal = Math.round(baseAmount / (1 + ppn / 100));
      ppnAmount = grandTotal - subtotal;
    } else {
      // Tanpa PPN
      subtotal = baseAmount;
      ppnAmount = 0;
      grandTotal = baseAmount;
    }

    // Calculate PPh if enabled
    if (includePph) {
      pphAmount = Math.round(subtotal * (pphRate / 100));
      grandTotal = grandTotal - pphAmount;
    }

    const items: InvoiceItem[] = [{
      description: `${invoice.project_name} - ${invoice.term_name} (${invoice.percentage}%)`,
      quantity: 1,
      unit: 'Paket',
      unitPrice: mode === 'include' ? subtotal : baseAmount,
      total: mode === 'include' ? subtotal : baseAmount,
    }];

    return {
      invoiceNumber: invoice.invoice_number,
      invoiceDate: new Date(invoice.invoice_date),
      dueDate: new Date(invoice.due_date),
      clientName: invoice.client_name,
      clientAddress: invoice.client_address,
      projectName: invoice.project_name,
      termName: invoice.term_name,
      items,
      subtotal,
      ppnPercentage: mode === 'none' ? 0 : ppn,
      ppnAmount,
      pphPercentage: includePph ? pphRate : 0,
      pphAmount,
      grandTotal,
    };
  };

  // Open PPN dialog before preview/download
  const openPpnDialog = (invoice: InvoiceData, action: 'preview' | 'download') => {
    setPendingInvoice(invoice);
    setPendingAction(action);
    setPpnDialogOpen(true);
  };

  const handlePpnConfirm = async () => {
    if (!pendingInvoice || !pendingAction) return;
    
    setPpnDialogOpen(false);
    
    // Save preferences to database
    await saveTaxPreferences();
    
    const company = await getCompanyProfile(selectedBankAccountId);
    const tteSettings = await fetchTTEForPDF();
    const invoiceData = buildInvoicePDFData(pendingInvoice, ppnMode, ppnPercentage, showPph, pphPercentage);
    
    // Add tax invoice number if issued
    if (pendingInvoice.tax_invoice_number) {
      (invoiceData as any).taxInvoiceNumber = pendingInvoice.tax_invoice_number;
    }
    
    const html = await generateInvoicePDF(invoiceData, company, tteSettings);
    
    if (pendingAction === 'preview') {
      setPreviewHtml(html);
      setPreviewOpen(true);
    } else {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
      }
    }
    
    setPendingInvoice(null);
    setPendingAction(null);
  };

  const handlePreviewPDF = (invoice: InvoiceData) => {
    // Set selected bank account from invoice if exists
    if (invoice.bank_account_id) {
      setSelectedBankAccountId(invoice.bank_account_id);
    }
    openPpnDialog(invoice, 'preview');
  };

  const handleDownloadPDF = (invoice: InvoiceData) => {
    // Set selected bank account from invoice if exists
    if (invoice.bank_account_id) {
      setSelectedBankAccountId(invoice.bank_account_id);
    }
    openPpnDialog(invoice, 'download');
  };

  // Handle tax invoice management
  const openTaxInvoiceDialog = (invoice: InvoiceData) => {
    setEditingInvoiceId(invoice.id);
    setTaxInvoiceNumber(invoice.tax_invoice_number || '');
    setTaxInvoiceDialogOpen(true);
  };

  const handleSaveTaxInvoice = async () => {
    if (!editingInvoiceId) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          tax_invoice_number: taxInvoiceNumber || null,
          tax_invoice_issued: !!taxInvoiceNumber,
        })
        .eq('id', editingInvoiceId);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: taxInvoiceNumber 
          ? 'Nomor Faktur Pajak berhasil disimpan' 
          : 'Status Faktur Pajak dihapus',
      });

      setTaxInvoiceDialogOpen(false);
      setEditingInvoiceId(null);
      setTaxInvoiceNumber('');
      fetchInvoices();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, newStatus: InvoiceStatus) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'Paid') {
        updates.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: `Status invoice diubah ke ${newStatus}`,
      });

      fetchInvoices();
      setSelectedInvoice(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Stats
  const totalPaid = invoices
    .filter((i) => i.status === 'Paid')
    .reduce((sum, i) => sum + i.amount, 0);
  const totalPending = invoices
    .filter((i) => i.status === 'Sent')
    .reduce((sum, i) => sum + i.amount, 0);
  const totalDraft = invoices
    .filter((i) => i.status === 'Draft')
    .reduce((sum, i) => sum + i.amount, 0);

  const canManage = hasRole('admin') || hasRole('finance');

  if (loading) {
    return (
      <AppLayout title="Invoice" subtitle="Memuat data...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Invoice" subtitle="Kelola invoice dan tagihan klien">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Total Invoice</p>
          <p className="text-2xl font-bold mt-1">{invoices.length}</p>
        </div>
        <div className="rounded-xl border bg-success/5 border-success/20 p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Terbayar</p>
          <p className="text-2xl font-bold text-success mt-1">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border bg-info/5 border-info/20 p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-info mt-1">{formatCurrency(totalPending)}</p>
        </div>
        <div className="rounded-xl border bg-muted p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Draft</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalDraft)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nomor invoice, proyek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-3">
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              {statusFilters.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canCreateInvoice && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Buat Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Table */}
      <div className="rounded-xl border bg-card shadow-card">
        {invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Belum ada invoice</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Invoice</TableHead>
                <TableHead>Proyek / Klien</TableHead>
                <TableHead>Termin</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Nilai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Faktur Pajak</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => {
                const StatusIcon = statusStyles[invoice.status].icon;
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{invoice.project_name}</p>
                        <p className="text-xs text-muted-foreground">{invoice.client_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{invoice.term_name}</p>
                        <p className="text-xs text-muted-foreground">{invoice.percentage}%</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(invoice.invoice_date)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(invoice.amount)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'status-badge flex items-center gap-1',
                          statusStyles[invoice.status].bg,
                          statusStyles[invoice.status].text
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {invoice.status === 'Paid'
                          ? 'Lunas'
                          : invoice.status === 'Sent'
                          ? 'Terkirim'
                          : invoice.status === 'Overdue'
                          ? 'Jatuh Tempo'
                          : 'Draft'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {invoice.tax_invoice_issued ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 text-success hover:text-success"
                          onClick={() => canManage && openTaxInvoiceDialog(invoice)}
                          title={invoice.tax_invoice_number || 'Sudah terbit'}
                        >
                          <FileCheck className="h-4 w-4 mr-1" />
                          <span className="text-xs font-mono">{invoice.tax_invoice_number || 'Terbit'}</span>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 text-muted-foreground hover:text-foreground"
                          onClick={() => canManage && openTaxInvoiceDialog(invoice)}
                          disabled={!canManage}
                          title="Belum terbit Faktur Pajak"
                        >
                          <span className="text-xs">Belum Terbit</span>
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePreviewPDF(invoice)}
                          title="Preview PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownloadPDF(invoice)}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedInvoice(invoice)}
                          title="Detail Invoice"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent>
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedInvoice.invoice_number}</DialogTitle>
                <DialogDescription>
                  {selectedInvoice.project_name} - {selectedInvoice.client_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Nilai</p>
                    <p className="text-lg font-bold">{formatCurrency(selectedInvoice.amount)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-lg font-bold capitalize">{selectedInvoice.status}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Tanggal Invoice</p>
                    <p className="font-medium">{formatDate(selectedInvoice.invoice_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Jatuh Tempo</p>
                    <p className="font-medium">{formatDate(selectedInvoice.due_date)}</p>
                  </div>
                </div>

                {canManage && (
                  <div className="flex gap-2 pt-4 border-t">
                    {selectedInvoice.status === 'Draft' && (
                      <Button onClick={() => updateInvoiceStatus(selectedInvoice.id, 'Sent')} className="flex-1">
                        Kirim Invoice
                      </Button>
                    )}
                    {selectedInvoice.status === 'Sent' && (
                      <Button onClick={() => updateInvoiceStatus(selectedInvoice.id, 'Paid')} className="flex-1" variant="default">
                        Tandai Lunas
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => handleDownloadPDF(selectedInvoice)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <PDFPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        html={previewHtml}
        title="Preview Invoice"
        description="Preview invoice sebelum download atau cetak"
      />

      {/* PPN Selection Dialog */}
      <Dialog open={ppnDialogOpen} onOpenChange={setPpnDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pengaturan Invoice PDF</DialogTitle>
            <DialogDescription>
              Pilih rekening bank dan mode perhitungan pajak untuk invoice ini
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Bank Account Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Rekening Bank
              </Label>
              <Select
                value={selectedBankAccountId}
                onValueChange={setSelectedBankAccountId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih rekening bank" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <span>{account.bank_name} - {account.account_number}</span>
                        {account.is_default && (
                          <span className="text-xs text-muted-foreground">(Default)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {bankAccounts.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Belum ada rekening bank. Tambahkan di menu Pengaturan.
                </p>
              )}
            </div>

            <div className="border-t pt-4">
              <Label className="mb-2 block">Mode Perhitungan PPN</Label>
              <RadioGroup
                value={ppnMode}
                onValueChange={(value) => setPpnMode(value as 'exclude' | 'include' | 'none')}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="none" id="ppn-none" />
                  <Label htmlFor="ppn-none" className="flex-1 cursor-pointer">
                    <div className="font-medium">Tanpa PPN</div>
                    <div className="text-sm text-muted-foreground">
                      Nilai invoice tanpa perhitungan pajak
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="exclude" id="ppn-exclude" />
                  <Label htmlFor="ppn-exclude" className="flex-1 cursor-pointer">
                    <div className="font-medium">Exclude PPN (+ 11%)</div>
                    <div className="text-sm text-muted-foreground">
                      PPN ditambahkan di atas nilai invoice
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="include" id="ppn-include" />
                  <Label htmlFor="ppn-include" className="flex-1 cursor-pointer">
                    <div className="font-medium">Include PPN (11%)</div>
                    <div className="text-sm text-muted-foreground">
                      Nilai sudah termasuk PPN, akan diekstrak
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {ppnMode !== 'none' && (
              <div className="flex items-center gap-3 pt-2 border-t">
                <Label htmlFor="ppn-rate" className="text-sm">Persentase PPN:</Label>
                <Input
                  id="ppn-rate"
                  type="number"
                  value={ppnPercentage}
                  onChange={(e) => setPpnPercentage(parseInt(e.target.value) || 0)}
                  className="w-20"
                  min={0}
                  max={100}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            )}

            {/* PPh Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium">PPh (Pajak Penghasilan)</p>
                  <p className="text-sm text-muted-foreground">
                    Potongan pajak penghasilan dari nilai invoice
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="show-pph"
                    checked={showPph}
                    onChange={(e) => setShowPph(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <Label htmlFor="show-pph" className="cursor-pointer">Tampilkan PPh</Label>
                </div>
              </div>
              
              {showPph && (
                <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
                  <Label htmlFor="pph-rate" className="text-sm">Persentase PPh:</Label>
                  <Input
                    id="pph-rate"
                    type="number"
                    value={pphPercentage}
                    onChange={(e) => setPphPercentage(parseInt(e.target.value) || 0)}
                    className="w-20"
                    min={0}
                    max={100}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setPpnDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handlePpnConfirm}>
              {pendingAction === 'preview' ? 'Preview PDF' : 'Download PDF'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tax Invoice Dialog */}
      <Dialog open={taxInvoiceDialogOpen} onOpenChange={setTaxInvoiceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Faktur Pajak</DialogTitle>
            <DialogDescription>
              Masukkan nomor Faktur Pajak jika sudah diterbitkan
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tax-invoice-number">Nomor Faktur Pajak</Label>
              <Input
                id="tax-invoice-number"
                value={taxInvoiceNumber}
                onChange={(e) => setTaxInvoiceNumber(e.target.value)}
                placeholder="Contoh: 010.000-24.12345678"
              />
              <p className="text-xs text-muted-foreground">
                Kosongkan jika belum terbit Faktur Pajak
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setTaxInvoiceDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveTaxInvoice}>
              {taxInvoiceNumber ? 'Simpan Nomor' : 'Hapus Status'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchInvoices}
      />
    </AppLayout>
  );
}
