import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  UserPlus,
  Target,
  TrendingUp,
  Activity,
  CheckCircle,
  Clock,
  ArrowRight,
  FileText,
  Flame,
  Snowflake,
  ThermometerSun,
  Calendar,
  Phone,
  Mail,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  convertedThisMonth: number;
  activitiesThisMonth: number;
  pendingFollowUps: number;
  quotationsPending: number;
  quotationsApproved: number;
  conversionRate: number;
  targetLeads: number;
  targetConversions: number;
}

interface RecentActivity {
  id: string;
  subject: string;
  activity_type: string;
  scheduled_at: string | null;
  is_completed: boolean;
  lead_name?: string;
}

interface PendingQuotation {
  id: string;
  project_name: string;
  grand_total: number;
  approval_status: string;
  submitted_at: string | null;
  client_name?: string;
}

const LEAD_STATUS_COLORS = {
  hot: '#ef4444',
  warm: '#f97316',
  cold: '#3b82f6',
};

export default function BDODashboard() {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    hotLeads: 0,
    warmLeads: 0,
    coldLeads: 0,
    convertedThisMonth: 0,
    activitiesThisMonth: 0,
    pendingFollowUps: 0,
    quotationsPending: 0,
    quotationsApproved: 0,
    conversionRate: 0,
    targetLeads: 50,
    targetConversions: 10,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [pendingQuotations, setPendingQuotations] = useState<PendingQuotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Fetch leads assigned to current user or all if admin/bdo
      const { data: leads } = await supabase
        .from('leads')
        .select('id, status, converted_at, assigned_to');

      const myLeads = leads?.filter(l => 
        hasRole('admin') || hasRole('bdo') || l.assigned_to === user.id
      ) || [];

      const hotLeads = myLeads.filter(l => l.status === 'hot').length;
      const warmLeads = myLeads.filter(l => l.status === 'warm').length;
      const coldLeads = myLeads.filter(l => l.status === 'cold').length;
      const convertedThisMonth = myLeads.filter(l => 
        l.converted_at && new Date(l.converted_at) >= monthStart && new Date(l.converted_at) <= monthEnd
      ).length;

      // Fetch activities
      const { data: activities } = await supabase
        .from('activities')
        .select('id, subject, activity_type, scheduled_at, is_completed, lead_id, leads(name)')
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .gte('scheduled_at', monthStart.toISOString())
        .order('scheduled_at', { ascending: false })
        .limit(10);

      const activitiesThisMonth = activities?.length || 0;
      const pendingFollowUps = activities?.filter(a => 
        !a.is_completed && a.scheduled_at && new Date(a.scheduled_at) <= now
      ).length || 0;

      // Fetch quotations
      const { data: quotations } = await supabase
        .from('quotations')
        .select('id, project_name, grand_total, approval_status, submitted_at, client_id, clients(name)')
        .eq('created_by', user.id);

      const quotationsPending = quotations?.filter(q => q.approval_status === 'pending').length || 0;
      const quotationsApproved = quotations?.filter(q => q.approval_status === 'approved').length || 0;

      const conversionRate = myLeads.length > 0 
        ? Math.round((convertedThisMonth / myLeads.length) * 100) 
        : 0;

      setStats({
        totalLeads: myLeads.length,
        hotLeads,
        warmLeads,
        coldLeads,
        convertedThisMonth,
        activitiesThisMonth,
        pendingFollowUps,
        quotationsPending,
        quotationsApproved,
        conversionRate,
        targetLeads: 50,
        targetConversions: 10,
      });

      setRecentActivities(
        (activities || []).slice(0, 5).map(a => ({
          id: a.id,
          subject: a.subject,
          activity_type: a.activity_type,
          scheduled_at: a.scheduled_at,
          is_completed: a.is_completed,
          lead_name: (a.leads as any)?.name,
        }))
      );

      setPendingQuotations(
        (quotations || [])
          .filter(q => q.approval_status === 'pending')
          .slice(0, 5)
          .map(q => ({
            id: q.id,
            project_name: q.project_name,
            grand_total: q.grand_total || 0,
            approval_status: q.approval_status || 'draft',
            submitted_at: q.submitted_at,
            client_name: (q.clients as any)?.name,
          }))
      );

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const leadStatusData = [
    { name: 'Hot', value: stats.hotLeads, color: LEAD_STATUS_COLORS.hot },
    { name: 'Warm', value: stats.warmLeads, color: LEAD_STATUS_COLORS.warm },
    { name: 'Cold', value: stats.coldLeads, color: LEAD_STATUS_COLORS.cold },
  ];

  const activityTypeIcons: Record<string, React.ReactNode> = {
    meeting: <Calendar className="h-4 w-4" />,
    call: <Phone className="h-4 w-4" />,
    email: <Mail className="h-4 w-4" />,
    follow_up: <Clock className="h-4 w-4" />,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (!hasRole('admin') && !hasRole('bdo') && !hasRole('marketing')) {
    return (
      <AppLayout title="Akses Ditolak" subtitle="Anda tidak memiliki akses ke halaman ini">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Halaman ini hanya untuk BDO, Marketing, atau Admin.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="BDO Dashboard" subtitle="Monitor target leads, konversi, dan aktivitas sales">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
            <div className="mt-2">
              <Progress value={(stats.totalLeads / stats.targetLeads) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Target: {stats.targetLeads} leads
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Konversi Bulan Ini</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.convertedThisMonth}</div>
            <div className="mt-2">
              <Progress value={(stats.convertedThisMonth / stats.targetConversions) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Target: {stats.targetConversions} konversi
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktivitas Bulan Ini</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activitiesThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pendingFollowUps} follow-up tertunda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Dari total leads yang dikelola
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Lead Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribusi Status Lead</CardTitle>
            <CardDescription>Pembagian lead berdasarkan status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {leadStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-red-500" />
                <span className="text-sm">Hot: {stats.hotLeads}</span>
              </div>
              <div className="flex items-center gap-2">
                <ThermometerSun className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Warm: {stats.warmLeads}</span>
              </div>
              <div className="flex items-center gap-2">
                <Snowflake className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Cold: {stats.coldLeads}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Aktivitas Terbaru</CardTitle>
              <CardDescription>Follow-up dan meeting terjadwal</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/activities">
                Lihat Semua <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Belum ada aktivitas terjadwal
                </p>
              ) : (
                recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        {activityTypeIcons[activity.activity_type] || <Activity className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{activity.subject}</p>
                        {activity.lead_name && (
                          <p className="text-xs text-muted-foreground">{activity.lead_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activity.is_completed ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Quotations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Quotation Menunggu Approval</CardTitle>
              <CardDescription>Quotation yang disubmit untuk review COO</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/quotations">
                Lihat Semua <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingQuotations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Tidak ada quotation menunggu approval
                </p>
              ) : (
                pendingQuotations.map((quotation) => (
                  <div
                    key={quotation.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                        <FileText className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{quotation.project_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {quotation.client_name || 'Klien tidak diketahui'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(quotation.grand_total)}</p>
                      <Badge variant="outline" className="text-xs">Pending</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/leads">
                <UserPlus className="h-4 w-4 mr-2" />
                Tambah Lead Baru
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/activities">
                <Activity className="h-4 w-4 mr-2" />
                Catat Aktivitas
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/quotations">
                <FileText className="h-4 w-4 mr-2" />
                Buat Quotation
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/pipeline">
                <TrendingUp className="h-4 w-4 mr-2" />
                Lihat Pipeline
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
