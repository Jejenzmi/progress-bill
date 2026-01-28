import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { TermStatusCard } from '@/components/dashboard/TermStatusCard';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { EditProjectDialog } from '@/components/projects/EditProjectDialog';
import { EvidenceList } from '@/components/projects/EvidenceList';
import { ProjectBonusWidget } from '@/components/projects/ProjectBonusWidget';
import { useProjects, ProjectWithDetails } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Search, Filter, Loader2, Briefcase, Pencil, Upload, FileText, FileCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ProjectStatus = Database['public']['Enums']['project_status'];
type EvidenceType = Database['public']['Enums']['evidence_type'];
type TermEvidence = Database['public']['Tables']['term_evidences']['Row'];

const statusFilters: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Status' },
  { value: 'Pipeline', label: 'Pipeline' },
  { value: 'Won', label: 'Berjalan' },
  { value: 'Completed', label: 'Selesai' },
  { value: 'Lost', label: 'Batal' },
];

const STATUS_COLORS: Record<ProjectStatus, string> = {
  Pipeline: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  Won: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const EVIDENCE_TYPES: EvidenceType[] = ['BAST', 'Laporan Progress', 'Faktur Pajak', 'Bukti Potong PPh', 'SPK', 'Lainnya'];

export default function Projects() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const { projects, loading, refetch } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [selectedProject, setSelectedProject] = useState<ProjectWithDetails | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithDetails | null>(null);
  
  // Upload evidence state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadingTerm, setUploadingTerm] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('SPK');
  const [uploading, setUploading] = useState(false);

  const canCreateProject = hasRole('admin') || hasRole('marketing');
  const canCreateInvoice = hasRole('admin') || hasRole('finance');
  const canUploadEvidence = hasRole('admin') || hasRole('finance') || hasRole('project_manager') || hasRole('marketing');

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusStats = (status: ProjectStatus) => {
    const statusProjects = projects.filter((p) => p.status === status);
    return {
      count: statusProjects.length,
      value: statusProjects.reduce((sum, p) => sum + Number(p.total_value), 0),
    };
  };

  // Generate invoice for a term
  const handleGenerateInvoice = async (term: any, project: ProjectWithDetails) => {
    try {
      // Get invoice settings for prefix
      const { data: settingsData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'invoice_settings')
        .maybeSingle();

      const invoiceSettings = settingsData?.value as Record<string, unknown> | null;
      const prefix = (invoiceSettings?.prefix as string) || 'INV/ZEN';
      const defaultTopDays = (invoiceSettings?.default_top_days as number) || 14;

      // Generate invoice number
      const now = new Date();
      const month = now.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase();
      const year = now.getFullYear();
      
      // Get next sequence number
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true });
      
      const sequence = (count || 0) + 1;
      const invoiceNumber = `${sequence.toString().padStart(3, '0')}/${prefix}/${month}/${year}`;

      // Calculate due date
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + defaultTopDays);

      // Insert invoice
      const { error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          term_id: term.id,
          project_id: project.id,
          amount: term.amount,
          invoice_date: now.toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          status: 'Draft',
        });

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: `Invoice ${invoiceNumber} berhasil dibuat. Mengarahkan ke halaman Invoice...`,
      });

      // Navigate to invoices page
      setSelectedProject(null);
      navigate('/invoices');
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal membuat invoice',
        variant: 'destructive',
      });
    }
  };

  // Open upload evidence dialog
  const openUploadDialog = (term: any) => {
    setUploadingTerm(term);
    setSelectedFile(null);
    setEvidenceType('SPK');
    setUploadDialogOpen(true);
  };

  // Handle file upload
  const handleUploadEvidence = async () => {
    if (!selectedFile || !uploadingTerm) return;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${uploadingTerm.id}/${Date.now()}.${fileExt}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Insert evidence record
      const { error: insertError } = await supabase
        .from('term_evidences')
        .insert({
          term_id: uploadingTerm.id,
          file_type: evidenceType,
          file_name: selectedFile.name,
          file_path: fileName,
          file_size: selectedFile.size,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Berhasil',
        description: 'Dokumen berhasil diupload',
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadingTerm(null);
      refetch();
    } catch (error: any) {
      console.error('Error uploading evidence:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengupload dokumen',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout title="Proyek" subtitle="Kelola semua proyek klien Anda">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari proyek atau klien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as ProjectStatus | 'all')}
          >
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              {statusFilters.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canCreateProject && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Proyek Baru
            </Button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statusFilters.slice(1).map((status) => {
          const stats = getStatusStats(status.value as ProjectStatus);
          return (
            <button
              key={status.value}
              onClick={() => setStatusFilter(status.value as ProjectStatus)}
              className={cn(
                'rounded-lg border p-4 text-left transition-all hover:shadow-card-hover',
                statusFilter === status.value
                  ? 'border-primary bg-primary/5'
                  : 'bg-card'
              )}
            >
              <p className="text-sm text-muted-foreground">{status.label}</p>
              <p className="text-2xl font-bold mt-1">{stats.count}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(stats.value)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className="rounded-lg border bg-card p-4 cursor-pointer transition-all hover:shadow-card-hover hover:border-primary/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Briefcase className="h-4 w-4 text-primary" />
                    </div>
                    <Badge className={STATUS_COLORS[project.status]} variant="secondary">
                      {project.status}
                    </Badge>
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                  {project.project_name}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {project.client?.name || 'No client'}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Nilai</span>
                  <span className="font-semibold">{formatCurrency(Number(project.total_value))}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-muted-foreground">Termin</span>
                  <span>{project.payment_terms.length}</span>
                </div>
              </div>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Tidak ada proyek ditemukan</p>
            </div>
          )}
        </>
      )}

      {/* Project Detail Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-xl">
                      {selectedProject.project_name}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedProject.client?.name || 'No client'}
                    </DialogDescription>
                  </div>
                  {canCreateProject && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingProject(selectedProject);
                        setSelectedProject(null);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Quotation Info */}
                {selectedProject.quotation ? (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileCheck className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Informasi Quotation</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Status Quotation</p>
                        <Badge 
                          variant="secondary" 
                          className={
                            selectedProject.quotation.approval_status === 'approved' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : selectedProject.quotation.approval_status === 'rejected'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : selectedProject.quotation.approval_status === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }
                        >
                          {selectedProject.quotation.approval_status === 'approved' ? 'Disetujui' 
                           : selectedProject.quotation.approval_status === 'rejected' ? 'Ditolak'
                           : selectedProject.quotation.approval_status === 'pending' ? 'Menunggu Approval'
                           : 'Draft'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Nilai Quotation</p>
                        <p className="font-semibold">{formatCurrency(Number(selectedProject.quotation.grand_total || 0))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Berlaku Hingga</p>
                        <p className="font-semibold">
                          {selectedProject.quotation.valid_until 
                            ? new Date(selectedProject.quotation.valid_until).toLocaleDateString('id-ID')
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Disetujui Pada</p>
                        <p className="font-semibold">
                          {selectedProject.quotation.approved_at 
                            ? new Date(selectedProject.quotation.approved_at).toLocaleDateString('id-ID')
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertCircle className="h-5 w-5" />
                      <p className="text-sm">Proyek ini tidak terhubung dengan Quotation</p>
                    </div>
                  </div>
                )}

                {/* Project Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Nilai Proyek</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(Number(selectedProject.total_value))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={STATUS_COLORS[selectedProject.status]} variant="secondary">
                      {selectedProject.status}
                    </Badge>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Total Termin</p>
                    <p className="text-lg font-bold">{selectedProject.payment_terms.length}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Terbayar</p>
                    <p className="text-lg font-bold text-success">
                      {formatCurrency(
                        selectedProject.payment_terms
                          .filter((t) => t.invoice?.status === 'Paid')
                          .reduce((sum, t) => sum + Number(t.amount), 0)
                      )}
                    </p>
                  </div>
                </div>

                {/* Payment Terms */}
                <div>
                  <h3 className="font-semibold mb-3">Termin Pembayaran</h3>
                  {selectedProject.payment_terms.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                      {selectedProject.payment_terms.map((term) => (
                        <div key={term.id} className="rounded-lg border bg-card p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">{term.term_name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {term.percentage}% - {formatCurrency(Number(term.amount))}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {term.invoice ? (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                  Invoice: {term.invoice.invoice_number}
                                </Badge>
                              ) : term.is_locked ? (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                  Terkunci
                                </Badge>
                              ) : term.evidences.length > 0 ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  Siap Invoice
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-red-100 text-red-800">
                                  Butuh Dokumen
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Trigger Info */}
                          <div className="text-sm text-muted-foreground mb-4">
                            <span className="font-medium">Trigger: </span>
                            {term.trigger_description || term.trigger_condition}
                          </div>

                          {/* Evidence List */}
                          {term.evidences.length > 0 && (
                            <div className="mb-4">
                              <EvidenceList
                                evidences={term.evidences}
                                canDelete={canUploadEvidence}
                                onDelete={() => refetch()}
                              />
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            {canUploadEvidence && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openUploadDialog(term)}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                {term.evidences.length > 0 ? 'Tambah Dokumen' : 'Upload Dokumen'}
                              </Button>
                            )}
                            {canCreateInvoice && !term.invoice && !term.is_locked && term.evidences.length > 0 && selectedProject.status === 'Won' && (
                              <Button
                                size="sm"
                                onClick={() => handleGenerateInvoice(term, selectedProject)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Buat Invoice
                              </Button>
                            )}
                            {canCreateInvoice && !term.invoice && !term.is_locked && term.evidences.length > 0 && selectedProject.status !== 'Won' && (
                              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                                <AlertCircle className="h-4 w-4" />
                                <span>Invoice hanya bisa dibuat jika status proyek "Won"</span>
                              </div>
                            )}
                            {term.invoice && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedProject(null);
                                  navigate('/invoices');
                                }}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Lihat Invoice
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Belum ada termin pembayaran
                    </p>
                  )}
                </div>

                {/* Team Bonus Widget - Only for Won/Completed projects */}
                {(selectedProject.status === 'Won' || selectedProject.status === 'Completed') && (
                  <ProjectBonusWidget
                    projectId={selectedProject.id}
                    projectValue={Number(selectedProject.total_value)}
                    marginPercentage={selectedProject.quotation?.margin_percentage 
                      ? Number(selectedProject.quotation.margin_percentage) 
                      : 20}
                  />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Evidence Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Dokumen
            </DialogTitle>
            <DialogDescription>
              Upload dokumen pendukung untuk termin {uploadingTerm?.term_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Jenis Dokumen</Label>
              <Select value={evidenceType} onValueChange={(v) => setEvidenceType(v as EvidenceType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis dokumen" />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>File</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
              </div>
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{selectedFile.name}</span>
                  <span className="text-xs">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUploadEvidence} disabled={!selectedFile || uploading}>
              {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={refetch}
      />

      {/* Edit Project Dialog */}
      <EditProjectDialog
        project={editingProject}
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
        onSuccess={refetch}
      />
    </AppLayout>
  );
}
