import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PDFPreviewDialog } from '@/components/PDFPreviewDialog';
import { generateQuotationPDF, type QuotationItem, type CompanyProfile, type TTESettings } from '@/lib/quotationPdfGenerator';
import { useUserTTE } from '@/hooks/useUserTTE';
import { QuotationApprovalDialog } from '@/components/quotations/QuotationApprovalDialog';
import { CreateProjectFromQuotationDialog } from '@/components/quotations/CreateProjectFromQuotationDialog';
import { NegotiatedPriceDialog } from '@/components/quotations/NegotiatedPriceDialog';
import { NegotiationApprovalDialog } from '@/components/quotations/NegotiationApprovalDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Download,
  FileText,
  Loader2,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  FolderPlus,
  HandCoins,
  Percent,
  RefreshCw,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface Quotation {
  id: string;
  project_name: string;
  client_id: string | null;
  man_days: QuotationItem[];
  grand_total: number | null;
  valid_until: string | null;
  status: string | null;
  approval_status: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  created_by: string | null;
  margin_percentage: number | null;
  negotiated_price: number | null;
  negotiated_at: string | null;
  negotiated_by: string | null;
  negotiation_notes: string | null;
  negotiation_status: string | null;
  negotiation_approved_at: string | null;
  negotiation_approved_by: string | null;
  negotiation_rejection_reason: string | null;
  clients?: {
    name: string;
    address: string | null;
  } | null;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function QuotationList() {
  const { toast } = useToast();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const { fetchTTEForPDF } = useUserTTE();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Approval workflow states
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [approvalMode, setApprovalMode] = useState<'submit' | 'review'>('submit');
  
  // Create project from quotation states
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [quotationForProject, setQuotationForProject] = useState<Quotation | null>(null);
  
  // Negotiated price dialog states
  const [negotiatedPriceDialogOpen, setNegotiatedPriceDialogOpen] = useState(false);
  const [quotationForNegotiation, setQuotationForNegotiation] = useState<Quotation | null>(null);
  
  // Negotiation approval dialog states
  const [negotiationApprovalDialogOpen, setNegotiationApprovalDialogOpen] = useState(false);
  const [quotationForNegotiationApproval, setQuotationForNegotiationApproval] = useState<Quotation | null>(null);
  
  const canReviewNegotiation = hasRole('admin') || hasRole('bdo') || hasRole('coo');
  
  const canReview = hasRole('admin') || hasRole('coo');
  const canSubmit = hasRole('admin') || hasRole('bdo') || hasRole('marketing');
  const canCreateProject = hasRole('admin') || hasRole('bdo') || hasRole('marketing');

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          clients (
            name,
            address
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setQuotations((data || []) as unknown as Quotation[]);
    } catch (error: any) {
      console.error('Error fetching quotations:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data quotation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCompanyProfile = async (): Promise<CompanyProfile> => {
    const { data: companyData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'company_profile')
      .maybeSingle();

    const value = companyData?.value as Record<string, unknown> | null;

    return {
      name: (value?.name as string) || 'PT. ZEN MULTIMEDIA INDONESIA',
      npwp: (value?.npwp as string) || '-',
      address: (value?.address as string) || 'Jl. Taman Pahlawan No.166, Purwamekar, Purwakarta, Jawa Barat - Indonesia',
      phone: (value?.phone as string) || '085121045798',
      email: (value?.email as string) || 'info@zenmultimedia.co.id',
      website: (value?.website as string) || 'www.zenmultimedia.co.id',
      bank_info: (value?.bank_info as string) || '-',
      logo_url: (value?.logo_url as string) || '',
    };
  };

  // TTE settings now come from useUserTTE hook - fetchTTEForPDF()

  const handlePreview = async (quotation: Quotation) => {
    setPreviewLoading(true);
    try {
      const company = await getCompanyProfile();
      const tteSettings = await fetchTTEForPDF();
      
      const items = Array.isArray(quotation.man_days) ? quotation.man_days : [];
      const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
      const ppnAmount = Math.round(subtotal * 0.11);
      const grandTotal = subtotal + ppnAmount;

      const validUntil = quotation.valid_until 
        ? new Date(quotation.valid_until) 
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const quotationData = {
        quotationNumber: `QUO-${quotation.id.substring(0, 8).toUpperCase()}`,
        quotationDate: new Date(quotation.created_at),
        validUntil,
        clientName: quotation.clients?.name || 'Klien',
        clientAddress: quotation.clients?.address || '',
        projectName: quotation.project_name,
        items,
        subtotal,
        ppnPercentage: 11,
        ppnAmount,
        grandTotal,
      };

      const html = await generateQuotationPDF(quotationData, company, tteSettings);
      setPreviewHtml(html);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: 'Error',
        description: 'Gagal membuat preview',
        variant: 'destructive',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (quotation: Quotation) => {
    setDownloadLoading(quotation.id);
    try {
      const company = await getCompanyProfile();
      const tteSettings = await fetchTTEForPDF();
      
      const items = Array.isArray(quotation.man_days) ? quotation.man_days : [];
      const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
      const ppnAmount = Math.round(subtotal * 0.11);
      const grandTotal = subtotal + ppnAmount;

      const validUntil = quotation.valid_until 
        ? new Date(quotation.valid_until) 
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const quotationNumber = `QUO-${quotation.id.substring(0, 8).toUpperCase()}`;
      
      const quotationData = {
        quotationNumber,
        quotationDate: new Date(quotation.created_at),
        validUntil,
        clientName: quotation.clients?.name || 'Klien',
        clientAddress: quotation.clients?.address || '',
        projectName: quotation.project_name,
        items,
        subtotal,
        ppnPercentage: 11,
        ppnAmount,
        grandTotal,
      };

      const html = await generateQuotationPDF(quotationData, company, tteSettings);
      
      // Generate verification ID (same as in PDF generator)
      const verificationId = btoa(quotationNumber).substring(0, 16).toUpperCase();
      
      // Save to signed_documents if TTE is enabled
      if (tteSettings?.enabled !== false && tteSettings?.signer_name) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          // Check if this quotation was already signed
          const { data: existing } = await supabase
            .from('signed_documents')
            .select('id')
            .eq('verification_id', verificationId)
            .maybeSingle();
          
          if (!existing) {
            const { error: dbError } = await supabase
              .from('signed_documents')
              .insert({
                user_id: currentUser.id,
                original_file_name: `Quotation-${quotationNumber}.pdf`,
                original_file_path: `quotations/${quotationNumber}`,
                signed_file_path: null,
                file_type: 'application/pdf',
                file_size: null,
                qr_position: 'bottom-left',
                signer_name: tteSettings.signer_name,
                signer_position: tteSettings.signer_position || '',
                signed_at: new Date().toISOString(),
                verification_id: verificationId,
              });
            
            if (dbError) {
              console.error('Error saving to signed_documents:', dbError);
            } else {
              toast({
                title: 'TTE Tersimpan',
                description: 'Dokumen telah ditandatangani dan tercatat dalam sistem',
              });
            }
          }
        }
      }
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Gagal membuat PDF',
        variant: 'destructive',
      });
    } finally {
      setDownloadLoading(null);
    }
  };

  const handleEdit = (quotation: Quotation) => {
    navigate(`/quotation?edit=${quotation.id}`);
  };

  const handleDelete = async () => {
    if (!quotationToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', quotationToDelete);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Quotation berhasil dihapus',
      });

      fetchQuotations();
    } catch (error: any) {
      console.error('Error deleting quotation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus quotation',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setQuotationToDelete(null);
    }
  };

  const confirmDelete = (id: string) => {
    setQuotationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleOpenApproval = (quotation: Quotation, mode: 'submit' | 'review') => {
    setSelectedQuotation(quotation);
    setApprovalMode(mode);
    setApprovalDialogOpen(true);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25">Disetujui</Badge>;
      case 'Sent':
        return <Badge className="bg-sky-500/15 text-sky-700 hover:bg-sky-500/25">Terkirim</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Ditolak</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const getApprovalStatusBadge = (status: string | null) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-warning text-warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-primary text-primary"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="border-destructive text-destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  const getNegotiationStatusBadge = (quotation: Quotation) => {
    if (!quotation.negotiated_price) return null;
    
    switch (quotation.negotiation_status) {
      case 'pending':
        return <Badge variant="outline" className="border-warning text-warning text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-primary text-primary text-xs"><CheckCircle className="h-3 w-3 mr-1" />Deal</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="border-destructive text-destructive text-xs"><XCircle className="h-3 w-3 mr-1" />Ditolak</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Draft</Badge>;
    }
  };

  const filteredQuotations = quotations.filter((q) =>
    q.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AppLayout title="Daftar Quotation" subtitle="Memuat...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Daftar Quotation"
      subtitle="Kelola semua quotation yang tersimpan"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari quotation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button asChild>
          <Link to="/quotation">
            <Plus className="h-4 w-4 mr-2" />
            Buat Quotation Baru
          </Link>
        </Button>
      </div>

      {/* Quotation Table */}
      <Card>
        <CardContent className="p-0">
          {filteredQuotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Belum Ada Quotation</h3>
              <p className="text-muted-foreground mb-4">
                Mulai buat quotation pertama Anda
              </p>
              <Button asChild>
                <Link to="/quotation">
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Quotation
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Klien</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Harga Deal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-medium">
                      {quotation.project_name}
                    </TableCell>
                    <TableCell>
                      {quotation.clients?.name || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {quotation.grand_total
                        ? formatCurrency(quotation.grand_total)
                        : '-'}
                      {quotation.margin_percentage && (
                        <div className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-0.5">
                          <Percent className="h-3 w-3" />
                          {quotation.margin_percentage}% margin
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {quotation.negotiated_price ? (
                        <div>
                          <span className="font-medium text-primary">
                            {formatCurrency(quotation.negotiated_price)}
                          </span>
                          {quotation.grand_total && quotation.negotiated_price < quotation.grand_total && (
                            <div className="text-xs text-destructive mt-0.5">
                              -{((quotation.grand_total - quotation.negotiated_price) / quotation.grand_total * 100).toFixed(1)}%
                            </div>
                          )}
                          <div className="mt-1">
                            {getNegotiationStatusBadge(quotation)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(quotation.status)}
                    </TableCell>
                    <TableCell>
                      {getApprovalStatusBadge(quotation.approval_status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(quotation)}
                          title="Lihat PDF"
                          disabled={previewLoading}
                        >
                          {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(quotation)}
                          title="Download PDF dengan TTE"
                          disabled={downloadLoading === quotation.id}
                        >
                          {downloadLoading === quotation.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </Button>
                        
                        {/* Submit for approval button - for BDO/Marketing on draft quotations */}
                        {canSubmit && (!quotation.approval_status || quotation.approval_status === 'draft' || quotation.approval_status === 'rejected') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenApproval(quotation, 'submit')}
                            title="Submit untuk Approval"
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Review button - for COO/Admin on pending quotations */}
                        {canReview && quotation.approval_status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenApproval(quotation, 'review')}
                            title="Review Quotation"
                            className="text-primary hover:text-primary"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Create Project button - for approved quotations */}
                        {canCreateProject && quotation.approval_status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setQuotationForProject(quotation);
                              setCreateProjectDialogOpen(true);
                            }}
                            title="Buat Proyek dari Quotation"
                            className="text-success hover:text-success"
                          >
                            <FolderPlus className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Input negotiated price button - for Marketing on approved/sent quotations */}
                        {canSubmit && (quotation.status === 'Sent' || quotation.approval_status === 'approved') && (!quotation.negotiation_status || quotation.negotiation_status === 'draft') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setQuotationForNegotiation(quotation);
                              setNegotiatedPriceDialogOpen(true);
                            }}
                            title="Input Harga Negosiasi"
                            className={quotation.negotiated_price ? "text-primary" : "text-warning"}
                          >
                            <HandCoins className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Revise negotiated price button - for Marketing on rejected negotiation */}
                        {canSubmit && quotation.negotiation_status === 'rejected' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setQuotationForNegotiation(quotation);
                              setNegotiatedPriceDialogOpen(true);
                            }}
                            title="Revisi Harga Negosiasi"
                            className="text-destructive hover:text-destructive"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Review negotiation button - for BDO/COO on pending negotiation */}
                        {canReviewNegotiation && quotation.negotiation_status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setQuotationForNegotiationApproval(quotation);
                              setNegotiationApprovalDialogOpen(true);
                            }}
                            title="Review Harga Negosiasi"
                            className="text-warning hover:text-warning"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(quotation)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(quotation.id)}
                          className="text-destructive hover:text-destructive"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <PDFPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        html={previewHtml}
        title="Preview Quotation"
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName="Quotation ini"
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* Approval Dialog */}
      <QuotationApprovalDialog
        quotation={selectedQuotation ? {
          ...selectedQuotation,
          client_name: selectedQuotation.clients?.name,
        } : null}
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        onSuccess={fetchQuotations}
        mode={approvalMode}
      />

      {/* Create Project from Quotation Dialog */}
      <CreateProjectFromQuotationDialog
        quotation={quotationForProject ? {
          id: quotationForProject.id,
          project_name: quotationForProject.project_name,
          client_id: quotationForProject.client_id,
          client_name: quotationForProject.clients?.name,
          grand_total: quotationForProject.grand_total,
        } : null}
        open={createProjectDialogOpen}
        onOpenChange={setCreateProjectDialogOpen}
        onSuccess={fetchQuotations}
      />

      {/* Negotiated Price Dialog */}
      <NegotiatedPriceDialog
        quotation={quotationForNegotiation ? {
          id: quotationForNegotiation.id,
          project_name: quotationForNegotiation.project_name,
          grand_total: quotationForNegotiation.grand_total,
          negotiated_price: quotationForNegotiation.negotiated_price,
          negotiation_notes: quotationForNegotiation.negotiation_notes,
          margin_percentage: quotationForNegotiation.margin_percentage,
          client_name: quotationForNegotiation.clients?.name,
          negotiation_status: quotationForNegotiation.negotiation_status,
          negotiation_rejection_reason: quotationForNegotiation.negotiation_rejection_reason,
        } : null}
        open={negotiatedPriceDialogOpen}
        onOpenChange={setNegotiatedPriceDialogOpen}
        onSuccess={fetchQuotations}
      />

      {/* Negotiation Approval Dialog */}
      <NegotiationApprovalDialog
        quotation={quotationForNegotiationApproval ? {
          id: quotationForNegotiationApproval.id,
          project_name: quotationForNegotiationApproval.project_name,
          grand_total: quotationForNegotiationApproval.grand_total,
          negotiated_price: quotationForNegotiationApproval.negotiated_price,
          negotiation_notes: quotationForNegotiationApproval.negotiation_notes,
          margin_percentage: quotationForNegotiationApproval.margin_percentage,
          client_name: quotationForNegotiationApproval.clients?.name,
        } : null}
        open={negotiationApprovalDialogOpen}
        onOpenChange={setNegotiationApprovalDialogOpen}
        onSuccess={fetchQuotations}
      />
    </AppLayout>
  );
}
