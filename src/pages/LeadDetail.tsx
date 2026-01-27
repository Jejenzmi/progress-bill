import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Lead, LeadStatus } from '@/hooks/useLeads';
import { Activity, ActivityType } from '@/hooks/useActivities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { LeadScoringCard } from '@/components/leads/LeadScoringCard';
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Clock,
  User,
  Thermometer,
  TrendingUp,
  Edit,
  UserPlus,
  MessageSquare,
  FileText,
  Users,
  Bell,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusConfig: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
  cold: { label: 'Cold', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  warm: { label: 'Warm', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  hot: { label: 'Hot', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const activityTypeConfig: Record<ActivityType, { label: string; icon: typeof Phone; color: string }> = {
  meeting: { label: 'Meeting', icon: Users, color: 'bg-primary text-primary-foreground' },
  call: { label: 'Call', icon: Phone, color: 'bg-info text-info-foreground' },
  email: { label: 'Email', icon: Mail, color: 'bg-warning text-warning-foreground' },
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'bg-success text-success-foreground' },
  note: { label: 'Note', icon: FileText, color: 'bg-muted text-muted-foreground' },
  follow_up: { label: 'Follow Up', icon: Bell, color: 'bg-destructive text-destructive-foreground' },
};

export default function LeadDetail() {
  const { id: leadId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch lead
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .single();

        if (leadError) throw leadError;
        setLead(leadData as Lead);

        // Fetch activities for this lead
        const { data: activityData, error: activityError } = await supabase
          .from('activities')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false });

        if (activityError) throw activityError;
        setActivities(activityData as Activity[]);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel(`lead-${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: `lead_id=eq.${leadId}` }, 
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, toast]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <AppLayout title="Lead Detail" subtitle="Memuat...">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!lead) {
    return (
      <AppLayout title="Lead Detail" subtitle="Lead tidak ditemukan">
        <div className="text-center py-20">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Lead tidak ditemukan</p>
          <Button onClick={() => navigate('/leads')} className="mt-4">
            Kembali ke Leads
          </Button>
        </div>
      </AppLayout>
    );
  }

  const statusInfo = statusConfig[lead.status];
  const completedActivities = activities.filter(a => a.is_completed);
  const pendingActivities = activities.filter(a => !a.is_completed);

  return (
    <AppLayout 
      title={lead.name} 
      subtitle={lead.company_name || 'Lead Detail'}
    >
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/leads')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Kembali ke Leads
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lead Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Main Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{lead.name}</CardTitle>
                    {lead.company_name && (
                      <CardDescription className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {lead.company_name}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <Badge className={cn(statusInfo.bgColor, statusInfo.color, 'border-0')}>
                  {statusInfo.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                {lead.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${lead.email}`} className="hover:underline text-primary">
                      {lead.email}
                    </a>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${lead.phone}`} className="hover:underline text-primary">
                      {lead.phone}
                    </a>
                  </div>
                )}
                {lead.address && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">{lead.address}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Lead Score & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Lead Score</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          lead.score >= 70 ? "bg-destructive" :
                          lead.score >= 40 ? "bg-warning" : "bg-primary"
                        )}
                        style={{ width: `${Math.min(lead.score, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold">{lead.score}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estimasi Nilai</p>
                  <p className="text-lg font-bold text-primary">
                    {lead.estimated_value > 0 ? formatCurrency(lead.estimated_value) : '-'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Additional Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-medium">{lead.source || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dibuat</span>
                  <span className="font-medium">
                    {format(new Date(lead.created_at), 'dd MMM yyyy', { locale: id })}
                  </span>
                </div>
                {lead.last_contacted_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Terakhir Dihubungi</span>
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true, locale: id })}
                    </span>
                  </div>
                )}
                {lead.next_follow_up_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Follow-up Berikutnya</span>
                    <span className="font-medium">
                      {format(new Date(lead.next_follow_up_at), 'dd MMM yyyy', { locale: id })}
                    </span>
                  </div>
                )}
              </div>

              {/* Converted Badge */}
              {lead.converted_to_client_id && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <div>
                      <p className="text-sm font-medium text-success">Converted to Client</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.converted_at && format(new Date(lead.converted_at), 'dd MMM yyyy', { locale: id })}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Lead Scoring Card */}
          <LeadScoringCard lead={lead} onScoreUpdate={(score) => setLead({ ...lead, score })} />

          {/* Notes Card */}
          {lead.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Catatan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" size="sm" onClick={() => navigate(`/activities?lead_id=${leadId}`)}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Aktivitas
              </Button>
              {!lead.converted_to_client_id && (
                <Button variant="outline" className="w-full" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Convert to Client
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Riwayat Aktivitas</CardTitle>
                  <CardDescription>
                    {activities.length} aktivitas tercatat
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => navigate(`/activities?lead_id=${leadId}`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Aktivitas Baru
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">Semua ({activities.length})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({pendingActivities.length})</TabsTrigger>
                  <TabsTrigger value="completed">Selesai ({completedActivities.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <ActivityTimeline activities={activities} />
                </TabsContent>
                <TabsContent value="pending">
                  <ActivityTimeline activities={pendingActivities} />
                </TabsContent>
                <TabsContent value="completed">
                  <ActivityTimeline activities={completedActivities} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Belum ada aktivitas</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-3 bottom-3 w-0.5 bg-border" />
      
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const typeConfig = activityTypeConfig[activity.activity_type];
          const Icon = typeConfig.icon;

          return (
            <div key={activity.id} className="relative flex gap-4">
              {/* Icon */}
              <div className={cn(
                'relative z-10 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
                activity.is_completed ? 'bg-muted' : typeConfig.color
              )}>
                {activity.is_completed ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>

              {/* Content */}
              <div className={cn(
                'flex-1 p-4 rounded-lg border',
                activity.is_completed ? 'bg-muted/30' : 'bg-card'
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className={cn(
                      'font-medium',
                      activity.is_completed && 'line-through text-muted-foreground'
                    )}>
                      {activity.subject}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {typeConfig.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: id })}
                      </span>
                    </div>
                  </div>
                  {activity.is_completed && (
                    <Badge variant="secondary" className="bg-success/10 text-success">
                      Selesai
                    </Badge>
                  )}
                </div>

                {activity.description && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                )}

                {activity.scheduled_at && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Dijadwalkan: {format(new Date(activity.scheduled_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                  </div>
                )}

                {activity.completed_at && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="h-3 w-3" />
                    Selesai: {format(new Date(activity.completed_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
