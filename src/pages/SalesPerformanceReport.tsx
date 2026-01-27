import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  CheckCircle,
  XCircle,
  UserPlus,
  FileText,
  Loader2,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface PerformanceStats {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalActivities: number;
  completedActivities: number;
  activityCompletionRate: number;
  totalQuotations: number;
  approvedQuotations: number;
  rejectedQuotations: number;
  quotationApprovalRate: number;
  targetRevenue: number;
  achievedRevenue: number;
  revenueAchievementRate: number;
}

interface MonthlyData {
  month: string;
  leads: number;
  conversions: number;
  activities: number;
  quotations: number;
}

interface ActivityBreakdown {
  type: string;
  count: number;
  completed: number;
}

const ACTIVITY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function SalesPerformanceReport() {
  const { user, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [stats, setStats] = useState<PerformanceStats>({
    totalLeads: 0,
    convertedLeads: 0,
    conversionRate: 0,
    totalActivities: 0,
    completedActivities: 0,
    activityCompletionRate: 0,
    totalQuotations: 0,
    approvedQuotations: 0,
    rejectedQuotations: 0,
    quotationApprovalRate: 0,
    targetRevenue: 0,
    achievedRevenue: 0,
    revenueAchievementRate: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [activityBreakdown, setActivityBreakdown] = useState<ActivityBreakdown[]>([]);

  useEffect(() => {
    fetchPerformanceData();
  }, [user, selectedPeriod]);

  const getDateRange = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'this-month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'this-quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
        return { start: quarterStart, end: quarterEnd };
      case 'this-year':
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchPerformanceData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { start, end } = getDateRange();

      // Fetch leads
      const { data: leads } = await supabase
        .from('leads')
        .select('id, status, converted_at, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const totalLeads = leads?.length || 0;
      const convertedLeads = leads?.filter(l => l.converted_at).length || 0;
      const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

      // Fetch activities
      const { data: activities } = await supabase
        .from('activities')
        .select('id, activity_type, is_completed, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const totalActivities = activities?.length || 0;
      const completedActivities = activities?.filter(a => a.is_completed).length || 0;
      const activityCompletionRate = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

      // Activity breakdown by type
      const activityTypes = ['meeting', 'call', 'email', 'whatsapp', 'follow_up', 'note'];
      const breakdown = activityTypes.map(type => ({
        type: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
        count: activities?.filter(a => a.activity_type === type).length || 0,
        completed: activities?.filter(a => a.activity_type === type && a.is_completed).length || 0,
      })).filter(b => b.count > 0);
      setActivityBreakdown(breakdown);

      // Fetch quotations
      const { data: quotations } = await supabase
        .from('quotations')
        .select('id, approval_status, grand_total, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const totalQuotations = quotations?.length || 0;
      const approvedQuotations = quotations?.filter(q => q.approval_status === 'approved').length || 0;
      const rejectedQuotations = quotations?.filter(q => q.approval_status === 'rejected').length || 0;
      const quotationApprovalRate = totalQuotations > 0 ? Math.round((approvedQuotations / totalQuotations) * 100) : 0;

      // Calculate revenue from approved quotations
      const achievedRevenue = quotations
        ?.filter(q => q.approval_status === 'approved')
        .reduce((sum, q) => sum + (q.grand_total || 0), 0) || 0;

      // Fetch sales target
      const currentPeriod = format(new Date(), 'yyyy-MM');
      const { data: targets } = await supabase
        .from('sales_targets')
        .select('target_amount')
        .eq('target_period', currentPeriod)
        .maybeSingle();

      const targetRevenue = targets?.target_amount || 500000000; // Default 500M
      const revenueAchievementRate = targetRevenue > 0 ? Math.round((achievedRevenue / targetRevenue) * 100) : 0;

      setStats({
        totalLeads,
        convertedLeads,
        conversionRate,
        totalActivities,
        completedActivities,
        activityCompletionRate,
        totalQuotations,
        approvedQuotations,
        rejectedQuotations,
        quotationApprovalRate,
        targetRevenue,
        achievedRevenue,
        revenueAchievementRate,
      });

      // Fetch monthly trend data for the year
      const yearStart = startOfYear(new Date());
      const yearEnd = endOfYear(new Date());
      const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

      const { data: allLeads } = await supabase
        .from('leads')
        .select('created_at, converted_at')
        .gte('created_at', yearStart.toISOString())
        .lte('created_at', yearEnd.toISOString());

      const { data: allActivities } = await supabase
        .from('activities')
        .select('created_at')
        .gte('created_at', yearStart.toISOString())
        .lte('created_at', yearEnd.toISOString());

      const { data: allQuotations } = await supabase
        .from('quotations')
        .select('created_at')
        .gte('created_at', yearStart.toISOString())
        .lte('created_at', yearEnd.toISOString());

      const monthly = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        
        return {
          month: format(month, 'MMM', { locale: id }),
          leads: allLeads?.filter(l => {
            const date = new Date(l.created_at);
            return date >= monthStart && date <= monthEnd;
          }).length || 0,
          conversions: allLeads?.filter(l => {
            if (!l.converted_at) return false;
            const date = new Date(l.converted_at);
            return date >= monthStart && date <= monthEnd;
          }).length || 0,
          activities: allActivities?.filter(a => {
            const date = new Date(a.created_at);
            return date >= monthStart && date <= monthEnd;
          }).length || 0,
          quotations: allQuotations?.filter(q => {
            const date = new Date(q.created_at);
            return date >= monthStart && date <= monthEnd;
          }).length || 0,
        };
      });

      setMonthlyData(monthly);

    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const StatCard = ({ 
    title, 
    value, 
    subValue, 
    icon: Icon, 
    trend, 
    trendValue,
    progressValue,
    progressMax,
  }: { 
    title: string; 
    value: number | string; 
    subValue?: string;
    icon: any; 
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    progressValue?: number;
    progressMax?: number;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {trend && trendValue && (
            <span className={`text-xs flex items-center ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
            }`}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : 
               trend === 'down' ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
              {trendValue}
            </span>
          )}
        </div>
        {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
        {progressValue !== undefined && progressMax !== undefined && (
          <div className="mt-2">
            <Progress value={(progressValue / progressMax) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((progressValue / progressMax) * 100)}% dari target
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <AppLayout title="Laporan Performa" subtitle="Memuat data...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Laporan Performa Sales" subtitle="Statistik konversi leads, aktivitas, dan pencapaian target">
      {/* Period Filter */}
      <div className="flex justify-end mb-6">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Pilih periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this-month">Bulan Ini</SelectItem>
            <SelectItem value="last-month">Bulan Lalu</SelectItem>
            <SelectItem value="this-quarter">Kuartal Ini</SelectItem>
            <SelectItem value="this-year">Tahun Ini</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Konversi Leads"
          value={`${stats.conversionRate}%`}
          subValue={`${stats.convertedLeads} dari ${stats.totalLeads} leads`}
          icon={UserPlus}
          trend={stats.conversionRate >= 20 ? 'up' : 'down'}
          trendValue={stats.conversionRate >= 20 ? 'Baik' : 'Perlu ditingkatkan'}
        />
        <StatCard
          title="Penyelesaian Aktivitas"
          value={`${stats.activityCompletionRate}%`}
          subValue={`${stats.completedActivities} dari ${stats.totalActivities} aktivitas`}
          icon={Activity}
          trend={stats.activityCompletionRate >= 80 ? 'up' : 'neutral'}
          trendValue={stats.activityCompletionRate >= 80 ? 'Produktif' : 'Normal'}
        />
        <StatCard
          title="Approval Quotation"
          value={`${stats.quotationApprovalRate}%`}
          subValue={`${stats.approvedQuotations} approved, ${stats.rejectedQuotations} rejected`}
          icon={FileText}
          trend={stats.quotationApprovalRate >= 70 ? 'up' : 'down'}
          trendValue={stats.quotationApprovalRate >= 70 ? 'Tinggi' : 'Rendah'}
        />
        <StatCard
          title="Pencapaian Revenue"
          value={`${stats.revenueAchievementRate}%`}
          subValue={formatCurrency(stats.achievedRevenue)}
          icon={Target}
          progressValue={stats.achievedRevenue}
          progressMax={stats.targetRevenue}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Monthly Trend */}
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Tren Bulanan</CardTitle>
            <CardDescription>Leads, konversi, dan aktivitas per bulan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="leads" name="Leads" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="conversions" name="Konversi" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="activities" name="Aktivitas" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Activity Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Breakdown Aktivitas</CardTitle>
            <CardDescription>Distribusi aktivitas berdasarkan jenis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="type" type="category" width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Total" fill="#3b82f6" />
                  <Bar dataKey="completed" name="Selesai" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotation Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performa Quotation</CardTitle>
          <CardDescription>Status quotation dalam periode terpilih</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-lg bg-muted text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.totalQuotations}</p>
              <p className="text-sm text-muted-foreground">Total Quotation</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{stats.approvedQuotations}</p>
              <p className="text-sm text-green-600/80">Approved</p>
            </div>
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 text-center">
              <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold text-red-600">{stats.rejectedQuotations}</p>
              <p className="text-sm text-red-600/80">Rejected</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-primary">{stats.quotationApprovalRate}%</p>
              <p className="text-sm text-primary/80">Approval Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
