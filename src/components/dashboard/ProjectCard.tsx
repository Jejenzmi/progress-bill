import { Project } from '@/types';
import { formatCurrency, formatShortDate } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Calendar, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

const statusStyles = {
  Pipeline: 'status-pipeline',
  Won: 'status-won',
  Lost: 'status-lost',
  Completed: 'status-completed',
};

const statusLabels = {
  Pipeline: 'Pipeline',
  Won: 'Berjalan',
  Lost: 'Batal',
  Completed: 'Selesai',
};

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const paidTerms = project.terms.filter((t) => t.invoice?.status === 'Paid').length;
  const totalTerms = project.terms.length;
  const progress = totalTerms > 0 ? (paidTerms / totalTerms) * 100 : 0;

  const paidAmount = project.terms
    .filter((t) => t.invoice?.status === 'Paid')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="group rounded-xl border bg-card p-5 shadow-card transition-all hover:shadow-card-hover animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('status-badge', statusStyles[project.status])}>
              {statusLabels[project.status]}
            </span>
            {project.pipelineStage && (
              <span className="status-badge bg-muted text-muted-foreground">
                {project.pipelineStage}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-foreground truncate">{project.projectName}</h3>
          <p className="text-sm text-muted-foreground truncate">{project.clientName}</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatShortDate(project.startDate)}</span>
          {project.endDate && (
            <>
              <span>–</span>
              <span>{formatShortDate(project.endDate)}</span>
            </>
          )}
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">Nilai Proyek</span>
            <span className="font-semibold text-foreground">{formatCurrency(project.totalValue)}</span>
          </div>
          {project.status === 'Won' && totalTerms > 0 && (
            <>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Terbayar</span>
                <span className="font-medium text-success">{formatCurrency(paidAmount)}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress Pembayaran</span>
                  <span>{paidTerms}/{totalTerms} termin</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        className="w-full justify-between group-hover:bg-accent"
        onClick={onClick}
      >
        <span>Lihat Detail</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Button>
    </div>
  );
}
