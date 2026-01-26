import { mockPaymentTerms, mockProjects, formatCurrency, formatShortDate } from '@/data/mockData';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function UpcomingTerms() {
  // Get unlocked terms that need action or have pending invoices
  const actionableTerms = mockPaymentTerms
    .filter((t) => {
      // Terms that need document upload
      if (!t.isLocked && t.evidences.length === 0) return true;
      // Terms with invoice sent but not paid
      if (t.invoice?.status === 'Sent') return true;
      return false;
    })
    .map((t) => {
      const project = mockProjects.find((p) => p.id === t.projectId);
      return {
        ...t,
        projectName: project?.projectName || '',
        clientName: project?.clientName || '',
      };
    })
    .slice(0, 5);

  const getActionType = (term: (typeof actionableTerms)[0]) => {
    if (!term.isLocked && term.evidences.length === 0) {
      return { type: 'upload', label: 'Upload Dokumen', icon: AlertTriangle, style: 'text-warning' };
    }
    if (term.invoice?.status === 'Sent') {
      return { type: 'followup', label: 'Follow-up Pembayaran', icon: Clock, style: 'text-info' };
    }
    return { type: 'done', label: 'Selesai', icon: CheckCircle, style: 'text-success' };
  };

  return (
    <div className="rounded-xl border bg-card shadow-card animate-fade-in">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Perlu Tindakan</h3>
        </div>
        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-warning/10 text-warning text-sm font-semibold">
          {actionableTerms.length}
        </span>
      </div>

      <div className="divide-y">
        {actionableTerms.length === 0 ? (
          <div className="p-5 text-center text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
            <p>Semua termin sudah ditangani</p>
          </div>
        ) : (
          actionableTerms.map((term) => {
            const action = getActionType(term);
            const Icon = action.icon;
            return (
              <div key={term.id} className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors">
                <div className={cn('mt-0.5', action.style)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{term.termName}</p>
                  <p className="text-xs text-muted-foreground truncate">{term.projectName}</p>
                  <p className="text-xs text-muted-foreground">{term.clientName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={cn('text-xs font-medium', action.style)}>{action.label}</span>
                    <span className="text-sm font-semibold">{formatCurrency(term.amount)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
