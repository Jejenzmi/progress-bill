import { PaymentTerm } from '@/types';
import { formatCurrency, formatShortDate } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Lock, Unlock, FileCheck, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TermStatusCardProps {
  term: PaymentTerm;
  projectName: string;
  onUploadEvidence?: () => void;
  onGenerateInvoice?: () => void;
}

export function TermStatusCard({ term, projectName, onUploadEvidence, onGenerateInvoice }: TermStatusCardProps) {
  const hasRequiredEvidence = term.evidences.length > 0;
  const canGenerateInvoice = !term.isLocked && hasRequiredEvidence && !term.invoice;
  const invoiceStatus = term.invoice?.status;

  const getStatusIcon = () => {
    if (term.isLocked) return <Lock className="h-4 w-4" />;
    if (!hasRequiredEvidence) return <AlertCircle className="h-4 w-4" />;
    if (invoiceStatus === 'Paid') return <FileCheck className="h-4 w-4" />;
    if (invoiceStatus === 'Sent') return <Clock className="h-4 w-4" />;
    return <Unlock className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (term.isLocked) return 'Terkunci';
    if (!hasRequiredEvidence) return 'Butuh Dokumen';
    if (invoiceStatus === 'Paid') return 'Lunas';
    if (invoiceStatus === 'Sent') return 'Terkirim';
    return 'Siap Invoice';
  };

  const getStatusStyle = () => {
    if (term.isLocked) return 'term-locked';
    if (!hasRequiredEvidence) return 'term-pending';
    if (invoiceStatus === 'Paid') return 'term-unlocked';
    if (invoiceStatus === 'Sent') return 'bg-info/10 text-info';
    return 'term-unlocked';
  };

  return (
    <div className="rounded-lg border bg-card p-4 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5 truncate">{projectName}</p>
          <h4 className="font-medium text-foreground">{term.termName}</h4>
        </div>
        <span className={cn('status-badge flex items-center gap-1', getStatusStyle())}>
          {getStatusIcon()}
          {getStatusText()}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Nilai</span>
          <span className="font-semibold">{formatCurrency(term.amount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Trigger</span>
          <span className="text-right text-xs max-w-[60%]">{term.triggerDescription}</span>
        </div>
        {term.dueDate && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Jatuh Tempo</span>
            <span>{formatShortDate(term.dueDate)}</span>
          </div>
        )}
      </div>

      {/* Document List */}
      {term.evidences.length > 0 && (
        <div className="mb-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Dokumen:</p>
          {term.evidences.map((evidence) => (
            <div key={evidence.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileCheck className="h-3 w-3 text-success" />
              <span className="truncate">{evidence.fileName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!term.isLocked && !hasRequiredEvidence && (
          <Button variant="outline" size="sm" className="flex-1" onClick={onUploadEvidence}>
            Upload Dokumen
          </Button>
        )}
        {canGenerateInvoice && (
          <Button size="sm" className="flex-1" onClick={onGenerateInvoice}>
            Buat Invoice
          </Button>
        )}
        {term.invoice && (
          <Button variant="outline" size="sm" className="flex-1">
            Lihat Invoice
          </Button>
        )}
      </div>
    </div>
  );
}
