import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { TermStatusCard } from '@/components/dashboard/TermStatusCard';
import { mockProjects, mockPaymentTerms, formatCurrency } from '@/data/mockData';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Search, Filter, X } from 'lucide-react';
import { Project, ProjectStatus } from '@/types';
import { cn } from '@/lib/utils';

const statusFilters: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Status' },
  { value: 'Pipeline', label: 'Pipeline' },
  { value: 'Won', label: 'Berjalan' },
  { value: 'Completed', label: 'Selesai' },
  { value: 'Lost', label: 'Batal' },
];

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const filteredProjects = mockProjects.filter((project) => {
    const matchesSearch =
      project.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const projectTerms = selectedProject
    ? mockPaymentTerms.filter((t) => t.projectId === selectedProject.id)
    : [];

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
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Proyek Baru
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statusFilters.slice(1).map((status) => {
          const count = mockProjects.filter((p) => p.status === status.value).length;
          const value = mockProjects
            .filter((p) => p.status === status.value)
            .reduce((sum, p) => sum + p.totalValue, 0);
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
              <p className="text-2xl font-bold mt-1">{count}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(value)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => setSelectedProject(project)}
          />
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Tidak ada proyek ditemukan</p>
        </div>
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
                      {selectedProject.projectName}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedProject.clientName}
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
                      {formatCurrency(selectedProject.totalValue)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-lg font-bold capitalize">
                      {selectedProject.status}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Total Termin</p>
                    <p className="text-lg font-bold">{projectTerms.length}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Terbayar</p>
                    <p className="text-lg font-bold text-success">
                      {formatCurrency(
                        projectTerms
                          .filter((t) => t.invoice?.status === 'Paid')
                          .reduce((sum, t) => sum + t.amount, 0)
                      )}
                    </p>
                  </div>
                </div>

                {/* Payment Terms */}
                <div>
                  <h3 className="font-semibold mb-3">Termin Pembayaran</h3>
                  {projectTerms.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projectTerms.map((term) => (
                        <TermStatusCard
                          key={term.id}
                          term={term}
                          projectName={selectedProject.projectName}
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
    </AppLayout>
  );
}
