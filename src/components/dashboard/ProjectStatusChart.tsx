import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChartIcon, Loader2 } from 'lucide-react';

interface StatusCount {
  name: string;
  value: number;
  fill: string;
}

const chartConfig = {
  Pipeline: {
    label: 'Pipeline',
    color: 'hsl(var(--chart-1))',
  },
  Won: {
    label: 'Won',
    color: 'hsl(var(--chart-2))',
  },
  Lost: {
    label: 'Lost',
    color: 'hsl(var(--chart-5))',
  },
  Completed: {
    label: 'Completed',
    color: 'hsl(var(--chart-4))',
  },
};

const STATUS_COLORS: { [key: string]: string } = {
  Pipeline: 'hsl(var(--chart-1))',
  Won: 'hsl(var(--chart-2))',
  Lost: 'hsl(var(--chart-5))',
  Completed: 'hsl(var(--chart-4))',
};

export function ProjectStatusChart() {
  const [data, setData] = useState<StatusCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchProjectStatus();
  }, []);

  const fetchProjectStatus = async () => {
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('status');

      if (error) throw error;

      // Count by status
      const statusCounts: { [key: string]: number } = {
        Pipeline: 0,
        Won: 0,
        Lost: 0,
        Completed: 0,
      };

      projects?.forEach(project => {
        if (statusCounts[project.status] !== undefined) {
          statusCounts[project.status]++;
        }
      });

      const chartData: StatusCount[] = Object.entries(statusCounts)
        .filter(([_, count]) => count > 0)
        .map(([name, value]) => ({
          name,
          value,
          fill: STATUS_COLORS[name],
        }));

      setData(chartData);
      setTotal(projects?.length || 0);
    } catch (error) {
      console.error('Error fetching project status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Status Proyek
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-primary" />
            Status Proyek
          </CardTitle>
          <CardDescription>Distribusi proyek berdasarkan status</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <p className="text-muted-foreground">Belum ada data proyek</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Status Proyek
        </CardTitle>
        <CardDescription>
          Total {total} proyek terdaftar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <PieChart>
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  formatter={(value, name) => (
                    <span>{name}: {value} proyek</span>
                  )}
                />
              }
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </PieChart>
        </ChartContainer>
        
        {/* Stats below chart */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-sm text-muted-foreground">{item.name}:</span>
              <span className="text-sm font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
