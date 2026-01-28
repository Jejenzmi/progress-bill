import { useMemo, useEffect, useState } from 'react';
import { Lead } from '@/hooks/useLeads';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowRight,
  Users,
  Building2,
  FolderKanban,
  TrendingUp,
  CheckCircle2,
  Clock,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversionDashboardProps {
  leads: Lead[];
}

interface ConversionStats {
  totalLeads: number;
  convertedToClient: number;
  clientsWithProjects: number;
  projectsFromLeads: number;
  totalPipelineValue: number;
  totalWonValue: number;
  avgConversionTime: number;
  conversionBySource: { source: string; total: number; converted: number; rate: number }[];
  conversionByMonth: { month: string; leads: number; clients: number; projects: number }[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

export function ConversionDashboard({ leads }: ConversionDashboardProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data } = await supabase
          .from('projects')
          .select('id, client_id, status, total_value, created_at');
        setProjects(data || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const stats = useMemo<ConversionStats>(() => {
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(l => l.converted_to_client_id);
    const convertedToClient = convertedLeads.length;
    
    // Get unique client IDs from converted leads
    const clientIds = convertedLeads
      .map(l => l.converted_to_client_id)
      .filter(Boolean) as string[];
    
    // Count clients that have projects
    const clientsWithProjects = new Set(
      projects
        .filter(p => clientIds.includes(p.client_id))
        .map(p => p.client_id)
    ).size;
    
    // Projects from leads
    const projectsFromLeads = projects.filter(p => clientIds.includes(p.client_id)).length;
    
    // Pipeline and Won values
    const leadProjects = projects.filter(p => clientIds.includes(p.client_id));
    const totalPipelineValue = leadProjects
      .filter(p => p.status === 'Pipeline')
      .reduce((sum, p) => sum + (p.total_value || 0), 0);
    const totalWonValue = leadProjects
      .filter(p => p.status === 'Won' || p.status === 'Completed')
      .reduce((sum, p) => sum + (p.total_value || 0), 0);
    
    // Average conversion time (days)
    const conversionTimes = convertedLeads
      .filter(l => l.converted_at && l.created_at)
      .map(l => {
        const created = new Date(l.created_at);
        const converted = new Date(l.converted_at!);
        return (converted.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      });
    const avgConversionTime = conversionTimes.length > 0
      ? conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length
      : 0;
    
    // Conversion by source
    const sourceMap = new Map<string, { total: number; converted: number }>();
    leads.forEach(lead => {
      const source = lead.source || 'Unknown';
      const current = sourceMap.get(source) || { total: 0, converted: 0 };
      current.total++;
      if (lead.converted_to_client_id) current.converted++;
      sourceMap.set(source, current);
    });
    
    const conversionBySource = Array.from(sourceMap.entries())
      .map(([source, data]) => ({
        source,
        total: data.total,
        converted: data.converted,
        rate: data.total > 0 ? (data.converted / data.total) * 100 : 0,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 6);
    
    // Monthly conversion trend (last 6 months)
    const monthlyData = new Map<string, { leads: number; clients: number; projects: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(key, { leads: 0, clients: 0, projects: 0 });
    }
    
    leads.forEach(lead => {
      const created = new Date(lead.created_at);
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      const data = monthlyData.get(key);
      if (data) {
        data.leads++;
      }
      
      if (lead.converted_at) {
        const converted = new Date(lead.converted_at);
        const convertedKey = `${converted.getFullYear()}-${String(converted.getMonth() + 1).padStart(2, '0')}`;
        const convertedData = monthlyData.get(convertedKey);
        if (convertedData) {
          convertedData.clients++;
        }
      }
    });
    
    projects.forEach(project => {
      const created = new Date(project.created_at);
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      const data = monthlyData.get(key);
      if (data && clientIds.includes(project.client_id)) {
        data.projects++;
      }
    });
    
    const conversionByMonth = Array.from(monthlyData.entries()).map(([month, data]) => {
      const [year, m] = month.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return {
        month: `${monthNames[parseInt(m) - 1]} ${year.slice(2)}`,
        ...data,
      };
    });
    
    return {
      totalLeads,
      convertedToClient,
      clientsWithProjects,
      projectsFromLeads,
      totalPipelineValue,
      totalWonValue,
      avgConversionTime,
      conversionBySource,
      conversionByMonth,
    };
  }, [leads, projects]);

  const leadToClientRate = stats.totalLeads > 0 
    ? (stats.convertedToClient / stats.totalLeads) * 100 
    : 0;
  
  const clientToProjectRate = stats.convertedToClient > 0 
    ? (stats.clientsWithProjects / stats.convertedToClient) * 100 
    : 0;

  const overallConversionRate = stats.totalLeads > 0
    ? (stats.clientsWithProjects / stats.totalLeads) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Conversion Funnel Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Alur Konversi
          </CardTitle>
          <CardDescription>
            Visualisasi perjalanan dari Lead → Client → Project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
            {/* Lead */}
            <div className="flex-1 text-center">
              <div className="h-24 w-24 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <Users className="h-10 w-10 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">{stats.totalLeads}</p>
              <p className="text-sm text-muted-foreground">Total Leads</p>
            </div>
            
            {/* Arrow with conversion rate */}
            <div className="flex flex-col items-center">
              <ArrowRight className="h-8 w-8 text-muted-foreground hidden md:block" />
              <div className="md:hidden h-8 w-0.5 bg-muted-foreground/30" />
              <Badge variant="secondary" className="mt-1">
                {leadToClientRate.toFixed(1)}%
              </Badge>
            </div>
            
            {/* Client */}
            <div className="flex-1 text-center">
              <div className="h-24 w-24 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <Building2 className="h-10 w-10 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-amber-600">{stats.convertedToClient}</p>
              <p className="text-sm text-muted-foreground">Converted Clients</p>
            </div>
            
            {/* Arrow with conversion rate */}
            <div className="flex flex-col items-center">
              <ArrowRight className="h-8 w-8 text-muted-foreground hidden md:block" />
              <div className="md:hidden h-8 w-0.5 bg-muted-foreground/30" />
              <Badge variant="secondary" className="mt-1">
                {clientToProjectRate.toFixed(1)}%
              </Badge>
            </div>
            
            {/* Project */}
            <div className="flex-1 text-center">
              <div className="h-24 w-24 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-3">
                <FolderKanban className="h-10 w-10 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">{stats.projectsFromLeads}</p>
              <p className="text-sm text-muted-foreground">Projects Created</p>
            </div>
          </div>
          
          {/* Overall Rate */}
          <div className="mt-8 pt-6 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Konversi Keseluruhan (Lead → Project)</span>
              <span className="text-lg font-bold text-success">{overallConversionRate.toFixed(1)}%</span>
            </div>
            <Progress value={overallConversionRate} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pipeline Value</p>
                <p className="text-lg font-bold">{formatCurrency(stats.totalPipelineValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Won Value</p>
                <p className="text-lg font-bold text-success">{formatCurrency(stats.totalWonValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg. Conversion Time</p>
                <p className="text-lg font-bold">{stats.avgConversionTime.toFixed(1)} hari</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Client with Projects</p>
                <p className="text-lg font-bold">{stats.clientsWithProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion by Source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Konversi per Sumber Lead</CardTitle>
            <CardDescription>Performa konversi berdasarkan sumber lead</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.conversionBySource.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Belum ada data</p>
              ) : (
                stats.conversionBySource.map((item) => (
                  <div key={item.source} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.source}</span>
                      <span className="text-muted-foreground">
                        {item.converted}/{item.total} ({item.rate.toFixed(0)}%)
                      </span>
                    </div>
                    <Progress 
                      value={item.rate} 
                      className={cn(
                        "h-2",
                        item.rate >= 50 ? "[&>div]:bg-success" :
                        item.rate >= 25 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive"
                      )}
                    />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trend Konversi Bulanan</CardTitle>
            <CardDescription>Lead, Client, dan Project per bulan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.conversionByMonth.map((item) => (
                <div key={item.month} className="flex items-center gap-4">
                  <span className="text-sm font-medium w-16">{item.month}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Users className="h-3 w-3 mr-1" />
                      {item.leads}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <Building2 className="h-3 w-3 mr-1" />
                      {item.clients}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <FolderKanban className="h-3 w-3 mr-1" />
                      {item.projects}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
