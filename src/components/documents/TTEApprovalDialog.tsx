import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { createNotification } from '@/lib/notificationHelper';
import { generateSignedPDF, DocumentTTEData } from '@/lib/documentTTEGenerator';
import { parseQRPosition } from './QRPositionSelector';
import { TTEBoxOverlay } from './TTEBoxOverlay';
import { PdfPageCanvas } from './PdfPageCanvas';
import { cn } from '@/lib/utils';
import { 
  Loader2, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  User, 
  Calendar,
  FileSignature,
  Eye,
  Download,
  ExternalLink,
  QrCode
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// Production verification URL
const VERIFICATION_BASE_URL = 'https://crm.zefin.id/verify';

// QRPositionIndicator now uses the shared TTEBoxOverlay component
function QRPositionIndicator({ qrPosition, qrPage, isPdf }: { qrPosition: string; qrPage?: number; isPdf?: boolean }) {
  return <TTEBoxOverlay qrPosition={qrPosition} qrPage={qrPage} isPdf={isPdf} showInfoBadge={true} />;
}

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

interface TTEApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: SignedDocument | null;
  mode: 'review' | 'view';
  onSuccess: () => void;
}

export function TTEApprovalDialog({
  open,
  onOpenChange,
  document,
  mode,
  onSuccess,
}: TTEApprovalDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitterName, setSubmitterName] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (document?.submitted_by) {
      fetchSubmitterName(document.submitted_by);
    }
  }, [document?.submitted_by]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setShowPreview(false);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  }, [open]);

  const fetchSubmitterName = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single();
    
    if (data?.full_name) {
      setSubmitterName(data.full_name);
    }
  };

  const handlePreview = async () => {
    if (!document) return;

    setPreviewLoading(true);
    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('signed-documents')
        .download(document.original_file_path);

      if (downloadError) {
        throw new Error(`Gagal mengunduh dokumen: ${downloadError.message}`);
      }

      if (!fileData) {
        throw new Error('File tidak ditemukan');
      }

      const url = URL.createObjectURL(fileData);
      setPreviewUrl(url);
      setShowPreview(true);
    } catch (error: any) {
      console.error('Error loading preview:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat preview dokumen',
        variant: 'destructive',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('signed-documents')
        .download(document.original_file_path);

      if (downloadError) throw downloadError;
      if (!fileData) throw new Error('File tidak ditemukan');

      const url = URL.createObjectURL(fileData);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.original_file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Berhasil',
        description: 'Dokumen berhasil diunduh',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Gagal mengunduh dokumen',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async () => {
    if (!document || !user) return;

    setLoading(true);
    try {
      console.log('Starting TTE approval for document:', document.id);
      console.log('Original file path:', document.original_file_path);
      
      // Download original file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('signed-documents')
        .download(document.original_file_path);

      if (downloadError) {
        console.error('Download error:', downloadError);
        throw new Error(`Gagal mengunduh dokumen: ${downloadError.message}`);
      }

      if (!fileData) {
        throw new Error('File tidak ditemukan di storage');
      }

      console.log('File downloaded successfully, size:', fileData.size);

      // Generate signed PDF with TTE
      const file = new File([fileData], document.original_file_name, { type: document.file_type });
      const signedAt = new Date();
      
      const tteData: DocumentTTEData = {
        documentName: file.name,
        signerName: document.signer_name,
        signerPosition: document.signer_position,
        signedAt,
        qrPosition: document.qr_position,
        pageNumber: document.qr_page || 1,
      };
      
      console.log('Generating signed PDF...');
      const { blob: signedPdfBlob, verificationId } = await generateSignedPDF(file, tteData, VERIFICATION_BASE_URL);
      console.log('PDF generated, verification ID:', verificationId);
      
      // Upload signed PDF
      const signedFileName = `${Date.now()}-signed-${document.original_file_name.replace(/\.[^/.]+$/, '')}.pdf`;
      const signedFilePath = `${document.submitted_by || user.id}/signed/${signedFileName}`;

      console.log('Uploading signed PDF to:', signedFilePath);
      const { error: uploadError } = await supabase.storage
        .from('signed-documents')
        .upload(signedFilePath, signedPdfBlob);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Gagal mengupload dokumen: ${uploadError.message}`);
      }

      console.log('File uploaded successfully');

      // Update database record
      const { error: dbError } = await supabase
        .from('signed_documents')
        .update({
          tte_status: 'signed',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          signed_file_path: signedFilePath,
          signed_at: signedAt.toISOString(),
          verification_id: verificationId,
        })
        .eq('id', document.id);

      if (dbError) {
        console.error('Database update error:', dbError);
        throw new Error(`Gagal memperbarui database: ${dbError.message}`);
      }

      console.log('Database updated successfully');

      // Notify submitter
      if (document.submitted_by) {
        await createNotification({
          userId: document.submitted_by,
          title: 'TTE Dokumen Disetujui',
          message: `Dokumen "${document.original_file_name}" telah disetujui dan ditandatangani.`,
          type: 'success',
          link: '/signed-documents',
          relatedId: document.id,
          relatedType: 'signed_document',
        });
      }

      toast({
        title: 'Berhasil',
        description: 'Dokumen telah disetujui dan ditandatangani',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error approving TTE:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyetujui dokumen',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!document || !user) return;

    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Alasan penolakan wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('signed_documents')
        .update({
          tte_status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejection_reason: rejectionReason,
        })
        .eq('id', document.id);

      if (error) throw error;

      // Notify submitter
      if (document.submitted_by) {
        await createNotification({
          userId: document.submitted_by,
          title: 'TTE Dokumen Ditolak',
          message: `Dokumen "${document.original_file_name}" ditolak. Alasan: ${rejectionReason}`,
          type: 'warning',
          link: '/signed-documents',
          relatedId: document.id,
          relatedType: 'signed_document',
        });
      }

      toast({
        title: 'Berhasil',
        description: 'Permintaan TTE telah ditolak',
      });

      onSuccess();
      onOpenChange(false);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Error rejecting TTE:', error);
      toast({
        title: 'Error',
        description: 'Gagal menolak permintaan TTE',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Menunggu Approval</Badge>;
      case 'approved':
      case 'signed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Disetujui</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Ditolak</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  if (!document) return null;

  const isPdf = document.file_type === 'application/pdf';
  const isImage = document.file_type.startsWith('image/');
  const previewPage = document.qr_page || 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={showPreview ? "max-w-5xl max-h-[90vh]" : "max-w-lg"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            {mode === 'review' ? 'Review Permintaan TTE' : 'Detail Permintaan TTE'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'review' 
              ? 'Tinjau dan setujui atau tolak permintaan tanda tangan elektronik'
              : 'Lihat detail permintaan tanda tangan elektronik'}
          </DialogDescription>
        </DialogHeader>

        <div className={showPreview ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : ""}>
          {/* Preview Panel */}
          {showPreview && previewUrl && (
            <div className="border rounded-lg overflow-hidden bg-muted/30 min-h-[400px] relative">
              <div className="absolute top-2 left-2 bg-background/90 px-2 py-1 rounded text-xs font-medium z-10 flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Preview Dokumen
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10"
                onClick={() => {
                  setShowPreview(false);
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                }}
              >
                <XCircle className="h-4 w-4" />
              </Button>
              
              {isPdf ? (
                <div className="relative w-full h-full min-h-[400px]">
                  <PdfPageCanvas src={previewUrl} pageNumber={previewPage} className="min-h-[400px]">
                    {({ pagePt }) => (
                      <TTEBoxOverlay
                        qrPosition={document.qr_position}
                        qrPage={previewPage}
                        isPdf={true}
                        showInfoBadge={true}
                        pagePt={pagePt}
                      />
                    )}
                  </PdfPageCanvas>
                </div>
              ) : isImage ? (
                <div className="w-full h-full min-h-[400px] flex items-center justify-center p-4 relative">
                  <img
                    src={previewUrl}
                    alt="Document preview"
                    className="max-w-full max-h-full object-contain rounded"
                  />
                  {/* QR Position Indicator Overlay for Image */}
                  <QRPositionIndicator qrPosition={document.qr_position} />
                </div>
              ) : (
                <div className="w-full h-full min-h-[400px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">Preview tidak tersedia untuk tipe file ini</p>
                    <Button variant="link" size="sm" onClick={handleDownload} className="mt-2">
                      <Download className="h-4 w-4 mr-1" />
                      Download untuk melihat
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info Panel */}
          <ScrollArea className={showPreview ? "max-h-[60vh]" : ""}>
            <div className="space-y-4 pr-2">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(document.tte_status)}
              </div>

              {/* Document Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{document.original_file_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {document.file_size ? `${(document.file_size / 1024 / 1024).toFixed(2)} MB` : '-'}
                    </p>
                  </div>
                </div>

                {/* Preview & Download Buttons */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreview}
                    disabled={previewLoading}
                    className="flex-1"
                  >
                    {previewLoading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4 mr-1" />
                    )}
                    {showPreview ? 'Refresh Preview' : 'Lihat Dokumen'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>

                <div className="flex items-start gap-3 pt-3 border-t">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{document.signer_name}</p>
                    <p className="text-sm text-muted-foreground">{document.signer_position}</p>
                  </div>
                </div>

                {/* QR Code Placement Info */}
                {isPdf && document.qr_page && (
                  <div className="flex items-start gap-3 pt-3 border-t">
                    <QrCode className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Penempatan QR Code TTE</p>
                      <p className="font-medium">Halaman {document.qr_page}</p>
                    </div>
                  </div>
                )}

                {document.submitted_at && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Diajukan pada</p>
                      <p className="font-medium">
                        {format(new Date(document.submitted_at), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                      </p>
                      {submitterName && (
                        <p className="text-sm text-muted-foreground">oleh {submitterName}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Rejection Reason (for rejected docs or when rejecting) */}
              {document.tte_status === 'rejected' && document.rejection_reason && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Alasan Penolakan:</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{document.rejection_reason}</p>
                </div>
              )}

              {mode === 'review' && document.tte_status === 'pending' && (
                <div className="space-y-2">
                  <Label>Alasan Penolakan (jika ditolak)</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Masukkan alasan jika ingin menolak permintaan ini..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {mode === 'review' ? 'Batal' : 'Tutup'}
          </Button>
          
          {mode === 'review' && document.tte_status === 'pending' && (
            <>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <XCircle className="mr-2 h-4 w-4" />
                Tolak
              </Button>
              <Button
                onClick={handleApprove}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Setujui & Tanda Tangani
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}