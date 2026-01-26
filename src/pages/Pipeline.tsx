import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { mockProjects, formatCurrency, formatShortDate } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, MoreHorizontal, ArrowRight, Calendar, Building2 } from 'lucide-react';
import { PipelineStage } from '@/types';
import { cn } from '@/lib/utils';

const pipelineStages: { stage: PipelineStage; label: string; color: string; bgColor: string }[] = [
  { stage: 'Meeting', label: 'Meeting', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  { stage: 'Proposal', label: 'Proposal', color: 'text-info', bgColor: 'bg-info/10' },
  { stage: 'Negosiasi', label: 'Negosiasi', color: 'text-warning', bgColor: 'bg-warning/10' },
  { stage: 'Closing', label: 'Closing', color: 'text-success', bgColor: 'bg-success/10' },
];

export default function Pipeline() {
  const [searchQuery, setSearchQuery] = useState('');

  const pipelineProjects = mockProjects.filter(
    (p) => p.status === 'Pipeline'
  );

  const getProjectsByStage = (stage: PipelineStage) =>
    pipelineProjects.filter((p) => p.pipelineStage === stage);

  const totalPipelineValue = pipelineProjects.reduce((sum, p) => sum + p.totalValue, 0);

  return (
    <AppLayout title="Sales Pipeline" subtitle="Tracking prospek dari Meeting hingga Closing">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari prospek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Prospek
        </Button>
      </div>

      {/* Pipeline Stats */}
      <div className="rounded-xl border bg-card p-5 shadow-card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Potensi Pipeline</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(totalPipelineValue)}</p>
          </div>
          <div className="flex items-center gap-6">
            {pipelineStages.map((stage) => {
              const projects = getProjectsByStage(stage.stage);
              const value = projects.reduce((sum, p) => sum + p.totalValue, 0);
              return (
                <div key={stage.stage} className="text-center">
                  <p className="text-xs text-muted-foreground">{stage.label}</p>
                  <p className="text-lg font-bold">{projects.length}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(value)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-4 gap-4">
        {pipelineStages.map((stageInfo, index) => {
          const projects = getProjectsByStage(stageInfo.stage);
          const stageValue = projects.reduce((sum, p) => sum + p.totalValue, 0);

          return (
            <div key={stageInfo.stage} className="flex flex-col">
              {/* Stage Header */}
              <div className={cn('rounded-t-lg p-3', stageInfo.bgColor)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className={cn('font-semibold', stageInfo.color)}>
                      {stageInfo.label}
                    </h3>
                    <span className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium',
                      stageInfo.bgColor,
                      stageInfo.color
                    )}>
                      {projects.length}
                    </span>
                  </div>
                  {index < pipelineStages.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(stageValue)}
                </p>
              </div>

              {/* Stage Cards */}
              <div className="flex-1 rounded-b-lg border border-t-0 bg-muted/30 p-2 min-h-[400px] space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-lg border bg-card p-3 shadow-card hover:shadow-card-hover transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm line-clamp-2">
                        {project.projectName}
                      </h4>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{project.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatShortDate(project.startDate)}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t">
                      <p className="text-sm font-semibold text-primary">
                        {formatCurrency(project.totalValue)}
                      </p>
                    </div>
                  </div>
                ))}

                {projects.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <p className="text-sm">Tidak ada prospek</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
