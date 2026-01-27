import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TermStatusCard } from '@/components/dashboard/TermStatusCard';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { useProjects, ProjectWithDetails } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Search, Filter, Loader2, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type ProjectStatus = Database['public']['Enums']['project_status'];

const statusFilters: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Status' },
  { value: 'Pipeline', label: 'Pipeline' },
  { value: 'Won', label: 'Berjalan' },
  { value: 'Completed', label: 'Selesai' },
  { value: 'Lost', label: 'Batal' },
];

const STATUS_COLORS: Record<ProjectStatus, string> = {
  Pipeline: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  Won: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function Projects() {
  const { hasRole } = useAuth();
  const { projects, loading, refetch } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [selectedProject, setSelectedProject] = useState<ProjectWithDetails | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const canCreateProject = hasRole('admin') || hasRole('marketing');

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusStats = (status: ProjectStatus) => {
    const statusProjects = projects.filter((p) => p.status === status);
    return {
      count: statusProjects.length,
      value: statusProjects.reduce((sum, p) => sum + Number(p.total_value), 0),
    };
  };

  return (
    <AppLayout title="Proyek" subtitle="Kelola semua proyek klien Anda">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari proyek atau klien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as ProjectStatus | 'all')}
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
          {canCreateProject && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Proyek Baru
            </Button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statusFilters.slice(1).map((status) => {
          const stats = getStatusStats(status.value as ProjectStatus);
          return (
            <button
              key={status.value}
              onClick={() => setStatusFilter(status.value as ProjectStatus)}
              className={cn(
                'rounded-lg border p-4 text-left transition-all hover:shadow-card-hover',
                statusFilter === status.value
                  ? 'border-primary bg-primary/5'
                  : 'bg-card'
              )}
            >
              <p className="text-sm text-muted-foreground">{status.label}</p>
              <p className="text-2xl font-bold mt-1">{stats.count}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(stats.value)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className="rounded-lg border bg-card p-4 cursor-pointer transition-all hover:shadow-card-hover hover:border-primary/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Briefcase className="h-4 w-4 text-primary" />
                    </div>
                    <Badge className={STATUS_COLORS[project.status]} variant="secondary">
                      {project.status}
                    </Badge>
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                  {project.project_name}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {project.client?.name || 'No client'}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Nilai</span>
                  <span className="font-semibold">{formatCurrency(Number(project.total_value))}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-muted-foreground">Termin</span>
                  <span>{project.payment_terms.length}</span>
                </div>
              </div>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Tidak ada proyek ditemukan</p>
            </div>
          )}
        </>
      )}

      {/* Project Detail Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-xl">
                      {selectedProject.project_name}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedProject.client?.name || 'No client'}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Project Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Nilai Proyek</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(Number(selectedProject.total_value))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={STATUS_COLORS[selectedProject.status]} variant="secondary">
                      {selectedProject.status}
                    </Badge>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Total Termin</p>
                    <p className="text-lg font-bold">{selectedProject.payment_terms.length}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Terbayar</p>
                    <p className="text-lg font-bold text-success">
                      {formatCurrency(
                        selectedProject.payment_terms
                          .filter((t) => t.invoice?.status === 'Paid')
                          .reduce((sum, t) => sum + Number(t.amount), 0)
                      )}
                    </p>
                  </div>
                </div>

                {/* Payment Terms */}
                <div>
                  <h3 className="font-semibold mb-3">Termin Pembayaran</h3>
                  {selectedProject.payment_terms.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedProject.payment_terms.map((term) => (
                        <TermStatusCard
                          key={term.id}
                          term={{
                            id: term.id,
                            projectId: term.project_id,
                            termName: term.term_name,
                            percentage: Number(term.percentage),
                            amount: Number(term.amount),
                            triggerCondition: term.trigger_condition,
                            triggerDescription: term.trigger_description || undefined,
                            isLocked: term.is_locked || false,
                            dueDate: term.due_date ? new Date(term.due_date) : undefined,
                            evidences: [],
                            invoice: term.invoice
                              ? {
                                  id: term.invoice.id,
                                  invoiceNumber: term.invoice.invoice_number,
                                  termId: term.invoice.term_id,
                                  projectId: term.invoice.project_id,
                                  amount: Number(term.invoice.amount),
                                  invoiceDate: new Date(term.invoice.invoice_date),
                                  dueDate: new Date(term.invoice.due_date),
                                  status: term.invoice.status,
                                  paidAt: term.invoice.paid_at
                                    ? new Date(term.invoice.paid_at)
                                    : undefined,
                                }
                              : undefined,
                          }}
                          projectName={selectedProject.project_name}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Belum ada termin pembayaran
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={refetch}
      />
    </AppLayout>
  );
}
