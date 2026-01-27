import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useActivities, Activity, ActivityType, ActivityInput } from '@/hooks/useActivities';
import { useLeads } from '@/hooks/useLeads';
import { useClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  Bell,
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, addHours } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const activityTypeConfig: Record<ActivityType, { label: string; icon: typeof Phone; color: string }> = {
  meeting: { label: 'Meeting', icon: Users, color: 'bg-primary/10 text-primary' },
  call: { label: 'Call', icon: Phone, color: 'bg-info/10 text-info' },
  email: { label: 'Email', icon: Mail, color: 'bg-warning/10 text-warning' },
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'bg-success/10 text-success' },
  note: { label: 'Note', icon: FileText, color: 'bg-muted text-muted-foreground' },
  follow_up: { label: 'Follow Up', icon: Bell, color: 'bg-destructive/10 text-destructive' },
};

export default function Activities() {
  const { activities, loading, createActivity, updateActivity, completeActivity, deleteActivity } = useActivities();
  const { leads } = useLeads();
  const { clients } = useClients();
  const { projects } = useProjects();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [form, setForm] = useState<ActivityInput>({
    activity_type: 'call',
    subject: '',
    description: '',
    lead_id: '',
    client_id: '',
    project_id: '',
    scheduled_at: '',
    reminder_at: '',
  });

  const [relationType, setRelationType] = useState<'lead' | 'client' | 'project'>('lead');

  const resetForm = () => {
    setForm({
      activity_type: 'call',
      subject: '',
      description: '',
      lead_id: '',
      client_id: '',
      project_id: '',
      scheduled_at: '',
      reminder_at: '',
    });
    setRelationType('lead');
    setSelectedActivity(null);
  };

  const handleOpenDialog = (activity?: Activity) => {
    if (activity) {
      setSelectedActivity(activity);
      setForm({
        activity_type: activity.activity_type,
        subject: activity.subject,
        description: activity.description || '',
        lead_id: activity.lead_id || '',
        client_id: activity.client_id || '',
        project_id: activity.project_id || '',
        scheduled_at: activity.scheduled_at ? activity.scheduled_at.slice(0, 16) : '',
        reminder_at: activity.reminder_at ? activity.reminder_at.slice(0, 16) : '',
      });
      if (activity.lead_id) setRelationType('lead');
      else if (activity.client_id) setRelationType('client');
      else if (activity.project_id) setRelationType('project');
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.subject.trim()) {
      toast({
        title: 'Error',
        description: 'Subject harus diisi',
        variant: 'destructive',
      });
      return;
    }

    const relationId = relationType === 'lead' ? form.lead_id :
                       relationType === 'client' ? form.client_id : form.project_id;
    
    if (!relationId) {
      toast({
        title: 'Error',
        description: `Pilih ${relationType} untuk aktivitas ini`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const inputData: ActivityInput = {
        activity_type: form.activity_type,
        subject: form.subject,
        description: form.description || undefined,
        scheduled_at: form.scheduled_at || undefined,
        reminder_at: form.reminder_at || undefined,
      };

      // Set the correct relation
      if (relationType === 'lead') inputData.lead_id = form.lead_id;
      else if (relationType === 'client') inputData.client_id = form.client_id;
      else inputData.project_id = form.project_id;

      if (selectedActivity) {
        await updateActivity(selectedActivity.id, inputData);
        toast({ title: 'Berhasil', description: 'Aktivitas berhasil diupdate' });
      } else {
        await createActivity(inputData);
        toast({ title: 'Berhasil', description: 'Aktivitas berhasil ditambahkan' });
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

  const handleComplete = async (activity: Activity) => {
    try {
      await completeActivity(activity.id);
      toast({ title: 'Berhasil', description: 'Aktivitas selesai' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedActivity) return;

    setDeleting(true);
    try {
      await deleteActivity(selectedActivity.id);
      toast({ title: 'Berhasil', description: 'Aktivitas dihapus' });
      setDeleteDialogOpen(false);
      setSelectedActivity(null);
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

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || activity.activity_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Categorize activities
  const pendingActivities = filteredActivities.filter(a => !a.is_completed);
  const completedActivities = filteredActivities.filter(a => a.is_completed);
  const overdueActivities = pendingActivities.filter(a => 
    a.scheduled_at && isPast(new Date(a.scheduled_at))
  );
  const todayActivities = pendingActivities.filter(a => 
    a.scheduled_at && isToday(new Date(a.scheduled_at))
  );

  const getRelationName = (activity: Activity): string => {
    if (activity.lead) return activity.lead.company_name || activity.lead.name;
    if (activity.client) return activity.client.name;
    if (activity.project) return activity.project.project_name;
    return '-';
  };

  const getScheduleStatus = (activity: Activity) => {
    if (!activity.scheduled_at) return null;
    const date = new Date(activity.scheduled_at);
    if (activity.is_completed) return { label: 'Selesai', variant: 'success' as const };
    if (isPast(date)) return { label: 'Terlambat', variant: 'destructive' as const };
    if (isToday(date)) return { label: 'Hari Ini', variant: 'warning' as const };
    if (isTomorrow(date)) return { label: 'Besok', variant: 'secondary' as const };
    return null;
  };

  if (loading) {
    return (
      <AppLayout title="Activity Log" subtitle="Memuat data...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Activity Log" subtitle="Kelola aktivitas sales dan follow-up">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{activities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hari Ini</p>
                <p className="text-xl font-bold">{todayActivities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={overdueActivities.length > 0 ? 'border-destructive' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Terlambat</p>
                <p className="text-xl font-bold text-destructive">{overdueActivities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selesai</p>
                <p className="text-xl font-bold">{completedActivities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari aktivitas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            {Object.entries(activityTypeConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Aktivitas
        </Button>
      </div>

      {/* Activities Tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingActivities.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Selesai ({completedActivities.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {pendingActivities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-success" />
                <p>Tidak ada aktivitas pending</p>
              </CardContent>
            </Card>
          ) : (
            pendingActivities.map((activity) => {
              const typeConfig = activityTypeConfig[activity.activity_type];
              const Icon = typeConfig.icon;
              const scheduleStatus = getScheduleStatus(activity);
              
              return (
                <Card key={activity.id} className={cn(
                  scheduleStatus?.variant === 'destructive' && 'border-destructive'
                )}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'h-10 w-10 rounded-lg flex items-center justify-center',
                        typeConfig.color
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium">{activity.subject}</h4>
                            <p className="text-sm text-muted-foreground">
                              {getRelationName(activity)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {scheduleStatus && (
                              <Badge variant={scheduleStatus.variant === 'success' ? 'default' : 
                                            scheduleStatus.variant === 'destructive' ? 'destructive' :
                                            'secondary'}>
                                {scheduleStatus.label}
                              </Badge>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleComplete(activity)}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Tandai Selesai
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenDialog(activity)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => {
                                    setSelectedActivity(activity);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Hapus
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className={typeConfig.color}>
                            {typeConfig.label}
                          </Badge>
                          {activity.scheduled_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(activity.scheduled_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3">
          {completedActivities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>Belum ada aktivitas yang selesai</p>
              </CardContent>
            </Card>
          ) : (
            completedActivities.map((activity) => {
              const typeConfig = activityTypeConfig[activity.activity_type];
              const Icon = typeConfig.icon;
              
              return (
                <Card key={activity.id} className="opacity-75">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'h-10 w-10 rounded-lg flex items-center justify-center',
                        typeConfig.color
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium line-through text-muted-foreground">
                              {activity.subject}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {getRelationName(activity)}
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Selesai
                          </Badge>
                        </div>
                        
                        {activity.completed_at && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Selesai: {format(new Date(activity.completed_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedActivity ? 'Edit Aktivitas' : 'Tambah Aktivitas'}
            </DialogTitle>
            <DialogDescription>
              Catat aktivitas sales atau jadwalkan follow-up
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipe Aktivitas *</Label>
                <Select
                  value={form.activity_type}
                  onValueChange={(value) => setForm({ ...form, activity_type: value as ActivityType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(activityTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Terkait dengan</Label>
                <Select
                  value={relationType}
                  onValueChange={(value) => setRelationType(value as 'lead' | 'client' | 'project')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {relationType === 'lead' && (
              <div className="space-y-2">
                <Label>Pilih Lead *</Label>
                <Select
                  value={form.lead_id}
                  onValueChange={(value) => setForm({ ...form, lead_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name} {lead.company_name ? `(${lead.company_name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {relationType === 'client' && (
              <div className="space-y-2">
                <Label>Pilih Client *</Label>
                <Select
                  value={form.client_id}
                  onValueChange={(value) => setForm({ ...form, client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {relationType === 'project' && (
              <div className="space-y-2">
                <Label>Pilih Project *</Label>
                <Select
                  value={form.project_id}
                  onValueChange={(value) => setForm({ ...form, project_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                placeholder="Judul aktivitas"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                placeholder="Detail aktivitas..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jadwal</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reminder</Label>
                <Input
                  type="datetime-local"
                  value={form.reminder_at}
                  onChange={(e) => setForm({ ...form, reminder_at: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedActivity ? 'Simpan Perubahan' : 'Tambah Aktivitas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={selectedActivity?.subject || 'Aktivitas'}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </AppLayout>
  );
}
