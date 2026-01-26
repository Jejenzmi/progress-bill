import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, MoreHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface InvoiceData {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  term_name: string;
  project_name: string;
  client_name: string;
}

const statusStyles: Record<string, string> = {
  Draft: 'bg-muted text-muted-foreground',
  Sent: 'bg-info/10 text-info',
  Paid: 'bg-success/10 text-success',
  Overdue: 'bg-destructive/10 text-destructive',
};

const statusLabels: Record<string, string> = {
  Draft: 'Draft',
  Sent: 'Terkirim',
  Paid: 'Lunas',
  Overdue: 'Jatuh Tempo',
};

export function RecentInvoices() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);

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
          status,
          term:payment_terms!inner(
            term_name,
            project:projects!inner(
              project_name,
              client:clients!inner(name)
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setInvoices(
        (data || []).map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          amount: Number(inv.amount),
          status: inv.status,
          term_name: (inv.term as any).term_name,
          project_name: (inv.term as any).project.project_name,
          client_name: (inv.term as any).project.client.name,
        }))
      );
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border bg-card shadow-card animate-fade-in">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

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

      {invoices.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2" />
          <p>Belum ada invoice</p>
        </div>
      ) : (
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
                <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{invoice.project_name}</p>
                    <p className="text-xs text-muted-foreground">{invoice.client_name}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{invoice.term_name}</TableCell>
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
      )}
    </div>
  );
}
