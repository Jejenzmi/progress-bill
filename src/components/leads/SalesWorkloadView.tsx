import { useState, useMemo, useEffect } from 'react';
import { Lead, LeadStatus } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  TrendingUp,
  Target,
  Award,
  ArrowUpDown,
  UserPlus,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';

interface SalesWorkloadViewProps {
  leads: Lead[];
  onAssignLead: (leadId: string, userId: string) => Promise<void>;
}

interface SalesUser {
  id: string;
  full_name: string;
}

interface SalesPerformance {
  userId: string;
  name: string;
  initials: string;
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  convertedLeads: number;
  totalValue: number;
  conversionRate: number;
  avgDealSize: number;
}

export function SalesWorkloadView({ leads, onAssignLead }: SalesWorkloadViewProps) {
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'leads' | 'value' | 'conversion'>('leads');

  useEffect(() => {
    const fetchSalesUsers = async () => {
      try {
        // Get users with marketing role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'marketing');

        if (roleData && roleData.length > 0) {
          const userIds = roleData.map(r => r.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);

          if (profiles) {
            setSalesUsers(profiles.map(p => ({
              id: p.user_id,
              full_name: p.full_name || 'Unknown User',
            })));
          }
        }
      } catch (error) {
        console.error('Error fetching sales users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesUsers();
  }, []);

  // Calculate performance metrics for each sales user
  const performanceData = useMemo((): SalesPerformance[] => {
    const userMap = new Map<string, SalesPerformance>();

    // Initialize with known sales users
    salesUsers.forEach(user => {
      const nameParts = user.full_name.split(' ');
      const initials = nameParts.map(n => n[0]).join('').toUpperCase().slice(0, 2);
      userMap.set(user.id, {
        userId: user.id,
        name: user.full_name,
        initials,
        totalLeads: 0,
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
        convertedLeads: 0,
        totalValue: 0,
        conversionRate: 0,
        avgDealSize: 0,
      });
    });

    // Count leads for each user
    leads.forEach(lead => {
      if (!lead.assigned_to) return;

      let perf = userMap.get(lead.assigned_to);
      if (!perf) {
        // Unknown user, create entry
        perf = {
          userId: lead.assigned_to,
          name: 'Unknown',
          initials: '??',
          totalLeads: 0,
          hotLeads: 0,
          warmLeads: 0,
          coldLeads: 0,
          convertedLeads: 0,
          totalValue: 0,
          conversionRate: 0,
          avgDealSize: 0,
        };
        userMap.set(lead.assigned_to, perf);
      }

      perf.totalLeads++;
      perf.totalValue += lead.estimated_value || 0;

      if (lead.converted_to_client_id) {
        perf.convertedLeads++;
      } else {
        switch (lead.status) {
          case 'hot':
            perf.hotLeads++;
            break;
          case 'warm':
            perf.warmLeads++;
            break;
          case 'cold':
            perf.coldLeads++;
            break;
        }
      }
    });

    // Calculate rates
    userMap.forEach(perf => {
      if (perf.totalLeads > 0) {
        perf.conversionRate = (perf.convertedLeads / perf.totalLeads) * 100;
        perf.avgDealSize = perf.totalValue / perf.totalLeads;
      }
    });

    const result = Array.from(userMap.values());

    // Sort based on selected criteria
    switch (sortBy) {
      case 'value':
        return result.sort((a, b) => b.totalValue - a.totalValue);
      case 'conversion':
        return result.sort((a, b) => b.conversionRate - a.conversionRate);
      default:
        return result.sort((a, b) => b.totalLeads - a.totalLeads);
    }
  }, [leads, salesUsers, sortBy]);

  // Unassigned leads
  const unassignedLeads = useMemo(() => {
    return leads.filter(l => !l.assigned_to && !l.converted_to_client_id);
  }, [leads]);

  // Workload comparison chart data
  const workloadChartData = useMemo(() => {
    return performanceData.map(p => ({
      name: p.name.split(' ')[0],
      Cold: p.coldLeads,
      Warm: p.warmLeads,
      Hot: p.hotLeads,
      Converted: p.convertedLeads,
    }));
  }, [performanceData]);

  // Radar chart data for top performers
  const radarData = useMemo(() => {
    const top3 = performanceData.slice(0, 3);
    const metrics = ['Total Leads', 'Hot Leads', 'Conversion Rate', 'Avg Deal Size', 'Total Value'];
    
    // Normalize data
    const maxValues = {
      totalLeads: Math.max(...performanceData.map(p => p.totalLeads), 1),
      hotLeads: Math.max(...performanceData.map(p => p.hotLeads), 1),
      conversionRate: Math.max(...performanceData.map(p => p.conversionRate), 1),
      avgDealSize: Math.max(...performanceData.map(p => p.avgDealSize), 1),
      totalValue: Math.max(...performanceData.map(p => p.totalValue), 1),
    };

    return metrics.map((metric, i) => {
      const entry: Record<string, any> = { metric };
      top3.forEach((p, idx) => {
        let value = 0;
        switch (i) {
          case 0: value = (p.totalLeads / maxValues.totalLeads) * 100; break;
          case 1: value = (p.hotLeads / maxValues.hotLeads) * 100; break;
          case 2: value = (p.conversionRate / maxValues.conversionRate) * 100; break;
          case 3: value = (p.avgDealSize / maxValues.avgDealSize) * 100; break;
          case 4: value = (p.totalValue / maxValues.totalValue) * 100; break;
        }
        entry[p.name.split(' ')[0]] = Math.round(value);
      });
      return entry;
    });
  }, [performanceData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sales Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{salesUsers.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads Belum Ditugaskan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{unassignedLeads.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rata-rata Leads/Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">
                {salesUsers.length > 0 
                  ? Math.round(leads.length / salesUsers.length) 
                  : 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Best Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">
                {performanceData.length > 0 
                  ? `${Math.max(...performanceData.map(p => p.conversionRate)).toFixed(0)}%`
                  : '0%'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Workload Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribusi Workload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Cold" stackId="a" fill="hsl(var(--chart-1))" />
                  <Bar dataKey="Warm" stackId="a" fill="hsl(var(--chart-2))" />
                  <Bar dataKey="Hot" stackId="a" fill="hsl(var(--chart-3))" />
                  <Bar dataKey="Converted" stackId="a" fill="hsl(var(--chart-4))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance Comparison Radar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Perbandingan Performa (Top 3)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  {performanceData.slice(0, 3).map((p, idx) => (
                    <Radar
                      key={p.userId}
                      name={p.name.split(' ')[0]}
                      dataKey={p.name.split(' ')[0]}
                      stroke={`hsl(var(--chart-${idx + 1}))`}
                      fill={`hsl(var(--chart-${idx + 1}))`}
                      fillOpacity={0.3}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Team Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Performa Tim Sales</CardTitle>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leads">Jumlah Leads</SelectItem>
                <SelectItem value="value">Total Value</SelectItem>
                <SelectItem value="conversion">Conversion Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {performanceData.map((perf, idx) => (
              <div
                key={perf.userId}
                className="flex items-center gap-4 p-3 border rounded-lg"
              >
                <div className="flex items-center gap-1 w-6 text-muted-foreground">
                  {idx === 0 && <Award className="h-4 w-4 text-yellow-500" />}
                  {idx !== 0 && <span className="text-sm">#{idx + 1}</span>}
                </div>
                
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {perf.initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{perf.name}</h4>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {perf.coldLeads} Cold
                    </Badge>
                    <Badge variant="default" className="text-xs bg-yellow-100 text-yellow-700">
                      {perf.warmLeads} Warm
                    </Badge>
                    <Badge variant="destructive" className="text-xs">
                      {perf.hotLeads} Hot
                    </Badge>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <p className="text-sm font-semibold">{formatCurrency(perf.totalValue)}</p>
                  <p className="text-xs text-muted-foreground">
                    Conv: {perf.conversionRate.toFixed(0)}% | {perf.convertedLeads} deals
                  </p>
                </div>
              </div>
            ))}

            {performanceData.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Belum ada data tim sales
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unassigned Leads */}
      {unassignedLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Leads Belum Ditugaskan ({unassignedLeads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unassignedLeads.slice(0, 5).map(lead => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{lead.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {lead.company_name || '-'} • {formatCurrency(lead.estimated_value)}
                    </p>
                  </div>
                  <Select onValueChange={(userId) => onAssignLead(lead.id, userId)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Tugaskan ke..." />
                    </SelectTrigger>
                    <SelectContent>
                      {salesUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              {unassignedLeads.length > 5 && (
                <p className="text-center text-sm text-muted-foreground">
                  ... dan {unassignedLeads.length - 5} leads lainnya
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
