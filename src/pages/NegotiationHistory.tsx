import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Calendar, TrendingDown, Percent, FileText, Filter, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
} from 'recharts';

interface NegotiationRecord {
  id: string;
  project_name: string;
  client_name: string;
  grand_total: number | null;
  negotiated_price: number | null;
  negotiated_at: string | null;
  negotiated_by: string | null;
  negotiation_notes: string | null;
  margin_percentage: number | null;
  created_at: string;
  negotiator_name?: string;
}

interface Client {
  id: string;
  name: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function NegotiationHistory() {
  const [records, setRecords] = useState<NegotiationRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('all');

  useEffect(() => {
    fetchClients();
    fetchRecords();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');
    
    if (data) setClients(data);
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('quotations')
        .select(`
          id,
          project_name,
          grand_total,
          negotiated_price,
          negotiated_at,
          negotiated_by,
          negotiation_notes,
          margin_percentage,
          created_at,
          client_id,
          clients (name)
        `)
        .not('negotiated_price', 'is', null)
        .order('negotiated_at', { ascending: false });

      // Apply date filters
      if (startDate) {
        query = query.gte('negotiated_at', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('negotiated_at', `${endDate}T23:59:59`);
      }
      if (selectedClient && selectedClient !== 'all') {
        query = query.eq('client_id', selectedClient);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch negotiator names
      const negotiatorIds = [...new Set(data?.map(r => r.negotiated_by).filter(Boolean) as string[])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', negotiatorIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      const recordsWithNames = (data || []).map(r => ({
        ...r,
        client_name: (r.clients as any)?.name || 'N/A',
        negotiator_name: r.negotiated_by ? profileMap.get(r.negotiated_by) || 'Unknown' : 'N/A',
      }));

      setRecords(recordsWithNames);
    } catch (error) {
      console.error('Error fetching negotiation records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchRecords();
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setSelectedClient('all');
    setTimeout(fetchRecords, 100);
  };

  const calculateDiscount = (original: number, negotiated: number) => {
    if (!original || !negotiated) return { amount: 0, percentage: 0 };
    const amount = original - negotiated;
    const percentage = (amount / original) * 100;
    return { amount, percentage };
  };

  const totalOriginal = records.reduce((sum, r) => sum + (r.grand_total || 0), 0);
  const totalNegotiated = records.reduce((sum, r) => sum + (r.negotiated_price || 0), 0);
  const totalDiscount = totalOriginal - totalNegotiated;
  const avgDiscountPct = totalOriginal > 0 ? (totalDiscount / totalOriginal) * 100 : 0;

  // Group data by month for chart
  const monthlyChartData = useMemo(() => {
    const monthlyMap = new Map<string, { 
      month: string; 
      totalOriginal: number; 
      totalNegotiated: number; 
      count: number;
      totalDiscount: number;
    }>();

    records.forEach(r => {
      if (!r.negotiated_at) return;
      const monthKey = format(new Date(r.negotiated_at), 'yyyy-MM');
      const monthLabel = format(new Date(r.negotiated_at), 'MMM yyyy', { locale: idLocale });
      
      const existing = monthlyMap.get(monthKey) || {
        month: monthLabel,
        totalOriginal: 0,
        totalNegotiated: 0,
        count: 0,
        totalDiscount: 0,
      };

      const original = r.grand_total || 0;
      const negotiated = r.negotiated_price || 0;
      
      existing.totalOriginal += original;
      existing.totalNegotiated += negotiated;
      existing.totalDiscount += (original - negotiated);
      existing.count += 1;

      monthlyMap.set(monthKey, existing);
    });

    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, data]) => ({
        ...data,
        avgDiscountPct: data.totalOriginal > 0 
          ? ((data.totalDiscount / data.totalOriginal) * 100)
          : 0,
        totalOriginalM: data.totalOriginal / 1000000,
        totalNegotiatedM: data.totalNegotiated / 1000000,
      }));
  }, [records]);

  const exportToCSV = () => {
    const headers = ['Tanggal Negosiasi', 'Proyek', 'Klien', 'Harga Awal', 'Harga Deal', 'Diskon', 'Diskon %', 'Margin %', 'Negosiator', 'Catatan'];
    const rows = records.map(r => {
      const disc = calculateDiscount(r.grand_total || 0, r.negotiated_price || 0);
      return [
        r.negotiated_at ? format(new Date(r.negotiated_at), 'dd/MM/yyyy HH:mm') : '',
        r.project_name,
        r.client_name,
        r.grand_total || 0,
        r.negotiated_price || 0,
        disc.amount,
        disc.percentage.toFixed(1),
        r.margin_percentage || '',
        r.negotiator_name || '',
        r.negotiation_notes || '',
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `riwayat-negosiasi-${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  return (
    <AppLayout title="Riwayat Negosiasi">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Riwayat Negosiasi</h1>
          <p className="text-muted-foreground">
            Laporan harga negosiasi quotation
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotation</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{records.length}</div>
            <p className="text-xs text-muted-foreground">dengan harga negosiasi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Harga Awal</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOriginal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Harga Deal</CardTitle>
            <TrendingDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalNegotiated)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Diskon</CardTitle>
            <Percent className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">-{avgDiscountPct.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalDiscount)} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      {monthlyChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Tren Diskon Negosiasi per Bulan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}jt`}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'avgDiscountPct') return [`${value.toFixed(1)}%`, 'Rata-rata Diskon'];
                      return [`Rp ${(value * 1000000).toLocaleString('id-ID')}`, name === 'totalOriginalM' ? 'Harga Awal' : 'Harga Deal'];
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="totalOriginalM" 
                    name="Harga Awal (jt)" 
                    fill="hsl(var(--muted-foreground))" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="totalNegotiatedM" 
                    name="Harga Deal (jt)" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="avgDiscountPct" 
                    name="Rata-rata Diskon (%)" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--destructive))' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Tanggal Mulai</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Tanggal Akhir</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Klien</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Klien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Klien</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleFilter} className="flex-1">
                Terapkan Filter
              </Button>
              <Button onClick={handleReset} variant="outline">
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada data negosiasi</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Klien</TableHead>
                  <TableHead className="text-right">Harga Awal</TableHead>
                  <TableHead className="text-right">Harga Deal</TableHead>
                  <TableHead className="text-center">Diskon</TableHead>
                  <TableHead className="text-center">Margin</TableHead>
                  <TableHead>Negosiator</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const disc = calculateDiscount(record.grand_total || 0, record.negotiated_price || 0);
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {record.negotiated_at
                            ? format(new Date(record.negotiated_at), 'dd MMM yyyy', { locale: idLocale })
                            : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {record.project_name}
                      </TableCell>
                      <TableCell>{record.client_name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(record.grand_total || 0)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(record.negotiated_price || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={disc.percentage > 0 ? 'destructive' : 'default'}>
                          {disc.percentage > 0 ? '-' : ''}{Math.abs(disc.percentage).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {record.margin_percentage ? (
                          <Badge variant="outline">{record.margin_percentage}%</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{record.negotiator_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {record.negotiation_notes || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    </AppLayout>
  );
}
