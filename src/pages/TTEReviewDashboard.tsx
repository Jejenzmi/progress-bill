import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TTEApprovalDialog } from '@/components/documents/TTEApprovalDialog';
import { 
  FileSignature, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText,
  Loader2,
  Eye,
  RefreshCw,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface SignedDocument {
  id: string;
  original_file_name: string;
  original_file_path: string;
  signed_file_path: string | null;
  file_type: string;
  file_size: number | null;
  qr_position: string;
  qr_page?: number;
  signer_name: string;
  signer_position: string;
  signed_at: string;
  created_at: string;
  tte_status?: string;
  signer_type?: string;
  submitted_by?: string;
  submitted_at?: string;
  rejection_reason?: string;
}

interface TTEStats {
  pending: number;
  signed: number;
  rejected: number;
  total: number;
}

export default function TTEReviewDashboard() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  
  const [documents, setDocuments] = useState<SignedDocument[]>([]);
  const [pendingDocs, setPendingDocs] = useState<SignedDocument[]>([]);
  const [stats, setStats] = useState<TTEStats>({ pending: 0, signed: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<SignedDocument | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [submitterNames, setSubmitterNames] = useState<Record<string, string>>({});

  const isCOO = hasRole('coo');
  const isCEO = hasRole('admin');

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // Determine which signer_type to filter based on user role
      let signerTypeFilter: string[] = [];
      if (isCEO) {
        signerTypeFilter = ['ceo', 'coo']; // CEO can see both
      } else if (isCOO) {
        signerTypeFilter = ['coo'];
      }

      const { data, error } = await supabase
        .from('signed_documents')
        .select('*')
        .in('signer_type', signerTypeFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const docs = data || [];
      setDocuments(docs);
      
      // Filter pending documents
      const pending = docs.filter(d => d.tte_status === 'pending');
      setPendingDocs(pending);
      
      // Calculate stats
      setStats({
        pending: docs.filter(d => d.tte_status === 'pending').length,
        signed: docs.filter(d => d.tte_status === 'signed').length,
        rejected: docs.filter(d => d.tte_status === 'rejected').length,
        total: docs.length,
      });

      // Fetch submitter names
      const submitterIds = [...new Set(docs.map(d => d.submitted_by).filter(Boolean))];
      if (submitterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', submitterIds);
        
        if (profiles) {
          const names: Record<string, string> = {};
          profiles.forEach(p => {
            if (p.user_id && p.full_name) {
              names[p.user_id] = p.full_name;
            }
          });
          setSubmitterNames(names);
        }
      }
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data dokumen',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (doc: SignedDocument) => {
    setSelectedDoc(doc);
    setApprovalDialogOpen(true);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'signed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />Signed</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  if (!isCOO && !isCEO) {
    return (
      <AppLayout title="Akses Ditolak">
        <div className="flex items-center justify-center h-full">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Akses Ditolak
              </CardTitle>
              <CardDescription>
                Halaman ini hanya dapat diakses oleh COO atau CEO.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Review TTE" subtitle="Kelola permintaan tanda tangan elektronik">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSignature className="h-6 w-6" />
              Review TTE Dokumen
            </h1>
            <p className="text-muted-foreground">
              Kelola permintaan tanda tangan elektronik yang memerlukan persetujuan Anda
            </p>
          </div>
          <Button variant="outline" onClick={fetchDocuments} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menunggu Review</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">dokumen pending</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disetujui</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.signed}</div>
              <p className="text-xs text-muted-foreground">dokumen signed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ditolak</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground">dokumen rejected</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">semua dokumen</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Documents - Priority Section */}
        {pendingDocs.length > 0 && (
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="bg-orange-50 dark:bg-orange-900/20">
              <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
                <AlertTriangle className="h-5 w-5" />
                Dokumen Menunggu Persetujuan ({pendingDocs.length})
              </CardTitle>
              <CardDescription>
                Dokumen-dokumen berikut memerlukan review dan persetujuan Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dokumen</TableHead>
                      <TableHead>Penandatangan</TableHead>
                      <TableHead>Diajukan Oleh</TableHead>
                      <TableHead>Tanggal Pengajuan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingDocs.map((doc) => (
                      <TableRow key={doc.id} className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium truncate max-w-[200px]">{doc.original_file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : '-'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{doc.signer_name}</p>
                            <p className="text-xs text-muted-foreground">{doc.signer_position}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {doc.submitted_by ? submitterNames[doc.submitted_by] || '-' : '-'}
                          </p>
                        </TableCell>
                        <TableCell>
                          {doc.submitted_at && (
                            <p className="text-sm">
                              {format(new Date(doc.submitted_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => handleReview(doc)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* All Documents History */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Dokumen TTE</CardTitle>
            <CardDescription>
              Semua dokumen yang pernah diajukan untuk ditandatangani oleh Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileSignature className="h-12 w-12 mb-4 opacity-50" />
                <p>Belum ada dokumen yang diajukan</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dokumen</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Diajukan Oleh</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium truncate max-w-[200px]">{doc.original_file_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(doc.tte_status)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="uppercase">
                            {doc.signer_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {doc.submitted_by ? submitterNames[doc.submitted_by] || '-' : '-'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: id })}
                        </TableCell>
                        <TableCell className="text-right">
                          {doc.tte_status === 'pending' ? (
                            <Button size="sm" onClick={() => handleReview(doc)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                setSelectedDoc(doc);
                                setApprovalDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detail
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approval Dialog */}
      <TTEApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        document={selectedDoc}
        mode={selectedDoc?.tte_status === 'pending' ? 'review' : 'view'}
        onSuccess={fetchDocuments}
      />
    </AppLayout>
  );
}
