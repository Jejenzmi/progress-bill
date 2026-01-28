import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calculator, TrendingUp, Users, DollarSign } from 'lucide-react';
import { TeamBonusCalculator } from '@/components/projects/TeamBonusCalculator';

interface ProjectOption {
  id: string;
  project_name: string;
  total_value: number;
  margin_percentage: number | null;
  status: string;
  client_name: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function TeamBonus() {
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId);
      setSelectedProject(project || null);
    } else {
      setSelectedProject(null);
    }
  }, [selectedProjectId, projects]);

  const fetchProjects = async () => {
    try {
      // Fetch won/completed projects with their quotation margin
      const { data: projectsData } = await supabase
        .from('projects')
        .select(`
          id,
          project_name,
          total_value,
          status,
          quotation_id,
          clients(name)
        `)
        .in('status', ['Won', 'Completed'])
        .order('created_at', { ascending: false });

      if (projectsData) {
        // Get margin from quotations
        const projectIds = projectsData.map(p => p.quotation_id).filter(Boolean);
        const { data: quotationsData } = await supabase
          .from('quotations')
          .select('id, margin_percentage')
          .in('id', projectIds);

        const marginMap = new Map(quotationsData?.map(q => [q.id, q.margin_percentage]) || []);

        const projectsWithMargin: ProjectOption[] = projectsData.map(p => ({
          id: p.id,
          project_name: p.project_name,
          total_value: p.total_value,
          margin_percentage: marginMap.get(p.quotation_id || '') || null,
          status: p.status,
          client_name: (p.clients as any)?.name || 'N/A',
        }));

        setProjects(projectsWithMargin);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMarginAmount = (): number => {
    if (!selectedProject) return 0;
    const marginPercentage = selectedProject.margin_percentage || 20; // Default 20%
    return Math.round(selectedProject.total_value * (marginPercentage / (100 + marginPercentage)));
  };

  if (loading) {
    return (
      <AppLayout title="Kalkulator Bonus Tim" subtitle="Memuat...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Kalkulator Bonus Tim Produksi" 
      subtitle="Hitung dan distribusikan bonus berdasarkan kontribusi tim"
    >
      <div className="space-y-6">
        {/* Project Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Pilih Project
            </CardTitle>
            <CardDescription>
              Pilih project yang sudah Won atau Completed untuk menghitung bonus tim
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name} - {project.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProject && (
                <div className="flex items-center gap-4">
                  <Badge variant={selectedProject.status === 'Won' ? 'default' : 'secondary'}>
                    {selectedProject.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Nilai: {formatCurrency(selectedProject.total_value)}
                  </span>
                  {selectedProject.margin_percentage && (
                    <span className="text-sm text-muted-foreground">
                      Margin: {selectedProject.margin_percentage}%
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {selectedProject && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nilai Project</p>
                    <p className="text-lg font-semibold">{formatCurrency(selectedProject.total_value)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent rounded-lg">
                    <TrendingUp className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Margin (%)</p>
                    <p className="text-lg font-semibold">{selectedProject.margin_percentage || 20}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-lg">
                    <Calculator className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estimasi Margin</p>
                    <p className="text-lg font-semibold">{formatCurrency(calculateMarginAmount())}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge>{selectedProject.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Team Bonus Calculator */}
        {selectedProject && (
          <TeamBonusCalculator
            projectId={selectedProject.id}
            marginAmount={calculateMarginAmount()}
          />
        )}

        {!selectedProject && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Pilih project terlebih dahulu untuk menghitung bonus tim</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
