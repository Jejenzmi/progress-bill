import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Building2, User, Phone, Mail, MapPin, Briefcase, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface ClientData {
  id: string;
  name: string;
  client_type: 'Pemerintah' | 'Swasta';
  pic_name: string | null;
  pic_phone: string | null;
  pic_email: string | null;
  address: string | null;
  project_count: number;
  total_value: number;
}

export default function Clients() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    client_type: 'Swasta' as 'Pemerintah' | 'Swasta',
    pic_name: '',
    pic_phone: '',
    pic_email: '',
    address: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;

      // Get project counts and values
      const clientsWithStats = await Promise.all(
        (clientsData || []).map(async (client) => {
          const { data: projects } = await supabase
            .from('projects')
            .select('total_value')
            .eq('client_id', client.id);

          return {
            ...client,
            project_count: projects?.length || 0,
            total_value: projects?.reduce((sum, p) => sum + Number(p.total_value), 0) || 0,
          };
        })
      );

      setClients(clientsWithStats);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({
        title: 'Error',
        description: 'Nama klien wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('clients').insert([{
        name: formData.name,
        client_type: formData.client_type,
        pic_name: formData.pic_name || null,
        pic_phone: formData.pic_phone || null,
        pic_email: formData.pic_email || null,
        address: formData.address || null,
      }]);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Klien berhasil ditambahkan',
      });

      setDialogOpen(false);
      resetForm();
      fetchClients();
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

  const resetForm = () => {
    setFormData({
      name: '',
      client_type: 'Swasta',
      pic_name: '',
      pic_phone: '',
      pic_email: '',
      address: '',
    });
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.pic_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  );

  const canManage = hasRole('admin') || hasRole('marketing');

  if (loading) {
    return (
      <AppLayout title="Klien" subtitle="Memuat data...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Klien" subtitle="Database klien PT Zen Multimedia Indonesia">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari klien atau PIC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Klien
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Klien Baru</DialogTitle>
                <DialogDescription>
                  Masukkan informasi klien baru
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama Klien *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Diskominfo Takalar"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipe Klien</Label>
                  <Select
                    value={formData.client_type}
                    onValueChange={(v) => setFormData({ ...formData, client_type: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pemerintah">Pemerintah</SelectItem>
                      <SelectItem value="Swasta">Swasta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama PIC</Label>
                    <Input
                      value={formData.pic_name}
                      onChange={(e) => setFormData({ ...formData, pic_name: e.target.value })}
                      placeholder="Nama kontak person"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telepon PIC</Label>
                    <Input
                      value={formData.pic_phone}
                      onChange={(e) => setFormData({ ...formData, pic_phone: e.target.value })}
                      placeholder="08xxx"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email PIC</Label>
                  <Input
                    type="email"
                    value={formData.pic_email}
                    onChange={(e) => setFormData({ ...formData, pic_email: e.target.value })}
                    placeholder="email@domain.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alamat</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Alamat lengkap"
                  />
                </div>
                <Button onClick={handleSubmit} disabled={saving} className="w-full">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Client Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Klien</p>
              <p className="text-2xl font-bold">{clients.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pemerintah</p>
              <p className="text-2xl font-bold">
                {clients.filter((c) => c.client_type === 'Pemerintah').length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Swasta</p>
              <p className="text-2xl font-bold">
                {clients.filter((c) => c.client_type === 'Swasta').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="rounded-xl border bg-card shadow-card">
        {clients.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Belum ada klien</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Klien</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>PIC</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead className="text-right">Proyek</TableHead>
                <TableHead className="text-right">Total Nilai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedClient(client)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {client.address || '-'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'status-badge',
                        client.client_type === 'Pemerintah'
                          ? 'bg-info/10 text-info'
                          : 'bg-success/10 text-success'
                      )}
                    >
                      {client.client_type}
                    </span>
                  </TableCell>
                  <TableCell>{client.pic_name || '-'}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{client.pic_phone || '-'}</p>
                      <p className="text-muted-foreground">{client.pic_email || '-'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{client.project_count}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(client.total_value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Client Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-2xl">
          {selectedClient && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedClient.name}</DialogTitle>
                <DialogDescription>
                  <span
                    className={cn(
                      'status-badge',
                      selectedClient.client_type === 'Pemerintah'
                        ? 'bg-info/10 text-info'
                        : 'bg-success/10 text-success'
                    )}
                  >
                    {selectedClient.client_type}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">PIC</p>
                      <p className="font-medium">{selectedClient.pic_name || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Telepon</p>
                      <p className="font-medium">{selectedClient.pic_phone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedClient.pic_email || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Alamat</p>
                      <p className="font-medium text-sm">{selectedClient.address || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <Briefcase className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-2xl font-bold">{selectedClient.project_count}</p>
                    <p className="text-sm text-muted-foreground">Total Proyek</p>
                  </div>
                  <div className="rounded-lg bg-primary/5 p-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(selectedClient.total_value)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Nilai Proyek</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
