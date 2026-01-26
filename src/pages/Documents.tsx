import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Filter, Upload, FileText, FileCheck, Download, Eye, FolderOpen, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type EvidenceType = 'BAST' | 'Laporan Progress' | 'Faktur Pajak' | 'Bukti Potong PPh' | 'SPK' | 'Lainnya';

const documentTypes = [
  { value: 'all', label: 'Semua Jenis' },
  { value: 'SPK', label: 'SPK/Kontrak' },
  { value: 'BAST', label: 'BAST' },
  { value: 'Laporan Progress', label: 'Laporan Progress' },
  { value: 'Faktur Pajak', label: 'Faktur Pajak' },
  { value: 'Bukti Potong PPh', label: 'Bukti Potong PPh' },
];

const evidenceTypeOptions = [
  { value: 'SPK', label: 'SPK/Kontrak' },
  { value: 'BAST', label: 'BAST' },
  { value: 'Laporan Progress', label: 'Laporan Progress' },
  { value: 'Faktur Pajak', label: 'Faktur Pajak' },
  { value: 'Bukti Potong PPh', label: 'Bukti Potong PPh' },
  { value: 'Lainnya', label: 'Lainnya' },
];

const typeColors: Record<string, string> = {
  SPK: 'bg-primary/10 text-primary',
  BAST: 'bg-success/10 text-success',
  'Laporan Progress': 'bg-info/10 text-info',
  'Faktur Pajak': 'bg-warning/10 text-warning',
  'Bukti Potong PPh': 'bg-muted text-muted-foreground',
  Lainnya: 'bg-muted text-muted-foreground',
};

interface DocumentData {
  id: string;
  file_type: EvidenceType;
  file_name: string;
  file_path: string;
  term_id: string;
  term_name: string;
  project_id: string;
  project_name: string;
  client_name: string;
  uploaded_at: string;
  uploaded_by_name: string;
}

interface TermForUpload {
  id: string;
  term_name: string;
  project_name: string;
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function Documents() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [termsForUpload, setTermsForUpload] = useState<TermForUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [selectedDocType, setSelectedDocType] = useState<string>('');

  useEffect(() => {
    fetchDocuments();
    fetchTermsForUpload();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('term_evidences')
        .select(`
          id,
          file_type,
          file_name,
          file_path,
          created_at,
          term_id,
          term:payment_terms!inner(
            term_name,
            project:projects!inner(
              id,
              project_name,
              client:clients!inner(name)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDocuments(
        (data || []).map((doc) => ({
          id: doc.id,
          file_type: doc.file_type as EvidenceType,
          file_name: doc.file_name,
          file_path: doc.file_path,
          term_id: doc.term_id,
          term_name: (doc.term as any).term_name,
          project_id: (doc.term as any).project.id,
          project_name: (doc.term as any).project.project_name,
          client_name: (doc.term as any).project.client.name,
          uploaded_at: doc.created_at,
          uploaded_by_name: 'User',
        }))
      );
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTermsForUpload = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_terms')
        .select(`
          id,
          term_name,
          is_locked,
          project:projects!inner(project_name)
        `)
        .eq('is_locked', false);

      if (error) throw error;

      setTermsForUpload(
        (data || []).map((t) => ({
          id: t.id,
          term_name: t.term_name,
          project_name: (t.project as any).project_name,
        }))
      );
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedTermId || !selectedDocType || !user) return;

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${selectedTermId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Create evidence record
      const { error: insertError } = await supabase
        .from('term_evidences')
        .insert([{
          term_id: selectedTermId,
          file_type: selectedDocType as any,
          file_name: selectedFile.name,
          file_path: fileName,
          file_size: selectedFile.size,
          uploaded_by: user.id,
        }]);

      if (insertError) throw insertError;

      toast({
        title: 'Berhasil',
        description: 'Dokumen berhasil diupload',
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      setSelectedTermId('');
      setSelectedDocType('');
      fetchDocuments();
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

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'Download Gagal',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.project_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.file_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Group by project
  const documentsByProject = filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.project_id]) {
      acc[doc.project_id] = {
        project_name: doc.project_name,
        client_name: doc.client_name,
        documents: [],
      };
    }
    acc[doc.project_id].documents.push(doc);
    return acc;
  }, {} as Record<string, { project_name: string; client_name: string; documents: DocumentData[] }>);

  // Stats
  const totalDocs = documents.length;
  const spkCount = documents.filter((d) => d.file_type === 'SPK').length;
  const bastCount = documents.filter((d) => d.file_type === 'BAST').length;
  const progressCount = documents.filter((d) => d.file_type === 'Laporan Progress').length;

  const canUpload = hasRole('admin') || hasRole('marketing') || hasRole('project_manager');

  if (loading) {
    return (
      <AppLayout title="Dokumen" subtitle="Memuat data...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dokumen" subtitle="Repository dokumen proyek (SPK, BAST, Faktur Pajak, dll)">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Dokumen</p>
              <p className="text-2xl font-bold">{totalDocs}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">SPK/Kontrak</p>
              <p className="text-2xl font-bold">{spkCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">BAST</p>
              <p className="text-2xl font-bold">{bastCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Laporan</p>
              <p className="text-2xl font-bold">{progressCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari dokumen atau proyek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter Jenis" />
          </SelectTrigger>
          <SelectContent>
            {documentTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canUpload && (
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Dokumen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Dokumen</DialogTitle>
                <DialogDescription>
                  Upload dokumen untuk termin yang sudah aktif
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Termin</Label>
                  <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih termin" />
                    </SelectTrigger>
                    <SelectContent>
                      {termsForUpload.map((term) => (
                        <SelectItem key={term.id} value={term.id}>
                          {term.project_name} - {term.term_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jenis Dokumen</Label>
                  <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis dokumen" />
                    </SelectTrigger>
                    <SelectContent>
                      {evidenceTypeOptions.map((type) => (
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
                  disabled={!selectedFile || !selectedTermId || !selectedDocType || uploading}
                  className="w-full"
                >
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Documents by Project */}
      <div className="space-y-6">
        {Object.entries(documentsByProject).map(([projectId, data]) => (
          <div key={projectId} className="rounded-xl border bg-card shadow-card">
            <div className="flex items-center gap-3 border-b px-5 py-4">
              <FolderOpen className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold">{data.project_name}</h3>
                <p className="text-sm text-muted-foreground">{data.client_name}</p>
              </div>
              <span className="ml-auto text-sm text-muted-foreground">
                {data.documents.length} dokumen
              </span>
            </div>
            <div className="divide-y">
              {data.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('status-badge text-xs', typeColors[doc.file_type])}>
                        {doc.file_type}
                      </span>
                      <span className="text-xs text-muted-foreground">{doc.term_name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatDate(doc.uploaded_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(doc.file_path, doc.file_name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(documentsByProject).length === 0 && (
          <div className="text-center py-12 rounded-xl border bg-card">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Tidak ada dokumen ditemukan</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
