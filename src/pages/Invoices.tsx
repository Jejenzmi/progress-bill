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
import { Search, Filter, Download, Eye, Receipt, CheckCircle, Clock, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    fetchInvoices();
  }, []);

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

  const buildInvoicePDFData = (invoice: InvoiceData) => {
    const items: InvoiceItem[] = [{
      description: `${invoice.project_name} - ${invoice.term_name} (${invoice.percentage}%)`,
      quantity: 1,
      unit: 'Paket',
      unitPrice: invoice.amount,
      total: invoice.amount,
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
      subtotal: invoice.amount,
      ppnPercentage: 0,
      ppnAmount: 0,
      grandTotal: invoice.amount,
    };
  };

  const handlePreviewPDF = async (invoice: InvoiceData) => {
    const company = await getCompanyProfile();
    const tteSettings = await fetchTTEForPDF();
    const invoiceData = buildInvoicePDFData(invoice);
    const html = await generateInvoicePDF(invoiceData, company, tteSettings);
    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  const handleDownloadPDF = async (invoice: InvoiceData) => {
    const company = await getCompanyProfile();
    const tteSettings = await fetchTTEForPDF();
    const invoiceData = buildInvoicePDFData(invoice);
    const html = await generateInvoicePDF(invoiceData, company, tteSettings);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
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
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead className="text-right">Nilai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
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
                    <TableCell className="text-sm">
                      {formatDate(invoice.due_date)}
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
    </AppLayout>
  );
}
