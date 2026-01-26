import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  Clock, 
  Upload, 
  FileCheck, 
  Lock, 
  AlertTriangle,
  Briefcase,
  Target,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MilestoneData {
  id: string;
  term_name: string;
  trigger_condition: string;
  trigger_description: string;
  is_locked: boolean;
  due_date: string | null;
  project_name: string;
  client_name: string;
  project_id: string;
  has_evidence: boolean;
  has_invoice: boolean;
  invoice_status: string | null;
}

const triggerLabels: Record<string, string> = {
  'SPK_SIGNED': 'SPK Ditandatangani',
  'PROGRESS_REPORT': 'Laporan Progress',
  'BAST': 'BAST',
  'MAINTENANCE': 'Maintenance',
  'CUSTOM': 'Custom',
};

const evidenceTypes = [
  { value: 'SPK', label: 'SPK/Kontrak' },
  { value: 'BAST', label: 'BAST' },
  { value: 'Laporan Progress', label: 'Laporan Progress' },
  { value: 'Faktur Pajak', label: 'Faktur Pajak' },
  { value: 'Bukti Potong PPh', label: 'Bukti Potong PPh' },
  { value: 'Lainnya', label: 'Lainnya' },
];

export default function PMDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneData | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState<string>('');

  useEffect(() => {
    fetchMilestones();
  }, []);

  const fetchMilestones = async () => {
    try {
      // Fetch payment terms with project info
      const { data: terms, error } = await supabase
        .from('payment_terms')
        .select(`
          id,
          term_name,
          trigger_condition,
          trigger_description,
          is_locked,
          due_date,
          project:projects!inner(
            id,
            project_name,
            client:clients!inner(name)
          )
        `)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      // Fetch evidences and invoices for each term
      const milestonesWithStatus = await Promise.all(
        (terms || []).map(async (term: any) => {
          const { data: evidences } = await supabase
            .from('term_evidences')
            .select('id')
            .eq('term_id', term.id);

          const { data: invoices } = await supabase
            .from('invoices')
            .select('status')
            .eq('term_id', term.id)
            .maybeSingle();

          return {
            id: term.id,
            term_name: term.term_name,
            trigger_condition: term.trigger_condition,
            trigger_description: term.trigger_description,
            is_locked: term.is_locked,
            due_date: term.due_date,
            project_name: term.project.project_name,
            client_name: term.project.client.name,
            project_id: term.project.id,
            has_evidence: (evidences?.length || 0) > 0,
            has_invoice: !!invoices,
            invoice_status: invoices?.status || null,
          };
        })
      );

      setMilestones(milestonesWithStatus);
    } catch (error) {
      console.error('Error fetching milestones:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data milestone',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedMilestone || !evidenceType || !user) return;

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${selectedMilestone.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Create evidence record
      const { error: insertError } = await supabase
        .from('term_evidences')
        .insert({
          term_id: selectedMilestone.id,
          file_type: evidenceType as any,
          file_name: selectedFile.name,
          file_path: fileName,
          file_size: selectedFile.size,
          uploaded_by: user.id,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Berhasil',
        description: 'Dokumen berhasil diupload. Termin akan di-unlock otomatis.',
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      setEvidenceType('');
      fetchMilestones();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Gagal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const getMilestoneStatus = (milestone: MilestoneData) => {
    if (milestone.invoice_status === 'Paid') {
      return { label: 'Selesai', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' };
    }
    if (milestone.has_invoice) {
      return { label: 'Menunggu Bayar', icon: Clock, color: 'text-info', bg: 'bg-info/10' };
    }
    if (milestone.has_evidence && !milestone.is_locked) {
      return { label: 'Siap Invoice', icon: FileCheck, color: 'text-success', bg: 'bg-success/10' };
    }
    if (!milestone.is_locked) {
      return { label: 'Butuh Dokumen', icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' };
    }
    return { label: 'Terkunci', icon: Lock, color: 'text-muted-foreground', bg: 'bg-muted' };
  };

  // Stats
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.invoice_status === 'Paid').length;
  const pendingMilestones = milestones.filter(m => !m.has_evidence && !m.is_locked).length;
  const readyForInvoice = milestones.filter(m => m.has_evidence && !m.has_invoice).length;

  // Group by project
  const groupedMilestones = milestones.reduce((acc, m) => {
    if (!acc[m.project_id]) {
      acc[m.project_id] = {
        project_name: m.project_name,
        client_name: m.client_name,
        milestones: [],
      };
    }
    acc[m.project_id].milestones.push(m);
    return acc;
  }, {} as Record<string, { project_name: string; client_name: string; milestones: MilestoneData[] }>);

  return (
    <AppLayout 
      title="Dashboard Project Manager" 
      subtitle="Kelola milestone proyek tanpa akses nilai komersial"
    >
      {/* Stats - No Money Values */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Milestone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Target className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{totalMilestones}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Selesai
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{completedMilestones}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Butuh Dokumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{pendingMilestones}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Siap Invoice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{readyForInvoice}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestones by Project */}
      <div className="space-y-6">
        {Object.entries(groupedMilestones).map(([projectId, data]) => (
          <Card key={projectId}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">{data.project_name}</CardTitle>
                  <CardDescription>{data.client_name}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.milestones.map((milestone) => {
                  const status = getMilestoneStatus(milestone);
                  const StatusIcon = status.icon;
                  
                  return (
                    <div
                      key={milestone.id}
                      className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', status.bg)}>
                          <StatusIcon className={cn('h-5 w-5', status.color)} />
                        </div>
                        <div>
                          <p className="font-medium">{milestone.term_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Trigger: {triggerLabels[milestone.trigger_condition] || milestone.trigger_condition}
                          </p>
                          {milestone.trigger_description && (
                            <p className="text-xs text-muted-foreground">
                              {milestone.trigger_description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={cn('status-badge', status.bg, status.color)}>
                          {status.label}
                        </span>

                        {!milestone.is_locked && !milestone.has_evidence && (
                          <Dialog open={uploadDialogOpen && selectedMilestone?.id === milestone.id} onOpenChange={(open) => {
                            setUploadDialogOpen(open);
                            if (open) setSelectedMilestone(milestone);
                          }}>
                            <DialogTrigger asChild>
                              <Button size="sm">
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Dokumen
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Upload Dokumen</DialogTitle>
                                <DialogDescription>
                                  Upload dokumen untuk {milestone.term_name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Jenis Dokumen</Label>
                                  <Select value={evidenceType} onValueChange={setEvidenceType}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih jenis dokumen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {evidenceTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>File</Label>
                                  <Input
                                    type="file"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  />
                                </div>
                                <Button
                                  onClick={handleUpload}
                                  disabled={!selectedFile || !evidenceType || uploading}
                                  className="w-full"
                                >
                                  {uploading ? 'Uploading...' : 'Upload'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}

                        {milestone.has_evidence && (
                          <Button variant="outline" size="sm">
                            <FileCheck className="h-4 w-4 mr-2" />
                            Lihat Dokumen
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {Object.keys(groupedMilestones).length === 0 && !loading && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada milestone proyek</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
