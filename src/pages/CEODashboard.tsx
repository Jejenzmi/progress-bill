import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  DollarSign,
  BarChart3,
  Trophy,
  Calendar,
  Loader2,
  RefreshCw,
  Crown,
  Briefcase,
  UserPlus,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { cn } from '@/lib/utils';

interface TeamMember {
  userId: string;
  userName: string;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  pipelineDeals: number;
  totalRevenue: number;
  revenueThisMonth: number;
  conversionRate: number;
  avgDealSize: number;
  totalLeads: number;
  convertedLeads: number;
  activitiesThisMonth: number;
  targetProgress: number;
  monthlyTarget: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  target: number;
  forecast: number;
}

interface OverviewKPI {
  totalRevenue: number;
  totalRevenueThisMonth: number;
  revenueGrowth: number;
  yearlyTarget: number;
  yearlyProgress: number;
  monthlyTarget: number;
  monthlyProgress: number;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  pipelineDeals: number;
  pipelineValue: number;
  weightedForecast: number;
  totalLeads: number;
  convertedLeads: number;
  teamSize: number;
  avgConversionRate: number;
  topPerformer: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--info))'];

export default function CEODashboard() {
  const [overview, setOverview] = useState<OverviewKPI | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Fetch all data in parallel
      const [
        projectsRes,
        invoicesRes,
        leadsRes,
        activitiesRes,
        userRolesRes,
        profilesRes,
        targetsRes,
      ] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('invoices').select('*').eq('status', 'Paid'),
        supabase.from('leads').select('*'),
        supabase.from('activities').select('*'),
        supabase.from('user_roles').select('user_id').eq('role', 'marketing'),
        supabase.from('profiles').select('user_id, full_name'),
        supabase.from('sales_targets').select('*'),
      ]);

      const projects = projectsRes.data || [];
      const invoices = invoicesRes.data || [];
      const leads = leadsRes.data || [];
      const activities = activitiesRes.data || [];
      const marketingUsers = userRolesRes.data || [];
      const profiles = profilesRes.data || [];
      const targets = targetsRes.data || [];

      // Calculate overview KPIs
      const wonProjects = projects.filter(p => p.status === 'Won' || p.status === 'Completed');
      const lostProjects = projects.filter(p => p.status === 'Lost');
      const pipelineProjects = projects.filter(p => p.status === 'Pipeline');

      const totalRevenue = wonProjects.reduce((sum, p) => sum + Number(p.total_value || 0), 0);
      
      const thisMonthInvoices = invoices.filter(inv => 
        inv.paid_at && inv.paid_at.startsWith(currentMonth)
      );
      const totalRevenueThisMonth = thisMonthInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
      
      const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7);
      const lastMonthInvoices = invoices.filter(inv => 
        inv.paid_at && inv.paid_at.startsWith(lastMonth)
      );
      const totalRevenueLastMonth = lastMonthInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
      const revenueGrowth = totalRevenueLastMonth > 0 
        ? ((totalRevenueThisMonth - totalRevenueLastMonth) / totalRevenueLastMonth) * 100 
        : 0;

      // Targets
      const yearlyTargetRecord = targets.find(t => 
        t.target_type === 'yearly' && t.target_period.startsWith(currentYear.toString()) && !t.user_id
      );
      const monthlyTargetRecord = targets.find(t => 
        t.target_type === 'monthly' && t.target_period === currentMonth && !t.user_id
      );
      
      const yearlyTarget = Number(yearlyTargetRecord?.target_amount || 0);
      let monthlyTarget = Number(monthlyTargetRecord?.target_amount || 0);
      if (monthlyTarget === 0 && yearlyTarget > 0) {
        monthlyTarget = yearlyTarget / 12;
      }

      const yearlyInvoices = invoices.filter(inv => 
        inv.paid_at && inv.paid_at.startsWith(currentYear.toString())
      );
      const totalRevenueThisYear = yearlyInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
      
      const yearlyProgress = yearlyTarget > 0 ? (totalRevenueThisYear / yearlyTarget) * 100 : 0;
      const monthlyProgress = monthlyTarget > 0 ? (totalRevenueThisMonth / monthlyTarget) * 100 : 0;

      const pipelineValue = pipelineProjects.reduce((sum, p) => sum + Number(p.total_value || 0), 0);
      const weightedForecast = pipelineProjects.reduce((sum, p) => {
        const prob = p.probability || 0;
        return sum + (Number(p.total_value || 0) * prob / 100);
      }, 0);

      const convertedLeads = leads.filter(l => l.converted_to_client_id).length;
      
      // Calculate team member performance
      const teamPerformances: TeamMember[] = [];
      
      for (const user of marketingUsers) {
        const profile = profiles.find(p => p.user_id === user.user_id);
        const userName = profile?.full_name || 'Unknown';
        
        const userProjects = projects.filter(p => p.created_by === user.user_id);
        const userWon = userProjects.filter(p => p.status === 'Won' || p.status === 'Completed');
        const userLost = userProjects.filter(p => p.status === 'Lost');
        const userPipeline = userProjects.filter(p => p.status === 'Pipeline');
        
        const userRevenue = userWon.reduce((sum, p) => sum + Number(p.total_value || 0), 0);
        
        const userInvoices = invoices.filter(inv => {
          const project = projects.find(p => p.id === inv.project_id);
          return project?.created_by === user.user_id;
        });
        const userRevenueThisMonth = userInvoices
          .filter(inv => inv.paid_at && inv.paid_at.startsWith(currentMonth))
          .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
        
        const closedDeals = userWon.length + userLost.length;
        const conversionRate = closedDeals > 0 ? (userWon.length / closedDeals) * 100 : 0;
        const avgDealSize = userWon.length > 0 ? userRevenue / userWon.length : 0;
        
        const userLeads = leads.filter(l => l.created_by === user.user_id);
        const userConvertedLeads = userLeads.filter(l => l.converted_to_client_id).length;
        
        const userActivities = activities.filter(a => 
          a.created_by === user.user_id && a.created_at.startsWith(currentMonth)
        ).length;

        // Get user target
        const userTarget = targets.find(t => 
          t.target_type === 'monthly' && t.target_period === currentMonth && t.user_id === user.user_id
        );
        const userMonthlyTarget = Number(userTarget?.target_amount || monthlyTarget);
        const targetProgress = userMonthlyTarget > 0 ? (userRevenueThisMonth / userMonthlyTarget) * 100 : 0;

        teamPerformances.push({
          userId: user.user_id,
          userName,
          totalDeals: userProjects.length,
          wonDeals: userWon.length,
          lostDeals: userLost.length,
          pipelineDeals: userPipeline.length,
          totalRevenue: userRevenue,
          revenueThisMonth: userRevenueThisMonth,
          conversionRate,
          avgDealSize,
          totalLeads: userLeads.length,
          convertedLeads: userConvertedLeads,
          activitiesThisMonth: userActivities,
          targetProgress,
          monthlyTarget: userMonthlyTarget,
        });
      }

      teamPerformances.sort((a, b) => b.revenueThisMonth - a.revenueThisMonth);
      
      const topPerformer = teamPerformances[0]?.userName || 'N/A';
      const avgConversionRate = teamPerformances.length > 0 
        ? teamPerformances.reduce((sum, t) => sum + t.conversionRate, 0) / teamPerformances.length 
        : 0;

      // Calculate monthly revenue data for chart
      const monthlyRevenueData: MonthlyRevenue[] = monthNames.map((name, index) => {
        const monthStr = `${currentYear}-${String(index + 1).padStart(2, '0')}`;
        const monthInvoices = invoices.filter(inv => 
          inv.paid_at && inv.paid_at.startsWith(monthStr)
        );
        const revenue = monthInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
        
        // Calculate forecast for future months
        const currentMonthIndex = new Date().getMonth();
        let forecast = revenue;
        if (index > currentMonthIndex) {
          // Future month: use weighted pipeline / remaining months
          forecast = weightedForecast / (12 - currentMonthIndex);
        }

        return {
          month: name,
          revenue,
          target: monthlyTarget,
          forecast: index >= currentMonthIndex ? forecast : revenue,
        };
      });

      setOverview({
        totalRevenue,
        totalRevenueThisMonth,
        revenueGrowth,
        yearlyTarget,
        yearlyProgress,
        monthlyTarget,
        monthlyProgress,
        totalDeals: projects.length,
        wonDeals: wonProjects.length,
        lostDeals: lostProjects.length,
        pipelineDeals: pipelineProjects.length,
        pipelineValue,
        weightedForecast,
        totalLeads: leads.length,
        convertedLeads,
        teamSize: marketingUsers.length,
        avgConversionRate,
        topPerformer,
      });

      setTeamMembers(teamPerformances);
      setMonthlyData(monthlyRevenueData);
    } catch (error) {
      console.error('Error fetching CEO dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <AppLayout title="CEO Dashboard" subtitle="Memuat data...">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!overview) {
    return (
      <AppLayout title="CEO Dashboard" subtitle="Error">
        <div className="text-center py-20 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <p>Gagal memuat data</p>
          <Button onClick={handleRefresh} className="mt-4">Coba Lagi</Button>
        </div>
      </AppLayout>
    );
  }

  const teamPerformanceData = teamMembers.map(m => ({
    name: m.userName.split(' ')[0],
    revenue: m.revenueThisMonth,
    target: m.monthlyTarget,
    deals: m.wonDeals,
  }));

  const dealDistributionData = [
    { name: 'Won', value: overview.wonDeals, color: 'hsl(var(--success))' },
    { name: 'Lost', value: overview.lostDeals, color: 'hsl(var(--destructive))' },
    { name: 'Pipeline', value: overview.pipelineDeals, color: 'hsl(var(--primary))' },
  ].filter(d => d.value > 0);

  return (
    <AppLayout 
      title="CEO Dashboard" 
      subtitle="Executive overview - semua tim sales dan performa bisnis"
    >
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue YTD</p>
                <p className="text-2xl font-bold">{formatCurrency(overview.totalRevenue)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {overview.revenueGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    overview.revenueGrowth >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {formatPercent(Math.abs(overview.revenueGrowth))} MoM
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold">{formatCurrency(overview.pipelineValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Forecast: {formatCurrency(overview.weightedForecast)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-info/20 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tim Sales</p>
                <p className="text-2xl font-bold">{overview.teamSize} orang</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg. Win Rate: {formatPercent(overview.avgConversionRate)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top Performer</p>
                <p className="text-lg font-bold truncate">{overview.topPerformer}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bulan ini
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Target Bulanan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatCurrency(overview.totalRevenueThisMonth)} / {formatCurrency(overview.monthlyTarget)}
                </span>
                <span className="font-medium">{formatPercent(overview.monthlyProgress)}</span>
              </div>
              <Progress value={Math.min(overview.monthlyProgress, 100)} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {overview.monthlyProgress >= 100 
                  ? '✅ Target tercapai!' 
                  : `Kurang ${formatCurrency(overview.monthlyTarget - overview.totalRevenueThisMonth)}`
                }
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Target Tahunan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Progress: {formatPercent(overview.yearlyProgress)}
                </span>
                <span className="font-medium">{formatCurrency(overview.yearlyTarget)}</span>
              </div>
              <Progress value={Math.min(overview.yearlyProgress, 100)} className="h-3" />
              <p className="text-xs text-muted-foreground">
                Bulan ke-{new Date().getMonth() + 1} dari 12
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="team" className="space-y-4">
        <TabsList>
          <TabsTrigger value="team">Tim Performance</TabsTrigger>
          <TabsTrigger value="forecast">Revenue Forecast</TabsTrigger>
          <TabsTrigger value="deals">Deal Analysis</TabsTrigger>
        </TabsList>

        {/* Team Performance Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performa Tim Sales - Bulan Ini</CardTitle>
              <CardDescription>Perbandingan pencapaian vs target per anggota tim</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamPerformanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="target" name="Target" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} opacity={0.5} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Team Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-4 w-4 text-warning" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamMembers.slice(0, 5).map((member, index) => (
                  <div 
                    key={member.userId} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg",
                      index === 0 ? "bg-warning/10 border border-warning/20" : "bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                      index === 0 ? "bg-warning text-warning-foreground" :
                        index === 1 ? "bg-muted-foreground/30 text-foreground" :
                        index === 2 ? "bg-accent text-accent-foreground" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{member.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.wonDeals} deals • {formatPercent(member.conversionRate)} win rate
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(member.revenueThisMonth)}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.targetProgress >= 100 ? (
                          <span className="text-success">Target ✓</span>
                        ) : (
                          `${formatPercent(member.targetProgress)} target`
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Forecast Tab */}
        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Forecast {new Date().getFullYear()}</CardTitle>
              <CardDescription>Aktual vs Target vs Proyeksi berdasarkan weighted pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Revenue Aktual" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.3}
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="forecast" 
                      name="Forecast" 
                      fill="hsl(var(--success))" 
                      fillOpacity={0.1}
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="target" 
                      name="Target" 
                      stroke="hsl(var(--warning))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Forecast Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">YTD Revenue</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(overview.totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Weighted Forecast</p>
                <p className="text-3xl font-bold text-success">{formatCurrency(overview.weightedForecast)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Projected YE Revenue</p>
                <p className="text-3xl font-bold">{formatCurrency(overview.totalRevenue + overview.weightedForecast)}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deal Analysis Tab */}
        <TabsContent value="deals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribusi Deal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dealDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {dealDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Metrics Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-success/10">
                  <span>Won Deals</span>
                  <Badge variant="outline" className="bg-success/20 text-success border-success/30">
                    {overview.wonDeals}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/10">
                  <span>Lost Deals</span>
                  <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">
                    {overview.lostDeals}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
                  <span>Pipeline Deals</span>
                  <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                    {overview.pipelineDeals}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                  <span>Total Leads</span>
                  <Badge variant="outline">{overview.totalLeads}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                  <span>Converted Leads</span>
                  <Badge variant="outline">{overview.convertedLeads}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
