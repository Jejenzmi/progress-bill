import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  DollarSign,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  Download,
  TrendingUp,
  FileWarning,
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface InvoiceWithDetails {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  status: string;
  paid_at: string | null;
  project: {
    project_name: string;
    client: {
      name: string;
      npwp_pribadi: string | null;
      npwp_badan: string | null;
    } | null;
  } | null;
  term: {
    term_name: string;
    evidences: {
      file_type: string;
    }[];
  } | null;
}

interface DashboardStats {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueCount: number;
  draftCount: number;
  pendingDocumentsCount: number;
}

export default function FinanceDashboard() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueCount: 0,
    draftCount: 0,
    pendingDocumentsCount: 0,
  });
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [exporting, setExporting] = useState(false);

  const canAccess = hasRole('admin') || hasRole('finance');

  useEffect(() => {
    if (canAccess) {
      fetchData();
    }
  }, [canAccess, yearFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch invoices with project and client details
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          project:projects(
            project_name,
            client:clients(name, npwp_pribadi, npwp_badan)
          ),
          term:payment_terms(
            term_name,
            evidences:term_evidences(file_type)
          )
        `)
        .gte('invoice_date', `${yearFilter}-01-01`)
        .lte('invoice_date', `${yearFilter}-12-31`)
        .order('invoice_date', { ascending: false });

      if (invoicesError) throw invoicesError;

      const typedInvoices = (invoicesData || []) as unknown as InvoiceWithDetails[];
      setInvoices(typedInvoices);

      // Calculate stats
      const totalAmount = typedInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
      const paidAmount = typedInvoices
        .filter((inv) => inv.status === 'Paid')
        .reduce((sum, inv) => sum + Number(inv.amount), 0);
      const pendingAmount = typedInvoices
        .filter((inv) => inv.status !== 'Paid')
        .reduce((sum, inv) => sum + Number(inv.amount), 0);
      const overdueCount = typedInvoices.filter((inv) => inv.status === 'Overdue').length;
      const draftCount = typedInvoices.filter((inv) => inv.status === 'Draft').length;

      // Count terms with pending documents
      const { count: pendingDocs } = await supabase
        .from('payment_terms')
        .select('*', { count: 'exact', head: true })
        .eq('is_locked', true);

      setStats({
        totalInvoices: typedInvoices.length,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueCount,
        draftCount,
        pendingDocumentsCount: pendingDocs || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      // Prepare data for export
      const exportData = invoices.map((inv, index) => {
        const dpp = Number(inv.amount);
        const ppn = dpp * 0.11;
        const pph = dpp * 0.02;
        const evidenceTypes = inv.term?.evidences?.map((e) => e.file_type).join(', ') || '';
        const client = inv.project?.client;
        const npwp = client?.npwp_badan || client?.npwp_pribadi || '';

        return {
          NO: index + 1,
          TGL: format(new Date(inv.invoice_date), 'd MMM yyyy', { locale: id }),
          'NO. INVOICE': inv.invoice_number,
          ITEM: `${inv.term?.term_name || ''}, ${inv.project?.project_name || ''}`,
          DPP: dpp,
          'PPN 11%': ppn,
          'PPh 2%': pph,
          KETERANGAN: inv.status === 'Paid' ? 'DPP + PAJAK dibayarkan' : inv.status,
          'SISA PEMBAYARAN': inv.status === 'Paid' ? 0 : dpp + ppn - pph,
          'NAMA KLIEN': client?.name || '',
          NPWP: npwp,
          'KELENGKAPAN DOKUMEN': evidenceTypes,
        };
      });

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws['!cols'] = [
        { wch: 5 },
        { wch: 12 },
        { wch: 20 },
        { wch: 50 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 25 },
        { wch: 15 },
        { wch: 40 },
        { wch: 25 },
        { wch: 30 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Invoice');

      // Download file
      XLSX.writeFile(wb, `Rekap_Invoice_${yearFilter}.xlsx`);
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return <Badge className="bg-green-100 text-green-800">Lunas</Badge>;
      case 'Sent':
        return <Badge className="bg-blue-100 text-blue-800">Terkirim</Badge>;
      case 'Overdue':
        return <Badge className="bg-red-100 text-red-800">Jatuh Tempo</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
    }
  };

  if (!canAccess) {
    return (
      <AppLayout title="Akses Ditolak" subtitle="">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-muted-foreground">Anda tidak memiliki akses ke halaman ini</p>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout title="Finance Dashboard" subtitle="Memuat data...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Finance Dashboard" subtitle="Ringkasan Invoice, Pembayaran & Dokumen">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between">
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Pilih Tahun" />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={exportToExcel} disabled={exporting}>
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export Rekap Excel
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoice</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terbayar</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(stats.paidAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter((i) => i.status === 'Paid').length} invoice
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Belum Dibayar</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(stats.pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.overdueCount} jatuh tempo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dokumen Pending</CardTitle>
            <FileWarning className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.pendingDocumentsCount}
            </div>
            <p className="text-xs text-muted-foreground">termin butuh dokumen</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoice Terbaru</CardTitle>
            <CardDescription>10 invoice terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoices.slice(0, 10).map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                  onClick={() => navigate('/invoices')}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {inv.project?.client?.name || 'Unknown'}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-sm">{formatCurrency(Number(inv.amount))}</p>
                    {getStatusBadge(inv.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Overdue Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Invoice Jatuh Tempo
            </CardTitle>
            <CardDescription>Perlu segera ditindaklanjuti</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.filter((i) => i.status === 'Overdue').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                <p>Tidak ada invoice jatuh tempo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices
                  .filter((i) => i.status === 'Overdue')
                  .slice(0, 10)
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          Jatuh tempo: {format(new Date(inv.due_date), 'd MMM yyyy', { locale: id })}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-sm text-destructive">
                          {formatCurrency(Number(inv.amount))}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Invoice Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Invoice {yearFilter}</CardTitle>
          <CardDescription>Semua invoice dalam periode ini</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Invoice</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Klien</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">DPP</TableHead>
                  <TableHead className="text-right">PPN 11%</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dokumen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Tidak ada invoice di tahun {yearFilter}
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => {
                    const dpp = Number(inv.amount);
                    const ppn = dpp * 0.11;
                    const evidenceCount = inv.term?.evidences?.length || 0;

                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                        <TableCell>
                          {format(new Date(inv.invoice_date), 'd MMM yyyy', { locale: id })}
                        </TableCell>
                        <TableCell>{inv.project?.client?.name || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {inv.term?.term_name}, {inv.project?.project_name}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(dpp)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(ppn)}</TableCell>
                        <TableCell>{getStatusBadge(inv.status)}</TableCell>
                        <TableCell>
                          {evidenceCount > 0 ? (
                            <Badge variant="outline" className="text-success border-success">
                              {evidenceCount} file
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-destructive border-destructive">
                              Belum ada
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
