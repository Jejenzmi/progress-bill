import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  ArrowRight,
  Calendar,
  Building2,
  GripVertical,
  TrendingUp,
  Loader2,
  FileCheck2,
  FileX2,
  Link2,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LinkQuotationDialog } from '@/components/projects/LinkQuotationDialog';

type PipelineStage = 'Meeting' | 'Proposal' | 'Negosiasi' | 'Closing';

interface PipelineProject {
  id: string;
  project_name: string;
  client_id: string;
  client_name: string;
  total_value: number;
  pipeline_stage: PipelineStage;
  probability: number;
  start_date: string;
  quotation_id: string | null;
}

const pipelineStages: { stage: PipelineStage; label: string; probability: number }[] = [
  { stage: 'Meeting', label: 'Meeting', probability: 10 },
  { stage: 'Proposal', label: 'Proposal', probability: 30 },
  { stage: 'Negosiasi', label: 'Negosiasi', probability: 60 },
  { stage: 'Closing', label: 'Closing', probability: 90 },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function PipelineKanban() {
  const { projects, loading, refetch } = useProjects();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedProject, setDraggedProject] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedProjectForLink, setSelectedProjectForLink] = useState<PipelineProject | null>(null);
  const [quotationFilter, setQuotationFilter] = useState<'all' | 'with' | 'without'>('all');

  // Filter pipeline projects
  const pipelineProjects: PipelineProject[] = projects
    .filter(p => p.status === 'Pipeline')
    .map(p => ({
      id: p.id,
      project_name: p.project_name,
      client_id: p.client_id,
      client_name: p.client?.name || 'Unknown',
      total_value: Number(p.total_value) || 0,
      pipeline_stage: (p.pipeline_stage as PipelineStage) || 'Meeting',
      probability: (p as any).probability || getDefaultProbability(p.pipeline_stage),
      start_date: p.start_date,
      quotation_id: p.quotation_id,
    }))
    .filter(p => 
      p.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(p => {
      if (quotationFilter === 'with') return p.quotation_id !== null;
      if (quotationFilter === 'without') return p.quotation_id === null;
      return true;
    });

  const getProjectsByStage = (stage: PipelineStage) =>
    pipelineProjects.filter(p => p.pipeline_stage === stage);

  const totalPipelineValue = pipelineProjects.reduce((sum, p) => sum + p.total_value, 0);
  const weightedPipelineValue = pipelineProjects.reduce(
    (sum, p) => sum + (p.total_value * p.probability / 100), 0
  );

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    setDraggedProject(projectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent, targetStage: PipelineStage) => {
    e.preventDefault();
    
    if (!draggedProject) return;
    
    const project = pipelineProjects.find(p => p.id === draggedProject);
    if (!project || project.pipeline_stage === targetStage) {
      setDraggedProject(null);
      return;
    }

    // Validate: Cannot move to Closing without quotation
    if (targetStage === 'Closing' && !project.quotation_id) {
      toast({
        title: 'Tidak Dapat Dipindahkan',
        description: 'Proyek harus memiliki Quotation yang terhubung untuk masuk ke tahap Closing',
        variant: 'destructive',
      });
      setDraggedProject(null);
      return;
    }

    setUpdating(true);
    try {
      const newProbability = getDefaultProbability(targetStage);
      
      const { error } = await supabase
        .from('projects')
        .update({ 
          pipeline_stage: targetStage,
          probability: newProbability,
        })
        .eq('id', draggedProject);

      if (error) throw error;
      
      toast({
        title: 'Pipeline Updated',
        description: `${project.project_name} dipindahkan ke ${targetStage}`,
      });
      
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
      setDraggedProject(null);
    }
  };

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('pipeline-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects' },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  if (loading) {
    return (
      <AppLayout title="Sales Pipeline" subtitle="Memuat data...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Sales Pipeline" subtitle="Drag & drop untuk memindahkan prospek antar stage">
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
        <Select value={quotationFilter} onValueChange={(v) => setQuotationFilter(v as 'all' | 'with' | 'without')}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter Quotation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Proyek</SelectItem>
            <SelectItem value="with">Dengan Quotation</SelectItem>
            <SelectItem value="without">Tanpa Quotation</SelectItem>
          </SelectContent>
        </Select>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Prospek
        </Button>
      </div>

      {/* Pipeline Stats */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Pipeline Value</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(totalPipelineValue)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Weighted Forecast</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(weightedPipelineValue)}</p>
            </div>
            <div className="flex items-center gap-6">
              {pipelineStages.map((stage) => {
                const stageProjects = getProjectsByStage(stage.stage);
                const value = stageProjects.reduce((sum, p) => sum + p.total_value, 0);
                return (
                  <div key={stage.stage} className="text-center">
                    <p className="text-xs text-muted-foreground">{stage.label}</p>
                    <p className="text-lg font-bold">{stageProjects.length}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(value)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {pipelineStages.map((stageInfo, index) => {
          const stageProjects = getProjectsByStage(stageInfo.stage);
          const stageValue = stageProjects.reduce((sum, p) => sum + p.total_value, 0);
          const isDropTarget = draggedProject !== null;

          return (
            <div 
              key={stageInfo.stage} 
              className="flex flex-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stageInfo.stage)}
            >
              {/* Stage Header */}
              <div className={cn(
                'rounded-t-lg p-3 transition-colors',
                stageInfo.stage === 'Meeting' && 'bg-muted',
                stageInfo.stage === 'Proposal' && 'bg-info/10',
                stageInfo.stage === 'Negosiasi' && 'bg-warning/10',
                stageInfo.stage === 'Closing' && 'bg-success/10',
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className={cn(
                      'font-semibold',
                      stageInfo.stage === 'Meeting' && 'text-muted-foreground',
                      stageInfo.stage === 'Proposal' && 'text-info',
                      stageInfo.stage === 'Negosiasi' && 'text-warning',
                      stageInfo.stage === 'Closing' && 'text-success',
                    )}>
                      {stageInfo.label}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {stageProjects.length}
                    </Badge>
                  </div>
                  {index < pipelineStages.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground hidden lg:block" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stageValue)}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {stageInfo.probability}% prob
                  </Badge>
                </div>
              </div>

              {/* Stage Cards */}
              <div className={cn(
                'flex-1 rounded-b-lg border border-t-0 p-2 min-h-[400px] space-y-2 transition-colors',
                isDropTarget && 'bg-primary/5 border-primary/30',
                !isDropTarget && 'bg-muted/30'
              )}>
                {stageProjects.map((project) => (
                  <div
                    key={project.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project.id)}
                    className={cn(
                      'rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing',
                      'hover:shadow-md transition-all',
                      draggedProject === project.id && 'opacity-50 scale-95'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-medium text-sm line-clamp-2">
                            {project.project_name}
                          </h4>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {project.quotation_id ? (
                                  <div className="flex-shrink-0">
                                    <FileCheck2 className="h-4 w-4 text-success" />
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProjectForLink(project);
                                      setLinkDialogOpen(true);
                                    }}
                                    className="flex-shrink-0 hover:scale-110 transition-transform"
                                  >
                                    <FileX2 className="h-4 w-4 text-warning" />
                                  </button>
                                )}
                              </TooltipTrigger>
                              <TooltipContent>
                                {project.quotation_id 
                                  ? 'Quotation terhubung' 
                                  : 'Belum ada quotation - Klik untuk menghubungkan'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        <div className="space-y-1 mt-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate">{project.client_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(project.start_date)}</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t flex items-center justify-between">
                          <p className="text-sm font-semibold text-primary">
                            {formatCurrency(project.total_value)}
                          </p>
                          <div className="flex items-center gap-2">
                            {!project.quotation_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProjectForLink(project);
                                  setLinkDialogOpen(true);
                                }}
                              >
                                <Link2 className="h-3 w-3 mr-1" />
                                Link
                              </Button>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <TrendingUp className="h-3 w-3" />
                              <span>{project.probability}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {stageProjects.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p className="text-sm">Drop di sini</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading overlay when updating */}
      {updating && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <div className="bg-card p-4 rounded-lg shadow-lg flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Memperbarui pipeline...</span>
          </div>
        </div>
      )}

      {/* Link Quotation Dialog */}
      {selectedProjectForLink && (
        <LinkQuotationDialog
          projectId={selectedProjectForLink.id}
          projectName={selectedProjectForLink.project_name}
          clientId={selectedProjectForLink.client_id}
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          onSuccess={refetch}
        />
      )}
    </AppLayout>
  );
}

function getDefaultProbability(stage: string | null): number {
  switch (stage) {
    case 'Meeting': return 10;
    case 'Proposal': return 30;
    case 'Negosiasi': return 60;
    case 'Closing': return 90;
    default: return 0;
  }
}
