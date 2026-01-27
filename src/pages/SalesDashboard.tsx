import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSalesKPI } from '@/hooks/useSalesKPI';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

export default function SalesDashboard() {
  const { kpi, forecast, loading, refetch } = useSalesKPI();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <AppLayout title="Sales Dashboard" subtitle="Memuat data...">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!kpi) {
    return (
      <AppLayout title="Sales Dashboard" subtitle="Error loading data">
        <div className="text-center py-20 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" />
          <p>Gagal memuat data KPI</p>
          <Button onClick={handleRefresh} className="mt-4">
            Coba Lagi
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Prepare chart data
  const pipelineChartData = forecast.map(f => ({
    name: f.stage,
    deals: f.count,
    value: f.value,
    weighted: f.weightedValue,
  }));

  const dealStatusData = [
    { name: 'Won', value: kpi.wonDeals, color: 'hsl(var(--success))' },
    { name: 'Lost', value: kpi.lostDeals, color: 'hsl(var(--destructive))' },
    { name: 'Pipeline', value: kpi.pipelineDeals, color: 'hsl(var(--primary))' },
  ].filter(d => d.value > 0);

  const leadStatusData = [
    { name: 'Cold', value: kpi.coldLeads, color: 'hsl(210, 40%, 60%)' },
    { name: 'Warm', value: kpi.warmLeads, color: 'hsl(45, 90%, 50%)' },
    { name: 'Hot', value: kpi.hotLeads, color: 'hsl(0, 80%, 55%)' },
  ].filter(d => d.value > 0);

  return (
    <AppLayout 
      title="Sales Dashboard" 
      subtitle="KPI dan analitik penjualan real-time"
    >
      {/* Refresh Button */}
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          Refresh Data
        </Button>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(kpi.totalRevenue)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {kpi.revenueGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    kpi.revenueGrowth >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {formatPercent(Math.abs(kpi.revenueGrowth))} vs bulan lalu
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{formatPercent(kpi.conversionRate)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpi.wonDeals} won / {kpi.wonDeals + kpi.lostDeals} closed
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Deal Size */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Deal Size</p>
                <p className="text-2xl font-bold">{formatCurrency(kpi.averageDealSize)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  dari {kpi.wonDeals} deals
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-info/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Win/Loss Ratio */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win/Loss Ratio</p>
                <p className="text-2xl font-bold">{kpi.winLossRatio.toFixed(2)}:1</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpi.wonDeals}W / {kpi.lostDeals}L
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Monthly Target */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Target Bulan Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {formatCurrency(kpi.totalRevenueThisMonth)} / {formatCurrency(kpi.monthlyTarget)}
                </span>
              </div>
              <Progress 
                value={Math.min(kpi.monthlyProgress, 100)} 
                className="h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatPercent(kpi.monthlyProgress)} tercapai</span>
                <span>
                  {kpi.monthlyProgress >= 100 ? (
                    <span className="text-success flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Target tercapai!
                    </span>
                  ) : (
                    `Kurang ${formatCurrency(kpi.monthlyTarget - kpi.totalRevenueThisMonth)}`
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Yearly Target */}
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
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {formatPercent(kpi.yearlyProgress)} tercapai
                </span>
              </div>
              <Progress 
                value={Math.min(kpi.yearlyProgress, 100)} 
                className="h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Target: {formatCurrency(kpi.yearlyTarget)}</span>
                {kpi.yearlyProgress >= 100 ? (
                  <span className="text-success flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Target tercapai!
                  </span>
                ) : (
                  <span>Estimasi: {new Date().getMonth() + 1}/12 bulan</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline & Forecast</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pipeline Value */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Pipeline Value</p>
                  <p className="text-3xl font-bold text-primary">{formatCurrency(kpi.pipelineValue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.pipelineDeals} deals aktif</p>
                </div>
              </CardContent>
            </Card>

            {/* Weighted Value */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Weighted Forecast</p>
                  <p className="text-3xl font-bold text-success">{formatCurrency(kpi.weightedPipelineValue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">berdasarkan probabilitas</p>
                </div>
              </CardContent>
            </Card>

            {/* Closing Probability */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Avg. Close Rate</p>
                  <p className="text-3xl font-bold">
                    {kpi.pipelineValue > 0 
                      ? formatPercent((kpi.weightedPipelineValue / kpi.pipelineValue) * 100)
                      : '0%'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">rata-rata probabilitas</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline Forecast Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline Forecast by Stage</CardTitle>
              <CardDescription>Nilai pipeline dan weighted forecast per stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineChartData}>
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
                    <Legend />
                    <Bar dataKey="value" name="Total Value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="weighted" name="Weighted" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deals Tab */}
        <TabsContent value="deals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Deal Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status Distribusi Deal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={dealStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {dealStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <span className="text-sm">Won: {kpi.wonDeals}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    <span className="text-sm">Lost: {kpi.lostDeals}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-sm">Pipeline: {kpi.pipelineDeals}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deal Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Deal Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span>Deals Won</span>
                  </div>
                  <span className="font-bold">{kpi.wonDeals}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span>Deals Lost</span>
                  </div>
                  <span className="font-bold">{kpi.lostDeals}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>In Pipeline</span>
                  </div>
                  <span className="font-bold">{kpi.pipelineDeals}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-info" />
                    <span>Total Deals</span>
                  </div>
                  <span className="font-bold">{kpi.totalDeals}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-2xl font-bold">{kpi.totalLeads}</p>
                <p className="text-sm text-muted-foreground">Total Leads</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6 text-center">
                <div className="w-8 h-8 mx-auto rounded-full bg-blue-200 flex items-center justify-center mb-2">
                  <span className="text-blue-700 font-bold">C</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{kpi.coldLeads}</p>
                <p className="text-sm text-blue-600">Cold Leads</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardContent className="pt-6 text-center">
                <div className="w-8 h-8 mx-auto rounded-full bg-yellow-200 flex items-center justify-center mb-2">
                  <span className="text-yellow-700 font-bold">W</span>
                </div>
                <p className="text-2xl font-bold text-yellow-700">{kpi.warmLeads}</p>
                <p className="text-sm text-yellow-600">Warm Leads</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="pt-6 text-center">
                <div className="w-8 h-8 mx-auto rounded-full bg-red-200 flex items-center justify-center mb-2">
                  <span className="text-red-700 font-bold">H</span>
                </div>
                <p className="text-2xl font-bold text-red-700">{kpi.hotLeads}</p>
                <p className="text-sm text-red-600">Hot Leads</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Lead → Client Conversion</span>
                    <span className="font-bold">{formatPercent(kpi.leadConversionRate)}</span>
                  </div>
                  <Progress value={kpi.leadConversionRate} className="h-3" />
                </div>
                <div className="text-center px-6 border-l">
                  <p className="text-3xl font-bold text-primary">{formatPercent(kpi.leadConversionRate)}</p>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Activity className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{kpi.activitiesThisWeek}</p>
                    <p className="text-sm text-muted-foreground">Aktivitas minggu ini</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={kpi.pendingFollowUps > 0 ? 'border-warning' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-14 w-14 rounded-full flex items-center justify-center",
                    kpi.pendingFollowUps > 0 ? "bg-warning/20" : "bg-success/10"
                  )}>
                    {kpi.pendingFollowUps > 0 ? (
                      <AlertCircle className="h-7 w-7 text-warning" />
                    ) : (
                      <CheckCircle2 className="h-7 w-7 text-success" />
                    )}
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{kpi.pendingFollowUps}</p>
                    <p className="text-sm text-muted-foreground">
                      {kpi.pendingFollowUps > 0 ? 'Follow-up terlambat' : 'Semua follow-up selesai'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
