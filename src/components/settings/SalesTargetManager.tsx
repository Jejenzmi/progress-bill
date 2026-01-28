import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Target, Plus, Edit, Trash2, Loader2, Calendar, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SalesTarget {
  id: string;
  target_type: string;
  target_period: string;
  target_amount: number;
  user_id: string | null;
  notes: string | null;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
};

const currentYear = new Date().getFullYear();
const months = [
  { value: `${currentYear}-01`, label: 'Januari' },
  { value: `${currentYear}-02`, label: 'Februari' },
  { value: `${currentYear}-03`, label: 'Maret' },
  { value: `${currentYear}-04`, label: 'April' },
  { value: `${currentYear}-05`, label: 'Mei' },
  { value: `${currentYear}-06`, label: 'Juni' },
  { value: `${currentYear}-07`, label: 'Juli' },
  { value: `${currentYear}-08`, label: 'Agustus' },
  { value: `${currentYear}-09`, label: 'September' },
  { value: `${currentYear}-10`, label: 'Oktober' },
  { value: `${currentYear}-11`, label: 'November' },
  { value: `${currentYear}-12`, label: 'Desember' },
];

export function SalesTargetManager() {
  const { toast } = useToast();
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<SalesTarget | null>(null);
  
  const [form, setForm] = useState({
    target_type: 'monthly',
    target_period: `${currentYear}-01`,
    target_amount: 0,
    user_id: 'global',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch targets
      const { data: targetsData, error: targetsError } = await supabase
        .from('sales_targets')
        .select('*')
        .order('target_period', { ascending: false });

      if (targetsError) throw targetsError;

      // Fetch marketing users with their profiles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'marketing');

      if (rolesError) throw rolesError;

      // Get user_ids from marketing role
      const marketingUserIds = rolesData?.map(r => r.user_id) || [];

      // Fetch profiles for those marketing users
      let profilesData: Profile[] = [];
      if (marketingUserIds.length > 0) {
        const { data, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', marketingUserIds);
        
        if (profilesError) throw profilesError;
        profilesData = data || [];
      }

      setTargets(targetsData || []);
      setProfiles(profilesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (target?: SalesTarget) => {
    if (target) {
      setSelectedTarget(target);
      setForm({
        target_type: target.target_type,
        target_period: target.target_period,
        target_amount: target.target_amount,
        user_id: target.user_id || 'global',
        notes: target.notes || '',
      });
    } else {
      setSelectedTarget(null);
      setForm({
        target_type: 'monthly',
        target_period: `${currentYear}-01`,
        target_amount: 0,
        user_id: 'global',
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (form.target_amount <= 0) {
      toast({
        title: 'Error',
        description: 'Target amount harus lebih dari 0',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const data = {
        target_type: form.target_type,
        target_period: form.target_type === 'yearly' ? currentYear.toString() : form.target_period,
        target_amount: form.target_amount,
        user_id: form.user_id === 'global' ? null : form.user_id,
        notes: form.notes || null,
      };

      if (selectedTarget) {
        const { error } = await supabase
          .from('sales_targets')
          .update(data)
          .eq('id', selectedTarget.id);
        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Target berhasil diupdate' });
      } else {
        const { error } = await supabase
          .from('sales_targets')
          .insert(data);
        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Target berhasil ditambahkan' });
      }

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sales_targets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: 'Berhasil', description: 'Target berhasil dihapus' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Company (Global)';
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.full_name || 'Unknown';
  };

  const getPeriodLabel = (target: SalesTarget) => {
    if (target.target_type === 'yearly') {
      return `Tahun ${target.target_period}`;
    }
    const month = months.find(m => m.value === target.target_period);
    return month?.label || target.target_period;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Separate global and user targets
  const globalTargets = targets.filter(t => !t.user_id);
  const userTargets = targets.filter(t => t.user_id);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Target Penjualan
            </CardTitle>
            <CardDescription>
              Kelola target bulanan dan tahunan untuk perusahaan dan per-sales
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Target
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global Targets */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Target Perusahaan (Global)
          </h4>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {globalTargets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                      Belum ada target global
                    </TableCell>
                  </TableRow>
                ) : (
                  globalTargets.map(target => (
                    <TableRow key={target.id}>
                      <TableCell>
                        <Badge variant={target.target_type === 'yearly' ? 'default' : 'secondary'}>
                          {target.target_type === 'yearly' ? 'Tahunan' : 'Bulanan'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getPeriodLabel(target)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(target.target_amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {target.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(target)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(target.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Per-User Targets */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Target Per-Sales
          </h4>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userTargets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                      Belum ada target per-sales
                    </TableCell>
                  </TableRow>
                ) : (
                  userTargets.map(target => (
                    <TableRow key={target.id}>
                      <TableCell className="font-medium">{getUserName(target.user_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {target.target_type === 'yearly' ? 'Tahunan' : 'Bulanan'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getPeriodLabel(target)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(target.target_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(target)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(target.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTarget ? 'Edit Target' : 'Tambah Target Baru'}
            </DialogTitle>
            <DialogDescription>
              Atur target penjualan untuk perusahaan atau per-sales
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipe Target</Label>
                <Select
                  value={form.target_type}
                  onValueChange={(value) => setForm({ ...form, target_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Bulanan</SelectItem>
                    <SelectItem value="yearly">Tahunan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {form.target_type === 'monthly' && (
                <div className="space-y-2">
                  <Label>Bulan</Label>
                  <Select
                    value={form.target_period}
                    onValueChange={(value) => setForm({ ...form, target_period: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(month => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label} {currentYear}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Untuk</Label>
              <Select
                value={form.user_id}
                onValueChange={(value) => setForm({ ...form, user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih target untuk..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Company (Global)</SelectItem>
                  {profiles.map(profile => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.full_name || 'Unknown User'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Amount (Rp)</Label>
              <Input
                type="number"
                value={form.target_amount || ''}
                onChange={(e) => setForm({ ...form, target_amount: parseInt(e.target.value) || 0 })}
                placeholder="500000000"
              />
              <p className="text-xs text-muted-foreground">
                {formatCurrency(form.target_amount)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Catatan (opsional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Catatan target..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedTarget ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
