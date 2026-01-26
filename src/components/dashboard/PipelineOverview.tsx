import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, ArrowRight, Loader2 } from 'lucide-react';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface PipelineProject {
  id: string;
  project_name: string;
  client_name: string;
  total_value: number;
  pipeline_stage: string;
}

const pipelineStages = [
  { name: 'Meeting', color: 'bg-muted' },
  { name: 'Proposal', color: 'bg-info/20' },
  { name: 'Negosiasi', color: 'bg-warning/20' },
  { name: 'Closing', color: 'bg-success/20' },
];

export function PipelineOverview() {
  const [projects, setProjects] = useState<PipelineProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPipelineProjects();
  }, []);

  const fetchPipelineProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          project_name,
          total_value,
          pipeline_stage,
          client:clients!inner(name)
        `)
        .eq('status', 'Pipeline');

      if (error) throw error;

      setProjects(
        (data || []).map((p) => ({
          id: p.id,
          project_name: p.project_name,
          client_name: (p.client as any).name,
          total_value: Number(p.total_value),
          pipeline_stage: p.pipeline_stage || 'Meeting',
        }))
      );
    } catch (error) {
      console.error('Error fetching pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProjectsByStage = (stage: string) =>
    projects.filter((p) => p.pipeline_stage === stage);

  const totalPipelineValue = projects.reduce((sum, p) => sum + p.total_value, 0);

  const stageData = pipelineStages.map((stage) => {
    const stageProjects = getProjectsByStage(stage.name);
    const totalValue = stageProjects.reduce((sum, p) => sum + p.total_value, 0);
    return {
      ...stage,
      count: stageProjects.length,
      value: totalValue,
      projects: stageProjects,
    };
  });

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

        {projects.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Prospek Aktif:</p>
            {projects.slice(0, 3).map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
              >
                <div>
                  <p className="font-medium text-sm">{project.project_name}</p>
                  <p className="text-xs text-muted-foreground">{project.client_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{formatCurrency(project.total_value)}</p>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    {project.pipeline_stage}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {projects.length === 0 && (
          <div className="mt-4 text-center text-muted-foreground py-4">
            <p>Belum ada prospek di pipeline</p>
          </div>
        )}
      </div>
    </div>
  );
}
