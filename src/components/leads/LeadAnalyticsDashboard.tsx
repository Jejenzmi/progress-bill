import { useMemo } from 'react';
import { Lead } from '@/hooks/useLeads';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LeadAnalyticsDashboardProps {
  leads: Lead[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

const statusColors = {
  cold: '#3b82f6',
  warm: '#eab308',
  hot: '#ef4444',
  converted: '#22c55e',
};

export function LeadAnalyticsDashboard({ leads }: LeadAnalyticsDashboardProps) {
  // Calculate metrics
  const metrics = useMemo(() => {
    const total = leads.length;
    const cold = leads.filter(l => l.status === 'cold' && !l.converted_to_client_id).length;
    const warm = leads.filter(l => l.status === 'warm' && !l.converted_to_client_id).length;
    const hot = leads.filter(l => l.status === 'hot' && !l.converted_to_client_id).length;
    const converted = leads.filter(l => l.converted_to_client_id).length;
    
    const conversionRate = total > 0 ? (converted / total) * 100 : 0;
    const totalValue = leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
    const avgValue = total > 0 ? totalValue / total : 0;
    const convertedValue = leads
      .filter(l => l.converted_to_client_id)
      .reduce((sum, l) => sum + (l.estimated_value || 0), 0);

    return { total, cold, warm, hot, converted, conversionRate, totalValue, avgValue, convertedValue };
  }, [leads]);

  // Conversion Funnel Data
  const funnelData = useMemo(() => {
    const cold = leads.filter(l => l.status === 'cold' || l.status === 'warm' || l.status === 'hot' || l.converted_to_client_id).length;
    const warm = leads.filter(l => l.status === 'warm' || l.status === 'hot' || l.converted_to_client_id).length;
    const hot = leads.filter(l => l.status === 'hot' || l.converted_to_client_id).length;
    const converted = leads.filter(l => l.converted_to_client_id).length;

    return [
      { name: 'Cold Leads', value: cold, fill: statusColors.cold },
      { name: 'Warm Leads', value: warm, fill: statusColors.warm },
      { name: 'Hot Leads', value: hot, fill: statusColors.hot },
      { name: 'Converted', value: converted, fill: statusColors.converted },
    ];
  }, [leads]);

  // Status Distribution
  const statusDistribution = useMemo(() => [
    { name: 'Cold', value: metrics.cold, color: statusColors.cold },
    { name: 'Warm', value: metrics.warm, color: statusColors.warm },
    { name: 'Hot', value: metrics.hot, color: statusColors.hot },
    { name: 'Converted', value: metrics.converted, color: statusColors.converted },
  ], [metrics]);

  // Source Analysis
  const sourceAnalysis = useMemo(() => {
    const sourceMap: Record<string, { total: number; converted: number; value: number }> = {};
    
    leads.forEach(lead => {
      const source = lead.source || 'Unknown';
      if (!sourceMap[source]) {
        sourceMap[source] = { total: 0, converted: 0, value: 0 };
      }
      sourceMap[source].total++;
      if (lead.converted_to_client_id) {
        sourceMap[source].converted++;
      }
      sourceMap[source].value += lead.estimated_value || 0;
    });

    return Object.entries(sourceMap)
      .map(([source, data]) => ({
        source,
        total: data.total,
        converted: data.converted,
        conversionRate: data.total > 0 ? (data.converted / data.total) * 100 : 0,
        value: data.value,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [leads]);

  // Monthly Trend
  const monthlyTrend = useMemo(() => {
    const months: { month: string; new: number; converted: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const newLeads = leads.filter(lead => {
        try {
          const createdAt = parseISO(lead.created_at);
          return isWithinInterval(createdAt, { start: monthStart, end: monthEnd });
        } catch {
          return false;
        }
      }).length;

      const convertedLeads = leads.filter(lead => {
        if (!lead.converted_at) return false;
        try {
          const convertedAt = parseISO(lead.converted_at);
          return isWithinInterval(convertedAt, { start: monthStart, end: monthEnd });
        } catch {
          return false;
        }
      }).length;

      months.push({
        month: format(monthDate, 'MMM yy', { locale: id }),
        new: newLeads,
        converted: convertedLeads,
      });
    }

    return months;
  }, [leads]);

  // Value by Status
  const valueByStatus = useMemo(() => {
    const coldValue = leads.filter(l => l.status === 'cold' && !l.converted_to_client_id)
      .reduce((sum, l) => sum + (l.estimated_value || 0), 0);
    const warmValue = leads.filter(l => l.status === 'warm' && !l.converted_to_client_id)
      .reduce((sum, l) => sum + (l.estimated_value || 0), 0);
    const hotValue = leads.filter(l => l.status === 'hot' && !l.converted_to_client_id)
      .reduce((sum, l) => sum + (l.estimated_value || 0), 0);
    const convertedValue = leads.filter(l => l.converted_to_client_id)
      .reduce((sum, l) => sum + (l.estimated_value || 0), 0);

    return [
      { name: 'Cold', value: coldValue, fill: statusColors.cold },
      { name: 'Warm', value: warmValue, fill: statusColors.warm },
      { name: 'Hot', value: hotValue, fill: statusColors.hot },
      { name: 'Converted', value: convertedValue, fill: statusColors.converted },
    ];
  }, [leads]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{metrics.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold text-success">{metrics.conversionRate.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(metrics.totalValue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Converted Value</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(metrics.convertedValue)}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion Funnel</CardTitle>
            <CardDescription>Visualisasi alur konversi lead</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip 
                    formatter={(value: number) => [value, 'Leads']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Funnel
                    dataKey="value"
                    data={funnelData}
                    isAnimationActive
                  >
                    <LabelList position="right" fill="#666" stroke="none" dataKey="name" />
                    <LabelList position="center" fill="#fff" stroke="none" dataKey="value" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4 flex-wrap">
              {funnelData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribusi Status</CardTitle>
            <CardDescription>Pembagian lead berdasarkan status saat ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trend Bulanan</CardTitle>
            <CardDescription>Lead baru vs konversi per bulan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="new" 
                    name="Lead Baru" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="converted" 
                    name="Converted" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--success))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Source Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Analisis Sumber Lead</CardTitle>
            <CardDescription>Performa berdasarkan sumber lead</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceAnalysis} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="source" type="category" width={80} className="text-xs" />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'total') return [value, 'Total Leads'];
                      if (name === 'converted') return [value, 'Converted'];
                      return [value, name];
                    }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Legend />
                  <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="converted" name="Converted" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Value by Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Nilai Lead per Status</CardTitle>
            <CardDescription>Total estimated value berdasarkan status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={valueByStatus}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {valueByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
