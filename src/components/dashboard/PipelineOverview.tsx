import { mockProjects } from '@/data/mockData';
import { formatCurrency } from '@/data/mockData';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const pipelineStages = [
  { name: 'Meeting', color: 'bg-muted' },
  { name: 'Proposal', color: 'bg-info/20' },
  { name: 'Negosiasi', color: 'bg-warning/20' },
  { name: 'Closing', color: 'bg-success/20' },
];

export function PipelineOverview() {
  const pipelineProjects = mockProjects.filter((p) => p.status === 'Pipeline');

  const stageData = pipelineStages.map((stage) => {
    const projects = pipelineProjects.filter((p) => p.pipelineStage === stage.name);
    const totalValue = projects.reduce((sum, p) => sum + p.totalValue, 0);
    return {
      ...stage,
      count: projects.length,
      value: totalValue,
      projects,
    };
  });

  const totalPipelineValue = pipelineProjects.reduce((sum, p) => sum + p.totalValue, 0);

  return (
    <div className="rounded-xl border bg-card shadow-card animate-fade-in">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Sales Pipeline</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Potensi</p>
          <p className="font-semibold text-primary">{formatCurrency(totalPipelineValue)}</p>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-4 gap-3">
          {stageData.map((stage, index) => (
            <div key={stage.name} className="relative">
              <div className={`rounded-lg p-4 ${stage.color}`}>
                <p className="text-xs font-medium text-muted-foreground mb-1">{stage.name}</p>
                <p className="text-2xl font-bold">{stage.count}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stage.value > 0 ? formatCurrency(stage.value) : '-'}
                </p>
              </div>
              {index < stageData.length - 1 && (
                <ArrowRight className="absolute -right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              )}
            </div>
          ))}
        </div>

        {pipelineProjects.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Prospek Aktif:</p>
            {pipelineProjects.slice(0, 3).map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
              >
                <div>
                  <p className="font-medium text-sm">{project.projectName}</p>
                  <p className="text-xs text-muted-foreground">{project.clientName}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{formatCurrency(project.totalValue)}</p>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    {project.pipelineStage}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
