import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2,
  Search,
  User,
  Building2,
  FileText,
  FolderKanban,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Calendar,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface LeadConversionHistory {
  id: string;
  leadName: string;
  companyName: string | null;
  leadCreatedAt: string;
  leadSource: string | null;
  estimatedValue: number;
  
  // Conversion milestones
  convertedAt: string | null;
  clientId: string | null;
  clientName: string | null;
  
  // Quotation info
  quotationId: string | null;
  quotationName: string | null;
  quotationValue: number | null;
  quotationCreatedAt: string | null;
  quotationApprovedAt: string | null;
  
  // Project info
  projectId: string | null;
  projectName: string | null;
  projectValue: number | null;
  projectCreatedAt: string | null;
  projectStatus: string | null;
  
  // Terms info
  termsCount: number;
  termsValue: number;
}

interface TimelineEvent {
  type: 'lead_created' | 'converted' | 'quotation_created' | 'quotation_approved' | 'project_created' | 'terms_created';
  date: string;
  title: string;
  description: string;
  value?: number;
  icon: React.ReactNode;
  color: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
};

function LeadTimelineCard({ history }: { history: LeadConversionHistory }) {
  const [expanded, setExpanded] = useState(false);

  const events: TimelineEvent[] = [];

  // Lead created
  events.push({
    type: 'lead_created',
    date: history.leadCreatedAt,
    title: 'Lead Dibuat',
    description: `Lead "${history.leadName}" dari ${history.leadSource || 'Unknown Source'}`,
    value: history.estimatedValue,
    icon: <User className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-600',
  });

  // Converted to client
  if (history.convertedAt && history.clientId) {
    events.push({
      type: 'converted',
      date: history.convertedAt,
      title: 'Konversi ke Client',
      description: `Dikonversi menjadi client "${history.clientName}"`,
      icon: <Building2 className="h-4 w-4" />,
      color: 'bg-amber-100 text-amber-600',
    });
  }

  // Quotation created
  if (history.quotationCreatedAt && history.quotationId) {
    events.push({
      type: 'quotation_created',
      date: history.quotationCreatedAt,
      title: 'Quotation Dibuat',
      description: `Quotation "${history.quotationName}" senilai ${formatCurrency(history.quotationValue || 0)}`,
      value: history.quotationValue || 0,
      icon: <FileText className="h-4 w-4" />,
      color: 'bg-purple-100 text-purple-600',
    });
  }

  // Quotation approved
  if (history.quotationApprovedAt) {
    events.push({
      type: 'quotation_approved',
      date: history.quotationApprovedAt,
      title: 'Quotation Disetujui',
      description: 'Quotation diapprove oleh COO/Admin',
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: 'bg-green-100 text-green-600',
    });
  }

  // Project created
  if (history.projectCreatedAt && history.projectId) {
    events.push({
      type: 'project_created',
      date: history.projectCreatedAt,
      title: 'Proyek Dibuat',
      description: `Proyek "${history.projectName}" senilai ${formatCurrency(history.projectValue || 0)}`,
      value: history.projectValue || 0,
      icon: <FolderKanban className="h-4 w-4" />,
      color: 'bg-green-100 text-green-600',
    });
  }

  // Terms created
  if (history.termsCount > 0) {
    events.push({
      type: 'terms_created',
      date: history.projectCreatedAt || history.leadCreatedAt,
      title: 'Termin Pembayaran Dibuat',
      description: `${history.termsCount} termin dengan total ${formatCurrency(history.termsValue)}`,
      value: history.termsValue,
      icon: <DollarSign className="h-4 w-4" />,
      color: 'bg-emerald-100 text-emerald-600',
    });
  }

  // Sort by date
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalDuration = history.projectCreatedAt
    ? Math.ceil((new Date(history.projectCreatedAt).getTime() - new Date(history.leadCreatedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const completionStatus = history.projectId 
    ? 'completed' 
    : history.quotationId 
      ? 'in_quotation' 
      : history.clientId 
        ? 'converted' 
        : 'lead';

  const statusConfig = {
    completed: { label: 'Proyek Aktif', color: 'bg-green-100 text-green-700 border-green-200' },
    in_quotation: { label: 'Proses Quotation', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    converted: { label: 'Client', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    lead: { label: 'Lead', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  };

  return (
    <Card className="overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium">{history.companyName || history.leadName}</h4>
              <Badge variant="outline" className={cn('text-xs', statusConfig[completionStatus].color)}>
                {statusConfig[completionStatus].label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{history.leadName}</p>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(history.leadCreatedAt), 'dd MMM yyyy', { locale: idLocale })}
              </span>
              {totalDuration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {totalDuration} hari
                </span>
              )}
              {history.projectValue && (
                <span className="flex items-center gap-1 text-success font-medium">
                  <Target className="h-3 w-3" />
                  {formatCurrency(history.projectValue)}
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-1 mt-3">
          {['lead', 'client', 'quotation', 'project'].map((step, index) => {
            const isComplete = 
              (step === 'lead') ||
              (step === 'client' && history.clientId) ||
              (step === 'quotation' && history.quotationId) ||
              (step === 'project' && history.projectId);
            
            return (
              <div key={step} className="flex items-center flex-1">
                <div className={cn(
                  'h-2 flex-1 rounded-full',
                  isComplete ? 'bg-primary' : 'bg-muted'
                )} />
                {index < 3 && <div className="w-1" />}
              </div>
            );
          })}
        </div>
      </div>

      {expanded && (
        <>
          <Separator />
          <div className="p-4">
            <p className="text-sm font-medium mb-4">Timeline Konversi</p>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />
              
              <div className="space-y-4">
                {events.map((event, index) => (
                  <div key={index} className="relative flex gap-4 pl-2">
                    <div className={cn(
                      'relative z-10 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                      event.color
                    )}>
                      {event.icon}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-muted-foreground">{event.description}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(event.date), 'dd MMM yyyy', { locale: idLocale })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

export function ConversionHistoryTimeline() {
  const [loading, setLoading] = useState(true);
  const [histories, setHistories] = useState<LeadConversionHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'in_progress'>('all');

  useEffect(() => {
    const fetchHistories = async () => {
      try {
        setLoading(true);

        // Fetch leads with conversion data
        const { data: leads } = await supabase
          .from('leads')
          .select('*')
          .not('converted_to_client_id', 'is', null)
          .order('converted_at', { ascending: false });

        if (!leads || leads.length === 0) {
          setHistories([]);
          setLoading(false);
          return;
        }

        // Get client IDs
        const clientIds = leads.map(l => l.converted_to_client_id).filter(Boolean) as string[];
        
        // Fetch clients
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name')
          .in('id', clientIds);

        // Fetch quotations linked to leads
        const leadIds = leads.map(l => l.id);
        const { data: quotations } = await supabase
          .from('quotations')
          .select('*')
          .in('lead_id', leadIds);

        // Fetch projects from those quotations or clients
        const quotationIds = quotations?.map(q => q.id) || [];
        let projects: any[] = [];
        
        // Only query if we have IDs to search for
        if (quotationIds.length > 0 || clientIds.length > 0) {
          const orConditions: string[] = [];
          if (quotationIds.length > 0) {
            orConditions.push(`quotation_id.in.(${quotationIds.join(',')})`);
          }
          if (clientIds.length > 0) {
            orConditions.push(`client_id.in.(${clientIds.join(',')})`);
          }
          
          const { data: projectsData } = await supabase
            .from('projects')
            .select('*')
            .or(orConditions.join(','));
          
          projects = projectsData || [];
        }

        // Fetch payment terms
        const projectIds = projects.map(p => p.id);
        let terms: any[] = [];
        
        if (projectIds.length > 0) {
          const { data: termsData } = await supabase
            .from('payment_terms')
            .select('id, project_id, amount')
            .in('project_id', projectIds);
          
          terms = termsData || [];
        }

        // Build histories
        const historiesData: LeadConversionHistory[] = leads.map(lead => {
          const client = clients?.find(c => c.id === lead.converted_to_client_id);
          const quotation = quotations?.find(q => q.lead_id === lead.id);
          const project = projects.find(p => 
            (quotation && p.quotation_id === quotation.id) || 
            p.client_id === lead.converted_to_client_id
          );
          const projectTerms = terms.filter(t => t.project_id === project?.id) || [];

          return {
            id: lead.id,
            leadName: lead.name,
            companyName: lead.company_name,
            leadCreatedAt: lead.created_at,
            leadSource: lead.source,
            estimatedValue: lead.estimated_value || 0,
            
            convertedAt: lead.converted_at,
            clientId: lead.converted_to_client_id,
            clientName: client?.name || null,
            
            quotationId: quotation?.id || null,
            quotationName: quotation?.project_name || null,
            quotationValue: quotation?.grand_total || null,
            quotationCreatedAt: quotation?.created_at || null,
            quotationApprovedAt: quotation?.approved_at || null,
            
            projectId: project?.id || null,
            projectName: project?.project_name || null,
            projectValue: project?.total_value || null,
            projectCreatedAt: project?.created_at || null,
            projectStatus: project?.status || null,
            
            termsCount: projectTerms.length,
            termsValue: projectTerms.reduce((sum, t) => sum + (t.amount || 0), 0),
          };
        });

        setHistories(historiesData);
      } catch (error) {
        console.error('Error fetching conversion histories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistories();
  }, []);

  const filteredHistories = histories.filter(h => {
    const matchesSearch = 
      h.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.projectName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'completed') {
      return matchesSearch && h.projectId;
    } else if (filter === 'in_progress') {
      return matchesSearch && !h.projectId;
    }
    
    return matchesSearch;
  });

  // Stats
  const stats = {
    total: histories.length,
    completed: histories.filter(h => h.projectId).length,
    inProgress: histories.filter(h => !h.projectId).length,
    totalValue: histories.reduce((sum, h) => sum + (h.projectValue || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Konversi</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Sampai Proyek</p>
            <p className="text-2xl font-bold text-success">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Dalam Proses</p>
            <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Nilai Proyek</p>
            <p className="text-xl font-bold">{formatCurrency(stats.totalValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari lead, perusahaan, atau proyek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Semua
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('completed')}
          >
            Selesai
          </Button>
          <Button
            variant={filter === 'in_progress' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('in_progress')}
          >
            Proses
          </Button>
        </div>
      </div>

      {/* Timeline Cards */}
      <ScrollArea className="h-[600px]">
        {filteredHistories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada riwayat konversi</p>
              <p className="text-sm mt-1">Konversi lead ke client untuk melihat riwayat</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 pr-4">
            {filteredHistories.map((history) => (
              <LeadTimelineCard key={history.id} history={history} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
