import { Invoice } from '@/types';
import { formatCurrency, formatShortDate, mockPaymentTerms, mockProjects } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { FileText, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const statusStyles = {
  Draft: 'bg-muted text-muted-foreground',
  Sent: 'bg-info/10 text-info',
  Paid: 'bg-success/10 text-success',
  Overdue: 'bg-destructive/10 text-destructive',
};

const statusLabels = {
  Draft: 'Draft',
  Sent: 'Terkirim',
  Paid: 'Lunas',
  Overdue: 'Jatuh Tempo',
};

export function RecentInvoices() {
  // Get all invoices from terms
  const invoices = mockPaymentTerms
    .filter((t) => t.invoice)
    .map((t) => {
      const project = mockProjects.find((p) => p.id === t.projectId);
      return {
        ...t.invoice!,
        termName: t.termName,
        projectName: project?.projectName || '',
        clientName: project?.clientName || '',
      };
    })
    .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
    .slice(0, 5);

  return (
    <div className="rounded-xl border bg-card shadow-card animate-fade-in">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Invoice Terbaru</h3>
        </div>
        <Button variant="ghost" size="sm">
          Lihat Semua
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No. Invoice</TableHead>
            <TableHead>Proyek</TableHead>
            <TableHead>Termin</TableHead>
            <TableHead className="text-right">Nilai</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{invoice.projectName}</p>
                  <p className="text-xs text-muted-foreground">{invoice.clientName}</p>
                </div>
              </TableCell>
              <TableCell className="text-sm">{invoice.termName}</TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(invoice.amount)}
              </TableCell>
              <TableCell>
                <span className={cn('status-badge', statusStyles[invoice.status])}>
                  {statusLabels[invoice.status]}
                </span>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
