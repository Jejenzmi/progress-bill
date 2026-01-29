import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentInvoices } from '@/components/dashboard/RecentInvoices';
import { PipelineOverview } from '@/components/dashboard/PipelineOverview';
import { UpcomingTerms } from '@/components/dashboard/UpcomingTerms';
import { MonthlyRevenueChart } from '@/components/dashboard/MonthlyRevenueChart';
import { ProjectStatusChart } from '@/components/dashboard/ProjectStatusChart';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Briefcase, Receipt, TrendingUp, AlertCircle, Target, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface DashboardStats {
  activeProjects: number;
  totalRevenue: number;
  pendingInvoices: number;
  pendingAmount: number;
  needsDocuments: number;
  monthlyTarget: number;
  yearlyTarget: number;
  yearlyProgress: number;
}

export default function Dashboard() {
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
    pendingAmount: 0,
    needsDocuments: 0,
    monthlyTarget: 500000000,
    yearlyTarget: 6000000000,
    yearlyProgress: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch active projects count
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, status')
        .eq('status', 'Won');

      if (projectsError) throw projectsError;

      // Fetch paid invoices for revenue
      const { data: paidInvoices, error: paidError } = await supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'Paid');

      if (paidError) throw paidError;

      // Fetch pending invoices
      const { data: pendingInvoices, error: pendingError } = await supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'Sent');

      if (pendingError) throw pendingError;

      // Fetch terms needing documents
      const { data: terms, error: termsError } = await supabase
        .from('payment_terms')
        .select('id, is_locked');

      if (termsError) throw termsError;

      // Count terms needing documents
      let needsDocsCount = 0;
      for (const term of terms || []) {
        if (!term.is_locked) {
          const { data: evidences } = await supabase
            .from('term_evidences')
            .select('id')
            .eq('term_id', term.id);
          
          if (!evidences || evidences.length === 0) {
            needsDocsCount++;
          }
        }
      }

      // Fetch targets
      const { data: targetsData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'targets')
        .maybeSingle();

      const targets = (targetsData?.value as { monthly_target_2026?: number; yearly_target_2026?: number } | null) || { monthly_target_2026: 500000000, yearly_target_2026: 6000000000 };

      const totalRevenue = paidInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
      const pendingAmount = pendingInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
      const yearlyProgress = (totalRevenue / targets.yearly_target_2026) * 100;

      setStats({
        activeProjects: projects?.length || 0,
        totalRevenue,
        pendingInvoices: pendingInvoices?.length || 0,
        pendingAmount,
        needsDocuments: needsDocsCount,
        monthlyTarget: targets.monthly_target_2026,
        yearlyTarget: targets.yearly_target_2026,
        yearlyProgress: Math.min(yearlyProgress, 100),
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Dashboard" subtitle="Memuat data...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const showFinanceData = hasRole('admin') || hasRole('finance') || hasRole('marketing');

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Selamat datang di Sales Order PT Zen Multimedia Indonesia"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Proyek Aktif"
          value={stats.activeProjects.toString()}
          subtitle="Sedang berjalan"
          icon={<Briefcase className="h-6 w-6" />}
          variant="primary"
        />
        {showFinanceData && (
          <>
            <StatCard
              title="Total Pendapatan"
              value={formatCurrency(stats.totalRevenue)}
              subtitle="Tahun ini"
              icon={<TrendingUp className="h-6 w-6" />}
              variant="success"
            />
            <StatCard
              title="Invoice Pending"
              value={stats.pendingInvoices.toString()}
              subtitle={formatCurrency(stats.pendingAmount)}
              icon={<Receipt className="h-6 w-6" />}
              variant="warning"
            />
          </>
        )}
        <StatCard
          title="Butuh Dokumen"
          value={stats.needsDocuments.toString()}
          subtitle="Termin menunggu upload"
          icon={<AlertCircle className="h-6 w-6" />}
          variant="default"
        />
      </div>

      {/* Target Progress */}
      {showFinanceData && (
        <div className="rounded-xl border bg-card p-5 shadow-card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Target Tahunan 2026</h3>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="font-semibold text-primary">{stats.yearlyProgress.toFixed(1)}%</p>
            </div>
          </div>
          <Progress value={stats.yearlyProgress} className="h-3 mb-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Tercapai: {formatCurrency(stats.totalRevenue)}</span>
            <span>Target: {formatCurrency(stats.yearlyTarget)}</span>
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      {showFinanceData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <MonthlyRevenueChart />
          <ProjectStatusChart />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Pipeline & Invoices */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pipeline Overview */}
          <PipelineOverview />

          {/* Recent Invoices */}
          {showFinanceData && <RecentInvoices />}
        </div>

        {/* Right Column - Calendar & Upcoming Terms */}
        <div className="space-y-6">
          <CalendarWidget />
          <UpcomingTerms />
        </div>
      </div>
    </AppLayout>
  );
}
