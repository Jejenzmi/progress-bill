import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { mockPaymentTerms, mockProjects, formatCurrency, formatShortDate } from '@/data/mockData';
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
import { Search, Filter, Download, Eye, MoreHorizontal, Receipt, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { InvoiceStatus } from '@/types';
import { cn } from '@/lib/utils';

const statusFilters: { value: InvoiceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Sent', label: 'Terkirim' },
  { value: 'Paid', label: 'Lunas' },
  { value: 'Overdue', label: 'Jatuh Tempo' },
];

const statusStyles = {
  Draft: { bg: 'bg-muted', text: 'text-muted-foreground', icon: Receipt },
  Sent: { bg: 'bg-info/10', text: 'text-info', icon: Clock },
  Paid: { bg: 'bg-success/10', text: 'text-success', icon: CheckCircle },
  Overdue: { bg: 'bg-destructive/10', text: 'text-destructive', icon: AlertTriangle },
};

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');

  // Get all invoices with project info
  const invoices = mockPaymentTerms
    .filter((t) => t.invoice)
    .map((t) => {
      const project = mockProjects.find((p) => p.id === t.projectId);
      return {
        ...t.invoice!,
        termName: t.termName,
        percentage: t.percentage,
        projectName: project?.projectName || '',
        clientName: project?.clientName || '',
      };
    });

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          onValueChange={(value) => setStatusFilter(value as InvoiceStatus | 'all')}
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
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Invoice Table */}
      <div className="rounded-xl border bg-card shadow-card">
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
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{invoice.projectName}</p>
                      <p className="text-xs text-muted-foreground">{invoice.clientName}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{invoice.termName}</p>
                      <p className="text-xs text-muted-foreground">{invoice.percentage}%</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatShortDate(invoice.invoiceDate)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatShortDate(invoice.dueDate)}
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
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Tidak ada invoice ditemukan</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
