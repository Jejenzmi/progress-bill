import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLeads, Lead, LeadStatus, LeadInput } from '@/hooks/useLeads';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  Upload,
  MoreHorizontal,
  Phone,
  Mail,
  Building2,
  User,
  Thermometer,
  UserPlus,
  Loader2,
  Edit,
  Trash2,
  CheckCircle2,
  LayoutList,
  LayoutGrid,
  BarChart3,
  Tag,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeadKanbanBoard } from '@/components/leads/LeadKanbanBoard';
import { LeadAnalyticsDashboard } from '@/components/leads/LeadAnalyticsDashboard';
import { LeadSegmentation } from '@/components/leads/LeadSegmentation';
import { SalesWorkloadView } from '@/components/leads/SalesWorkloadView';

const statusConfig: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
  cold: { label: 'Cold', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  warm: { label: 'Warm', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  hot: { label: 'Hot', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const sourceOptions = [
  'Referral',
  'Website',
  'Social Media',
  'Event',
  'Cold Call',
  'Email Campaign',
  'Partner',
  'Lainnya',
];

export default function Leads() {
  const navigate = useNavigate();
  const { leads, loading, createLead, updateLead, deleteLead, updateLeadStatus, convertToClient, importLeadsFromCSV } = useLeads();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Form state
  const [form, setForm] = useState<LeadInput>({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    address: '',
    source: '',
    status: 'cold',
    estimated_value: 0,
    notes: '',
  });

  const resetForm = () => {
    setForm({
      name: '',
      company_name: '',
      email: '',
      phone: '',
      address: '',
      source: '',
      status: 'cold',
      estimated_value: 0,
      notes: '',
    });
    setSelectedLead(null);
  };

  const handleOpenDialog = (lead?: Lead) => {
    if (lead) {
      setSelectedLead(lead);
      setForm({
        name: lead.name,
        company_name: lead.company_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        address: lead.address || '',
        source: lead.source || '',
        status: lead.status,
        estimated_value: lead.estimated_value,
        notes: lead.notes || '',
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({
        title: 'Error',
        description: 'Nama lead harus diisi',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (selectedLead) {
        await updateLead(selectedLead.id, form);
        toast({ title: 'Berhasil', description: 'Lead berhasil diupdate' });
      } else {
        await createLead(form);
        toast({ title: 'Berhasil', description: 'Lead berhasil ditambahkan' });
      }
      setDialogOpen(false);
      resetForm();
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

  const handleDelete = async () => {
    if (!selectedLead) return;
    
    setDeleting(true);
    try {
      await deleteLead(selectedLead.id);
      toast({ title: 'Berhasil', description: 'Lead berhasil dihapus' });
      setDeleteDialogOpen(false);
      setSelectedLead(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (leadId: string, status: LeadStatus) => {
    try {
      await updateLeadStatus(leadId, status);
      toast({ title: 'Berhasil', description: 'Status lead diupdate' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleConvert = async (lead: Lead) => {
    try {
      await convertToClient(lead.id);
      toast({ 
        title: 'Berhasil', 
        description: `${lead.name} berhasil dikonversi menjadi client`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const leadsData: LeadInput[] = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const lead: any = {};
        
        headers.forEach((header, i) => {
          if (header === 'name' || header === 'nama') lead.name = values[i];
          if (header === 'company' || header === 'company_name' || header === 'perusahaan') lead.company_name = values[i];
          if (header === 'email') lead.email = values[i];
          if (header === 'phone' || header === 'telepon') lead.phone = values[i];
          if (header === 'address' || header === 'alamat') lead.address = values[i];
          if (header === 'source' || header === 'sumber') lead.source = values[i];
          if (header === 'status') lead.status = values[i] as LeadStatus;
          if (header === 'value' || header === 'estimated_value' || header === 'nilai') {
            lead.estimated_value = parseFloat(values[i]) || 0;
          }
        });
        
        return lead;
      }).filter(l => l.name);

      if (leadsData.length === 0) {
        toast({
          title: 'Error',
          description: 'Tidak ada data valid ditemukan dalam CSV',
          variant: 'destructive',
        });
        return;
      }

      await importLeadsFromCSV(leadsData);
      toast({ 
        title: 'Berhasil', 
        description: `${leadsData.length} leads berhasil diimport`,
      });
      setImportDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error Import',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Stats
  const stats = {
    total: leads.length,
    cold: leads.filter(l => l.status === 'cold').length,
    warm: leads.filter(l => l.status === 'warm').length,
    hot: leads.filter(l => l.status === 'hot').length,
    converted: leads.filter(l => l.converted_to_client_id).length,
  };

  if (loading) {
    return (
      <AppLayout title="Leads" subtitle="Memuat data...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Lead Management" subtitle="Kelola prospek dan leads penjualan">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Thermometer className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600">Cold</p>
                <p className="text-xl font-bold text-blue-700">{stats.cold}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Thermometer className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-yellow-600">Warm</p>
                <p className="text-xl font-bold text-yellow-700">{stats.warm}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Thermometer className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-600">Hot</p>
                <p className="text-xl font-bold text-red-700">{stats.hot}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-600">Converted</p>
                <p className="text-xl font-bold text-green-700">{stats.converted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <LayoutList className="h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="segmentation" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Segmentation
            </TabsTrigger>
            <TabsTrigger value="workload" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Workload
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Lead
            </Button>
          </div>
        </div>

        {/* List View */}
        <TabsContent value="list" className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama, perusahaan, atau email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="cold">Cold</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Leads Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Est. Value</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchQuery || statusFilter !== 'all' 
                            ? 'Tidak ada lead yang sesuai filter'
                            : 'Belum ada leads. Klik "Tambah Lead" untuk memulai.'
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.map((lead) => (
                        <TableRow 
                          key={lead.id} 
                          className={cn(
                            'cursor-pointer hover:bg-muted/50',
                            lead.converted_to_client_id ? 'bg-green-50/50' : ''
                          )}
                          onClick={() => navigate(`/leads/${lead.id}`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{lead.name}</p>
                                {lead.company_name && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {lead.company_name}
                                  </p>
                                )}
                              </div>
                              {lead.converted_to_client_id && (
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Converted
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {lead.email && (
                                <p className="text-sm flex items-center gap-1">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  {lead.email}
                                </p>
                              )}
                              {lead.phone && (
                                <p className="text-sm flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  {lead.phone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{lead.source || '-'}</span>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={lead.status}
                              onValueChange={(value) => handleStatusChange(lead.id, value as LeadStatus)}
                              disabled={!!lead.converted_to_client_id}
                            >
                              <SelectTrigger className={cn(
                                'w-24 h-8',
                                statusConfig[lead.status].bgColor,
                                statusConfig[lead.status].color
                              )}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cold">Cold</SelectItem>
                                <SelectItem value="warm">Warm</SelectItem>
                                <SelectItem value="hot">Hot</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full rounded-full",
                                    lead.score >= 70 ? "bg-destructive" :
                                    lead.score >= 40 ? "bg-warning" : "bg-info"
                                  )}
                                  style={{ width: `${lead.score}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{lead.score}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {lead.estimated_value > 0 ? formatCurrency(lead.estimated_value) : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDialog(lead)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {!lead.converted_to_client_id && (
                                  <DropdownMenuItem onClick={() => handleConvert(lead)}>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Convert to Client
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => {
                                    setSelectedLead(lead);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Hapus
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kanban View */}
        <TabsContent value="kanban">
          <LeadKanbanBoard 
            leads={leads}
            onStatusChange={handleStatusChange}
            onConvert={handleConvert}
          />
        </TabsContent>

        {/* Analytics View */}
        <TabsContent value="analytics">
          <LeadAnalyticsDashboard leads={leads} />
        </TabsContent>

        {/* Segmentation View */}
        <TabsContent value="segmentation">
          <LeadSegmentation 
            leads={leads}
            onUpdateLead={updateLead}
          />
        </TabsContent>

        {/* Workload View */}
        <TabsContent value="workload">
          <SalesWorkloadView 
            leads={leads}
            onAssignLead={async (leadId, userId) => {
              await updateLead(leadId, { assigned_to: userId });
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedLead ? 'Edit Lead' : 'Tambah Lead Baru'}
            </DialogTitle>
            <DialogDescription>
              {selectedLead ? 'Perbarui informasi lead' : 'Masukkan informasi lead baru'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama *</Label>
                <Input
                  placeholder="Nama lengkap"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Perusahaan</Label>
                <Input
                  placeholder="Nama perusahaan"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input
                  placeholder="08xxx"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm({ ...form, status: value as LeadStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">Cold</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(value) => setForm({ ...form, source: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map((src) => (
                      <SelectItem key={src} value={src}>{src}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estimasi Nilai (Rp)</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.estimated_value || ''}
                onChange={(e) => setForm({ ...form, estimated_value: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input
                placeholder="Alamat lengkap"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                placeholder="Catatan tentang lead ini..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedLead ? 'Simpan Perubahan' : 'Tambah Lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Leads dari CSV</DialogTitle>
            <DialogDescription>
              Upload file CSV dengan kolom: name, company, email, phone, source, status, value
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
            />
            <div className="bg-muted p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">Format CSV yang didukung:</p>
              <code className="text-xs">
                name,company,email,phone,source,status,value<br/>
                John Doe,PT ABC,john@email.com,08123456789,Referral,warm,50000000
              </code>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={selectedLead?.name || 'Lead'}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </AppLayout>
  );
}
