import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSalesPerformance, UserPerformance } from '@/hooks/useSalesPerformance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Trophy,
  TrendingUp,
  Users,
  Target,
  Loader2,
  Medal,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

const formatCurrencyFull = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--info))', 'hsl(var(--destructive))'];

export default function SalesReport() {
  const { performances, monthlyData, loading } = useSalesPerformance();
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const tableRef = useRef<HTMLDivElement>(null);

  const exportToExcel = () => {
    // Create CSV content
    const headers = [
      'Sales',
      'Total Deals',
      'Won',
      'Lost',
      'Pipeline',
      'Total Revenue',
      'Revenue Bulan Ini',
      'Conversion Rate',
      'Avg Deal Size',
      'Total Activities',
      'Total Leads',
      'Lead Conversion',
    ];

    const rows = performances.map(p => [
      p.userName,
      p.totalDeals,
      p.wonDeals,
      p.lostDeals,
      p.pipelineDeals,
      p.totalRevenue,
      p.revenueThisMonth,
      `${p.conversionRate.toFixed(1)}%`,
      p.avgDealSize,
      p.totalActivities,
      p.totalLeads,
      `${p.leadConversionRate.toFixed(1)}%`,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Laporan Performa Sales', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, 28, { align: 'center' });

    // Summary
    const totalRevenue = performances.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalDeals = performances.reduce((sum, p) => sum + p.wonDeals, 0);
    const avgConversion = performances.length > 0 
      ? performances.reduce((sum, p) => sum + p.conversionRate, 0) / performances.length 
      : 0;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan:', 14, 40);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Revenue: ${formatCurrencyFull(totalRevenue)}`, 14, 48);
    doc.text(`Total Deals Won: ${totalDeals}`, 14, 55);
    doc.text(`Rata-rata Conversion: ${avgConversion.toFixed(1)}%`, 14, 62);

    // Table
    let y = 75;
    const colWidths = [50, 20, 20, 20, 20, 35, 35, 25, 35];
    const headers = ['Sales', 'Deals', 'Won', 'Lost', 'Pipeline', 'Revenue', 'This Month', 'Conv.', 'Avg Deal'];

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    let x = 14;
    headers.forEach((header, i) => {
      doc.text(header, x + 2, y);
      x += colWidths[i];
    });

    // Rows
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += 8;

    performances.forEach((p, index) => {
      if (y > 180) {
        doc.addPage();
        y = 20;
      }

      if (index % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        doc.rect(14, y - 4, pageWidth - 28, 7, 'F');
      }

      x = 14;
      const row = [
        p.userName.substring(0, 20),
        p.totalDeals.toString(),
        p.wonDeals.toString(),
        p.lostDeals.toString(),
        p.pipelineDeals.toString(),
        formatCurrency(p.totalRevenue),
        formatCurrency(p.revenueThisMonth),
        `${p.conversionRate.toFixed(0)}%`,
        formatCurrency(p.avgDealSize),
      ];

      row.forEach((cell, i) => {
        doc.text(cell, x + 2, y);
        x += colWidths[i];
      });

      y += 7;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Generated by Sales Order - PT Zen Multimedia Indonesia', pageWidth / 2, 200, { align: 'center' });

    doc.save(`sales-performance-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) {
    return (
      <AppLayout title="Sales Report" subtitle="Memuat data...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Calculate totals
  const totalRevenue = performances.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalDealsWon = performances.reduce((sum, p) => sum + p.wonDeals, 0);
  const avgConversion = performances.length > 0 
    ? performances.reduce((sum, p) => sum + p.conversionRate, 0) / performances.length 
    : 0;

  // Top performers
  const topByRevenue = [...performances].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
  const topByDeals = [...performances].sort((a, b) => b.wonDeals - a.wonDeals)[0];
  const topByConversion = [...performances].sort((a, b) => b.conversionRate - a.conversionRate)[0];

  // Chart data for performance comparison
  const performanceChartData = performances.slice(0, 5).map(p => ({
    name: p.userName.split(' ')[0],
    revenue: p.totalRevenue,
    deals: p.wonDeals,
  }));

  return (
    <AppLayout title="Sales Performance Report" subtitle="Laporan performa tim sales">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Waktu</SelectItem>
            <SelectItem value="year">Tahun Ini</SelectItem>
            <SelectItem value="quarter">Kuartal Ini</SelectItem>
            <SelectItem value="month">Bulan Ini</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
        <Button onClick={exportToPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deals Won</p>
                <p className="text-2xl font-bold">{totalDealsWon}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{performances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-info/10 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Conversion</p>
                <p className="text-2xl font-bold">{avgConversion.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {topByRevenue && (
          <Card className="border-yellow-300 bg-yellow-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Trophy className="h-7 w-7 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-yellow-700 font-medium">Top Revenue</p>
                  <p className="font-bold text-lg">{topByRevenue.userName}</p>
                  <p className="text-sm text-yellow-600">{formatCurrency(topByRevenue.totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {topByDeals && (
          <Card className="border-gray-300 bg-gray-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center">
                  <Medal className="h-7 w-7 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Top Deals</p>
                  <p className="font-bold text-lg">{topByDeals.userName}</p>
                  <p className="text-sm text-gray-600">{topByDeals.wonDeals} deals won</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {topByConversion && (
          <Card className="border-orange-300 bg-orange-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center">
                  <Award className="h-7 w-7 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-orange-600 font-medium">Top Conversion</p>
                  <p className="font-bold text-lg">{topByConversion.userName}</p>
                  <p className="text-sm text-orange-600">{topByConversion.conversionRate.toFixed(1)}% rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Performance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perbandingan Revenue (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip formatter={(value: number) => formatCurrencyFull(value)} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trend Revenue Bulanan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip formatter={(value: number, name) => [
                    name === 'revenue' ? formatCurrencyFull(value) : value,
                    name === 'revenue' ? 'Revenue' : name
                  ]} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detail Performa Sales</CardTitle>
          <CardDescription>Performa lengkap per sales person</CardDescription>
        </CardHeader>
        <CardContent className="p-0" ref={tableRef}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead className="text-center">Deals</TableHead>
                  <TableHead className="text-center">Won/Lost</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-center">Conv. Rate</TableHead>
                  <TableHead className="text-right">Avg Deal</TableHead>
                  <TableHead className="text-center">Activities</TableHead>
                  <TableHead className="text-center">Leads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Belum ada data performa
                    </TableCell>
                  </TableRow>
                ) : (
                  performances.map((p, index) => (
                    <TableRow key={p.userId}>
                      <TableCell>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{p.userName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{p.totalDeals}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-success font-medium">{p.wonDeals}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="text-destructive">{p.lostDeals}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(p.totalRevenue)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={p.conversionRate} className="h-2 w-16" />
                          <span className="text-sm font-medium">{p.conversionRate.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(p.avgDealSize)}
                      </TableCell>
                      <TableCell className="text-center">
                        {p.totalActivities}
                      </TableCell>
                      <TableCell className="text-center">
                        <span>{p.totalLeads}</span>
                        <span className="text-muted-foreground text-xs ml-1">
                          ({p.leadConversionRate.toFixed(0)}%)
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
