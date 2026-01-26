import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface CashflowMonth {
  key: string;
  label: string;
  month: number;
  year: number;
  paid: number;
  pending: number;
  expected: number;
  total: number;
  terms: Array<{
    id: string;
    term_name: string;
    project_name: string;
    amount: number;
    status: string;
  }>;
}

export default function Cashflow() {
  const [loading, setLoading] = useState(true);
  const [cashflowData, setCashflowData] = useState<CashflowMonth[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalExpected, setTotalExpected] = useState(0);

  useEffect(() => {
    fetchCashflowData();
  }, []);

  const fetchCashflowData = async () => {
    try {
      const now = new Date();
      const months: CashflowMonth[] = [];

      // Generate 6 months
      for (let i = -2; i <= 3; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
        months.push({
          key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
          label: date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
          month: date.getMonth(),
          year: date.getFullYear(),
          paid: 0,
          pending: 0,
          expected: 0,
          total: 0,
          terms: [],
        });
      }

      // Fetch payment terms with due dates
      const { data: terms, error } = await supabase
        .from('payment_terms')
        .select(`
          id,
          term_name,
          amount,
          due_date,
          is_locked,
          project:projects!inner(project_name)
        `)
        .not('due_date', 'is', null);

      if (error) throw error;

      // Fetch invoice statuses
      const { data: invoices } = await supabase
        .from('invoices')
        .select('term_id, status');

      const invoiceMap = new Map(invoices?.map((i) => [i.term_id, i.status]) || []);

      // Categorize terms into months
      for (const term of terms || []) {
        if (!term.due_date) continue;

        const dueDate = new Date(term.due_date);
        const monthIndex = months.findIndex(
          (m) => m.month === dueDate.getMonth() && m.year === dueDate.getFullYear()
        );

        if (monthIndex === -1) continue;

        const invoiceStatus = invoiceMap.get(term.id);
        const amount = Number(term.amount);

        const termData = {
          id: term.id,
          term_name: term.term_name,
          project_name: (term.project as any).project_name,
          amount,
          status: invoiceStatus || 'expected',
        };

        months[monthIndex].terms.push(termData);

        if (invoiceStatus === 'Paid') {
          months[monthIndex].paid += amount;
        } else if (invoiceStatus === 'Sent' || invoiceStatus === 'Overdue') {
          months[monthIndex].pending += amount;
        } else {
          months[monthIndex].expected += amount;
        }

        months[monthIndex].total = months[monthIndex].paid + months[monthIndex].pending + months[monthIndex].expected;
      }

      setCashflowData(months);
      setTotalPaid(months.reduce((sum, m) => sum + m.paid, 0));
      setTotalPending(months.reduce((sum, m) => sum + m.pending, 0));
      setTotalExpected(months.reduce((sum, m) => sum + m.expected, 0));
    } catch (error) {
      console.error('Error fetching cashflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();

  if (loading) {
    return (
      <AppLayout title="Cashflow" subtitle="Memuat data...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Cashflow" subtitle="Proyeksi arus kas berdasarkan jadwal termin">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sudah Masuk</p>
              <p className="text-xl font-bold text-success">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Menunggu Bayar</p>
              <p className="text-xl font-bold text-info">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Proyeksi</p>
              <p className="text-xl font-bold text-warning">{formatCurrency(totalExpected)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-primary/5 border-primary/20 p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Potensi</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(totalPaid + totalPending + totalExpected)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cashflow Calendar */}
      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Kalender Cashflow</h3>
        </div>

        <div className="grid grid-cols-6 divide-x">
          {cashflowData.map((month, index) => {
            const isCurrentMonth =
              month.month === now.getMonth() && month.year === now.getFullYear();
            return (
              <div
                key={month.key}
                className={cn(
                  'p-4',
                  isCurrentMonth ? 'bg-primary/5' : '',
                  index < 2 ? 'opacity-75' : ''
                )}
              >
                <div className="text-center mb-4">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isCurrentMonth ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {month.label}
                  </p>
                  {isCurrentMonth && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      Bulan Ini
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {month.paid > 0 && (
                    <div className="rounded-lg bg-success/10 p-2">
                      <p className="text-xs text-success font-medium">Masuk</p>
                      <p className="text-sm font-bold text-success">{formatCurrency(month.paid)}</p>
                    </div>
                  )}
                  {month.pending > 0 && (
                    <div className="rounded-lg bg-info/10 p-2">
                      <p className="text-xs text-info font-medium">Pending</p>
                      <p className="text-sm font-bold text-info">{formatCurrency(month.pending)}</p>
                    </div>
                  )}
                  {month.expected > 0 && (
                    <div className="rounded-lg bg-warning/10 p-2">
                      <p className="text-xs text-warning font-medium">Proyeksi</p>
                      <p className="text-sm font-bold text-warning">
                        {formatCurrency(month.expected)}
                      </p>
                    </div>
                  )}
                  {month.total === 0 && (
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <p className="text-xs text-muted-foreground">-</p>
                    </div>
                  )}
                </div>

                {/* Terms Detail */}
                {month.terms.length > 0 && (
                  <div className="mt-4 pt-3 border-t space-y-2">
                    {month.terms.slice(0, 3).map((term) => (
                      <div key={term.id} className="text-xs">
                        <p className="font-medium truncate">{term.project_name}</p>
                        <p className="text-muted-foreground">{term.term_name}</p>
                      </div>
                    ))}
                    {month.terms.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{month.terms.length - 3} lainnya
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-success" />
          <span className="text-sm text-muted-foreground">Sudah Dibayar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-info" />
          <span className="text-sm text-muted-foreground">Invoice Terkirim</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-warning" />
          <span className="text-sm text-muted-foreground">Proyeksi (Belum Invoice)</span>
        </div>
      </div>
    </AppLayout>
  );
}
