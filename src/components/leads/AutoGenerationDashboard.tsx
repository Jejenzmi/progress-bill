import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2,
  Zap,
  FolderKanban,
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  BarChart3,
  DollarSign,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface QuotationWithProject {
  id: string;
  project_name: string;
  grand_total: number;
  auto_create_project: boolean;
  lead_id: string | null;
  approval_status: string;
  approved_at: string | null;
  created_at: string;
  client_id: string | null;
  client?: { name: string } | null;
}

interface ProjectWithTerms {
  id: string;
  project_name: string;
  total_value: number;
  quotation_id: string | null;
  created_at: string;
  status: string;
  payment_terms?: {
    id: string;
    term_name: string;
    amount: number;
    percentage: number;
    is_locked: boolean;
  }[];
}

interface AutoGenerationStats {
  totalAutoQuotations: number;
  totalAutoProjects: number;
  totalAutoTerms: number;
  totalAutoValue: number;
  successRate: number;
  avgProjectValue: number;
  avgTermsPerProject: number;
  byMonth: { month: string; quotations: number; projects: number; value: number }[];
  recentAutoProjects: {
    id: string;
    name: string;
    value: number;
    termsCount: number;
    createdAt: string;
  }[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

export function AutoGenerationDashboard() {
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<QuotationWithProject[]>([]);
  const [projects, setProjects] = useState<ProjectWithTerms[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch quotations with auto_create_project flag
        const { data: quotationsData } = await supabase
          .from('quotations')
          .select('*, clients(name)')
          .eq('auto_create_project', true)
          .order('created_at', { ascending: false });

        // Fetch projects created from quotations with payment terms
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, project_name, total_value, quotation_id, created_at, status')
          .not('quotation_id', 'is', null)
          .order('created_at', { ascending: false });

        // Fetch payment terms for those projects
        if (projectsData && projectsData.length > 0) {
          const projectIds = projectsData.map(p => p.id);
          const { data: termsData } = await supabase
            .from('payment_terms')
            .select('id, project_id, term_name, amount, percentage, is_locked')
            .in('project_id', projectIds);

          // Attach terms to projects
          const projectsWithTerms = projectsData.map(project => ({
            ...project,
            payment_terms: termsData?.filter(t => t.project_id === project.id) || [],
          }));
          setProjects(projectsWithTerms);
        } else {
          setProjects([]);
        }

        setQuotations((quotationsData || []).map(q => ({
          ...q,
          client: q.clients,
        })));
      } catch (error) {
        console.error('Error fetching auto-generation data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = useMemo<AutoGenerationStats>(() => {
    const autoQuotations = quotations.filter(q => q.auto_create_project);
    const approvedAutoQuotations = autoQuotations.filter(q => q.approval_status === 'approved');
    const autoProjects = projects.filter(p => {
      const quotation = quotations.find(q => q.id === p.quotation_id);
      return quotation?.auto_create_project;
    });

    const totalAutoTerms = autoProjects.reduce((sum, p) => sum + (p.payment_terms?.length || 0), 0);
    const totalAutoValue = autoProjects.reduce((sum, p) => sum + (p.total_value || 0), 0);
    
    const successRate = autoQuotations.length > 0
      ? (approvedAutoQuotations.length / autoQuotations.length) * 100
      : 0;
    
    const avgProjectValue = autoProjects.length > 0
      ? totalAutoValue / autoProjects.length
      : 0;
    
    const avgTermsPerProject = autoProjects.length > 0
      ? totalAutoTerms / autoProjects.length
      : 0;

    // By month (last 6 months)
    const monthlyData = new Map<string, { quotations: number; projects: number; value: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(key, { quotations: 0, projects: 0, value: 0 });
    }

    autoQuotations.forEach(q => {
      const created = new Date(q.created_at);
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      const data = monthlyData.get(key);
      if (data) {
        data.quotations++;
      }
    });

    autoProjects.forEach(p => {
      const created = new Date(p.created_at);
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      const data = monthlyData.get(key);
      if (data) {
        data.projects++;
        data.value += p.total_value || 0;
      }
    });

    const byMonth = Array.from(monthlyData.entries()).map(([month, data]) => {
      const [year, m] = month.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return {
        month: `${monthNames[parseInt(m) - 1]} ${year.slice(2)}`,
        ...data,
      };
    });

    const recentAutoProjects = autoProjects.slice(0, 5).map(p => ({
      id: p.id,
      name: p.project_name,
      value: p.total_value,
      termsCount: p.payment_terms?.length || 0,
      createdAt: p.created_at,
    }));

    return {
      totalAutoQuotations: autoQuotations.length,
      totalAutoProjects: autoProjects.length,
      totalAutoTerms,
      totalAutoValue,
      successRate,
      avgProjectValue,
      avgTermsPerProject,
      byMonth,
      recentAutoProjects,
    };
  }, [quotations, projects]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Dashboard Performa Auto-Generation
          </CardTitle>
          <CardDescription>
            Statistik otomasi pembuatan proyek dan termin pembayaran dari Hot Lead
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Auto Quotations</p>
                <p className="text-xl font-bold">{stats.totalAutoQuotations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <FolderKanban className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Auto Projects</p>
                <p className="text-xl font-bold">{stats.totalAutoProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Auto Terms</p>
                <p className="text-xl font-bold">{stats.totalAutoTerms}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-lg font-bold">{formatCurrency(stats.totalAutoValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-sm">Success Rate</span>
              </div>
              <span className="text-lg font-bold text-success">{stats.successRate.toFixed(1)}%</span>
            </div>
            <Progress value={stats.successRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm">Avg Project Value</span>
              </div>
              <span className="text-lg font-bold">{formatCurrency(stats.avgProjectValue)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-500" />
                <span className="text-sm">Avg Terms/Project</span>
              </div>
              <span className="text-lg font-bold">{stats.avgTermsPerProject.toFixed(1)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend & Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trend Auto-Generation Bulanan</CardTitle>
            <CardDescription>Quotation dan proyek yang dibuat otomatis per bulan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.byMonth.map((item) => (
                <div key={item.month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.month}</span>
                    <span className="text-muted-foreground">{formatCurrency(item.value)}</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Quotations</span>
                        <span>{item.quotations}</span>
                      </div>
                      <Progress 
                        value={Math.min((item.quotations / Math.max(...stats.byMonth.map(m => m.quotations), 1)) * 100, 100)} 
                        className="h-1.5 [&>div]:bg-blue-500" 
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Projects</span>
                        <span>{item.projects}</span>
                      </div>
                      <Progress 
                        value={Math.min((item.projects / Math.max(...stats.byMonth.map(m => m.projects), 1)) * 100, 100)} 
                        className="h-1.5 [&>div]:bg-green-500" 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proyek Auto-Generated Terbaru</CardTitle>
            <CardDescription>5 proyek terakhir yang dibuat secara otomatis</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {stats.recentAutoProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Belum ada proyek auto-generated</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentAutoProjects.map((project) => (
                    <div key={project.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{project.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(project.createdAt), 'dd MMM yyyy', { locale: idLocale })}
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {project.termsCount} termin
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Nilai Proyek</span>
                        <span className="font-medium text-success">{formatCurrency(project.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Automation Flow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alur Automation</CardTitle>
          <CardDescription>Proses otomasi dari Hot Lead hingga Termin Pembayaran</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2 py-4">
            {[
              { icon: '🔥', label: 'Hot Lead', count: quotations.filter(q => q.lead_id).length },
              { icon: '📝', label: 'Auto Quotation', count: stats.totalAutoQuotations },
              { icon: '✅', label: 'COO Approval', count: quotations.filter(q => q.approval_status === 'approved').length },
              { icon: '📁', label: 'Auto Project', count: stats.totalAutoProjects },
              { icon: '💰', label: 'Auto Terms', count: stats.totalAutoTerms },
            ].map((step, index, arr) => (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-2xl">
                    {step.icon}
                  </div>
                  <span className="text-xs font-medium mt-2">{step.label}</span>
                  <span className="text-lg font-bold text-primary">{step.count}</span>
                </div>
                {index < arr.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground mx-4 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
