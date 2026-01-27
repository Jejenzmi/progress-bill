import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SalesKPI {
  // Revenue metrics
  totalRevenue: number;
  totalRevenueThisMonth: number;
  totalRevenueLastMonth: number;
  revenueGrowth: number;
  
  // Deal metrics
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  pipelineDeals: number;
  averageDealSize: number;
  
  // Conversion metrics
  conversionRate: number;
  winLossRatio: number;
  
  // Pipeline metrics
  pipelineValue: number;
  weightedPipelineValue: number; // based on probability
  
  // Target metrics
  monthlyTarget: number;
  yearlyTarget: number;
  monthlyProgress: number;
  yearlyProgress: number;
  
  // Lead metrics
  totalLeads: number;
  coldLeads: number;
  warmLeads: number;
  hotLeads: number;
  leadConversionRate: number;
  
  // Activity metrics
  activitiesThisWeek: number;
  pendingFollowUps: number;
}

export interface PipelineForecast {
  stage: string;
  count: number;
  value: number;
  weightedValue: number;
  probability: number;
}

export function useSalesKPI() {
  const [kpi, setKpi] = useState<SalesKPI | null>(null);
  const [forecast, setForecast] = useState<PipelineForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKPI = useCallback(async () => {
    try {
      setLoading(true);
      
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
      const currentYear = now.getFullYear().toString();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
      
      // Fetch all data in parallel
      const [
        projectsRes,
        leadsRes,
        activitiesRes,
        targetsRes,
        invoicesRes,
      ] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('leads').select('*'),
        supabase.from('activities').select('*'),
        supabase.from('sales_targets').select('*'),
        supabase.from('invoices').select('*').eq('status', 'Paid'),
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (leadsRes.error) throw leadsRes.error;
      if (activitiesRes.error) throw activitiesRes.error;
      if (targetsRes.error) throw targetsRes.error;
      if (invoicesRes.error) throw invoicesRes.error;

      const projects = projectsRes.data || [];
      const leads = leadsRes.data || [];
      const activities = activitiesRes.data || [];
      const targets = targetsRes.data || [];
      const invoices = invoicesRes.data || [];

      // Calculate revenue
      const wonProjects = projects.filter(p => p.status === 'Won' || p.status === 'Completed');
      const lostProjects = projects.filter(p => p.status === 'Lost');
      const pipelineProjects = projects.filter(p => p.status === 'Pipeline');
      
      const totalRevenue = wonProjects.reduce((sum, p) => sum + Number(p.total_value || 0), 0);
      
      // Revenue this month (from paid invoices)
      const thisMonthInvoices = invoices.filter(inv => 
        inv.paid_at && inv.paid_at.startsWith(currentMonth)
      );
      const totalRevenueThisMonth = thisMonthInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
      
      // Revenue last month
      const lastMonthInvoices = invoices.filter(inv => 
        inv.paid_at && inv.paid_at.startsWith(lastMonth)
      );
      const totalRevenueLastMonth = lastMonthInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
      
      // Revenue growth
      const revenueGrowth = totalRevenueLastMonth > 0 
        ? ((totalRevenueThisMonth - totalRevenueLastMonth) / totalRevenueLastMonth) * 100 
        : 0;

      // Deal metrics
      const totalDeals = projects.length;
      const wonDeals = wonProjects.length;
      const lostDeals = lostProjects.length;
      const pipelineDeals = pipelineProjects.length;
      const averageDealSize = wonDeals > 0 ? totalRevenue / wonDeals : 0;

      // Conversion metrics
      const closedDeals = wonDeals + lostDeals;
      const conversionRate = closedDeals > 0 ? (wonDeals / closedDeals) * 100 : 0;
      const winLossRatio = lostDeals > 0 ? wonDeals / lostDeals : wonDeals;

      // Pipeline metrics
      const pipelineValue = pipelineProjects.reduce((sum, p) => sum + Number(p.total_value || 0), 0);
      const weightedPipelineValue = pipelineProjects.reduce((sum, p) => {
        const probability = (p as any).probability || getDefaultProbability(p.pipeline_stage);
        return sum + (Number(p.total_value || 0) * probability / 100);
      }, 0);

      // Target metrics
      const monthlyTargetRecord = targets.find(t => 
        t.target_type === 'monthly' && t.target_period === currentMonth && !t.user_id
      );
      const yearlyTargetRecord = targets.find(t => 
        t.target_type === 'yearly' && t.target_period === currentYear && !t.user_id
      );
      
      const monthlyTarget = Number(monthlyTargetRecord?.target_amount || 0);
      const yearlyTarget = Number(yearlyTargetRecord?.target_amount || 0);
      const monthlyProgress = monthlyTarget > 0 ? (totalRevenueThisMonth / monthlyTarget) * 100 : 0;
      
      // Calculate yearly revenue from all paid invoices this year
      const yearlyInvoices = invoices.filter(inv => 
        inv.paid_at && inv.paid_at.startsWith(currentYear)
      );
      const totalRevenueThisYear = yearlyInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
      const yearlyProgress = yearlyTarget > 0 ? (totalRevenueThisYear / yearlyTarget) * 100 : 0;

      // Lead metrics
      const totalLeads = leads.length;
      const coldLeads = leads.filter(l => l.status === 'cold').length;
      const warmLeads = leads.filter(l => l.status === 'warm').length;
      const hotLeads = leads.filter(l => l.status === 'hot').length;
      const convertedLeads = leads.filter(l => l.converted_to_client_id).length;
      const leadConversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      // Activity metrics
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const activitiesThisWeek = activities.filter(a => a.created_at >= oneWeekAgo).length;
      const pendingFollowUps = activities.filter(a => 
        !a.is_completed && a.scheduled_at && new Date(a.scheduled_at) <= now
      ).length;

      // Pipeline forecast by stage
      const stageConfig: Record<string, number> = {
        'Meeting': 10,
        'Proposal': 30,
        'Negosiasi': 60,
        'Closing': 90,
      };
      
      const pipelineForecast: PipelineForecast[] = Object.entries(stageConfig).map(([stage, defaultProb]) => {
        const stageProjects = pipelineProjects.filter(p => p.pipeline_stage === stage);
        const value = stageProjects.reduce((sum, p) => sum + Number(p.total_value || 0), 0);
        const weightedValue = stageProjects.reduce((sum, p) => {
          const prob = (p as any).probability || defaultProb;
          return sum + (Number(p.total_value || 0) * prob / 100);
        }, 0);
        
        return {
          stage,
          count: stageProjects.length,
          value,
          weightedValue,
          probability: defaultProb,
        };
      });

      setKpi({
        totalRevenue,
        totalRevenueThisMonth,
        totalRevenueLastMonth,
        revenueGrowth,
        totalDeals,
        wonDeals,
        lostDeals,
        pipelineDeals,
        averageDealSize,
        conversionRate,
        winLossRatio,
        pipelineValue,
        weightedPipelineValue,
        monthlyTarget,
        yearlyTarget,
        monthlyProgress,
        yearlyProgress,
        totalLeads,
        coldLeads,
        warmLeads,
        hotLeads,
        leadConversionRate,
        activitiesThisWeek,
        pendingFollowUps,
      });
      
      setForecast(pipelineForecast);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching KPI:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKPI();
  }, [fetchKPI]);

  return { kpi, forecast, loading, error, refetch: fetchKPI };
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
