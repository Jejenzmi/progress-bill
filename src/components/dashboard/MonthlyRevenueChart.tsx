import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Loader2 } from 'lucide-react';

interface MonthlyRevenue {
  month: string;
  revenue: number;
  target: number;
}

const chartConfig = {
  revenue: {
    label: 'Pendapatan',
    color: 'hsl(var(--chart-1))',
  },
  target: {
    label: 'Target',
    color: 'hsl(var(--chart-2))',
  },
};

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
];

const formatCurrency = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}M`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(0)}Jt`;
  }
  return value.toLocaleString('id-ID');
};

export function MonthlyRevenueChart() {
  const [data, setData] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonthlyRevenue();
  }, []);

  const fetchMonthlyRevenue = async () => {
    try {
      // Get current year
      const currentYear = new Date().getFullYear();
      
      // Fetch paid invoices with their paid dates
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('amount, paid_at')
        .eq('status', 'Paid')
        .not('paid_at', 'is', null);

      if (error) throw error;

      // Fetch monthly target
      const { data: targetsData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'targets')
        .maybeSingle();

      const monthlyTarget = (targetsData?.value as any)?.monthly_target_2026 || 500000000;

      // Group by month
      const monthlyData: { [key: number]: number } = {};
      
      invoices?.forEach(inv => {
        if (inv.paid_at) {
          const paidDate = new Date(inv.paid_at);
          if (paidDate.getFullYear() === currentYear) {
            const month = paidDate.getMonth();
            monthlyData[month] = (monthlyData[month] || 0) + Number(inv.amount);
          }
        }
      });

      // Create array for all 12 months
      const chartData: MonthlyRevenue[] = monthNames.map((name, index) => ({
        month: name,
        revenue: monthlyData[index] || 0,
        target: monthlyTarget,
      }));

      setData(chartData);
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Bulanan
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Revenue Bulanan {new Date().getFullYear()}
        </CardTitle>
        <CardDescription>
          Perbandingan pendapatan aktual vs target bulanan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="month" 
              tickLine={false} 
              axisLine={false}
              tickMargin={8}
            />
            <YAxis 
              tickLine={false} 
              axisLine={false}
              tickFormatter={formatCurrency}
              width={60}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  formatter={(value, name) => (
                    <span>
                      {name === 'revenue' ? 'Pendapatan' : 'Target'}: Rp {Number(value).toLocaleString('id-ID')}
                    </span>
                  )}
                />
              }
            />
            <Bar 
              dataKey="revenue" 
              fill="var(--color-revenue)" 
              radius={[4, 4, 0, 0]}
              name="revenue"
            />
            <Bar 
              dataKey="target" 
              fill="var(--color-target)" 
              radius={[4, 4, 0, 0]}
              opacity={0.3}
              name="target"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
