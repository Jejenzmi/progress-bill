import { AppLayout } from '@/components/layout/AppLayout';
import { mockPaymentTerms, mockProjects, formatCurrency, formatShortDate } from '@/data/mockData';
import { Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Cashflow() {
  // Group invoices by month
  const now = new Date();
  const months = [];
  for (let i = -2; i <= 3; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      month: date.getMonth(),
      year: date.getFullYear(),
    });
  }

  const cashflowData = months.map((month) => {
    const termsInMonth = mockPaymentTerms.filter((term) => {
      if (!term.dueDate) return false;
      const dueDate = new Date(term.dueDate);
      return dueDate.getMonth() === month.month && dueDate.getFullYear() === month.year;
    });

    const paid = termsInMonth
      .filter((t) => t.invoice?.status === 'Paid')
      .reduce((sum, t) => sum + t.amount, 0);

    const pending = termsInMonth
      .filter((t) => t.invoice?.status === 'Sent')
      .reduce((sum, t) => sum + t.amount, 0);

    const expected = termsInMonth
      .filter((t) => !t.invoice || t.invoice.status === 'Draft')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      ...month,
      paid,
      pending,
      expected,
      total: paid + pending + expected,
      terms: termsInMonth,
    };
  });

  const totalPaid = cashflowData.reduce((sum, m) => sum + m.paid, 0);
  const totalPending = cashflowData.reduce((sum, m) => sum + m.pending, 0);
  const totalExpected = cashflowData.reduce((sum, m) => sum + m.expected, 0);

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
                    {month.terms.slice(0, 3).map((term) => {
                      const project = mockProjects.find((p) => p.id === term.projectId);
                      return (
                        <div key={term.id} className="text-xs">
                          <p className="font-medium truncate">{project?.projectName}</p>
                          <p className="text-muted-foreground">{term.termName}</p>
                        </div>
                      );
                    })}
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
