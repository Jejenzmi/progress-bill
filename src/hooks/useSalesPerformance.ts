import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserPerformance {
  userId: string;
  userName: string;
  // Deals
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  pipelineDeals: number;
  // Revenue
  totalRevenue: number;
  revenueThisMonth: number;
  // Conversion
  conversionRate: number;
  avgDealSize: number;
  // Activities
  totalActivities: number;
  activitiesThisMonth: number;
  // Leads
  totalLeads: number;
  convertedLeads: number;
  leadConversionRate: number;
}

export interface MonthlyPerformance {
  month: string;
  monthLabel: string;
  revenue: number;
  deals: number;
  activities: number;
}

export function useSalesPerformance() {
  const [performances, setPerformances] = useState<UserPerformance[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformance = useCallback(async () => {
    try {
      setLoading(true);

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Fetch all users with marketing role
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'marketing');

      if (rolesError) throw rolesError;

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      if (profilesError) throw profilesError;

      // Fetch all data
      const [projectsRes, invoicesRes, activitiesRes, leadsRes] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('invoices').select('*').eq('status', 'Paid'),
        supabase.from('activities').select('*'),
        supabase.from('leads').select('*'),
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (invoicesRes.error) throw invoicesRes.error;
      if (activitiesRes.error) throw activitiesRes.error;
      if (leadsRes.error) throw leadsRes.error;

      const projects = projectsRes.data || [];
      const invoices = invoicesRes.data || [];
      const activities = activitiesRes.data || [];
      const leads = leadsRes.data || [];

      // Calculate per-user performance
      const userPerformances: UserPerformance[] = [];

      for (const role of userRoles || []) {
        const profile = profiles?.find(p => p.user_id === role.user_id);
        const userName = profile?.full_name || 'Unknown User';

        const userProjects = projects.filter(p => p.created_by === role.user_id);
        const wonProjects = userProjects.filter(p => p.status === 'Won' || p.status === 'Completed');
        const lostProjects = userProjects.filter(p => p.status === 'Lost');
        const pipelineProjects = userProjects.filter(p => p.status === 'Pipeline');

        const totalRevenue = wonProjects.reduce((sum, p) => sum + Number(p.total_value || 0), 0);

        // Revenue this month from invoices
        const userInvoices = invoices.filter(inv => {
          const project = projects.find(p => p.id === inv.project_id);
          return project?.created_by === role.user_id;
        });
        const thisMonthInvoices = userInvoices.filter(inv => 
          inv.paid_at && inv.paid_at.startsWith(currentMonth)
        );
        const revenueThisMonth = thisMonthInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

        const closedDeals = wonProjects.length + lostProjects.length;
        const conversionRate = closedDeals > 0 ? (wonProjects.length / closedDeals) * 100 : 0;
        const avgDealSize = wonProjects.length > 0 ? totalRevenue / wonProjects.length : 0;

        const userActivities = activities.filter(a => a.created_by === role.user_id);
        const activitiesThisMonth = userActivities.filter(a => 
          a.created_at.startsWith(currentMonth)
        ).length;

        const userLeads = leads.filter(l => l.created_by === role.user_id);
        const convertedLeads = userLeads.filter(l => l.converted_to_client_id).length;
        const leadConversionRate = userLeads.length > 0 ? (convertedLeads / userLeads.length) * 100 : 0;

        userPerformances.push({
          userId: role.user_id,
          userName,
          totalDeals: userProjects.length,
          wonDeals: wonProjects.length,
          lostDeals: lostProjects.length,
          pipelineDeals: pipelineProjects.length,
          totalRevenue,
          revenueThisMonth,
          conversionRate,
          avgDealSize,
          totalActivities: userActivities.length,
          activitiesThisMonth,
          totalLeads: userLeads.length,
          convertedLeads,
          leadConversionRate,
        });
      }

      // Sort by revenue
      userPerformances.sort((a, b) => b.totalRevenue - a.totalRevenue);
      setPerformances(userPerformances);

      // Calculate monthly data for chart
      const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthlyPerformance: MonthlyPerformance[] = [];

      for (let month = 0; month < 12; month++) {
        const monthStr = `${currentYear}-${String(month + 1).padStart(2, '0')}`;
        
        const monthInvoices = invoices.filter(inv => 
          inv.paid_at && inv.paid_at.startsWith(monthStr)
        );
        const revenue = monthInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

        const monthProjects = projects.filter(p => {
          const createdMonth = p.created_at.slice(0, 7);
          return createdMonth === monthStr && (p.status === 'Won' || p.status === 'Completed');
        });

        const monthActivities = activities.filter(a => 
          a.created_at.startsWith(monthStr)
        );

        monthlyPerformance.push({
          month: monthStr,
          monthLabel: monthLabels[month],
          revenue,
          deals: monthProjects.length,
          activities: monthActivities.length,
        });
      }

      setMonthlyData(monthlyPerformance);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching performance:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  return { performances, monthlyData, loading, error, refetch: fetchPerformance };
}
