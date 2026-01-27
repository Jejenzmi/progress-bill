import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserTTE } from '@/hooks/useUserTTE';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  FileSignature, 
  Download, 
  Trash2, 
  Loader2, 
  FileText,
  Eye,
  RefreshCw,
  FileDown
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { generateSignedPDF, DocumentTTEData } from '@/lib/documentTTEGenerator';

interface SignedDocument {
  id: string;
  original_file_name: string;
  original_file_path: string;
  signed_file_path: string | null;
  file_type: string;
  file_size: number | null;
  qr_position: string;
  signer_name: string;
  signer_position: string;
  signed_at: string;
  created_at: string;
}

export default function SignedDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tteSettings, loading: tteLoading } = useUserTTE();
  
  const [documents, setDocuments] = useState<SignedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  
  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<SignedDocument | null>(null);
  
  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [qrPosition, setQrPosition] = useState('bottom-right');
  const [signerName, setSignerName] = useState('');
  const [signerPosition, setSignerPosition] = useState('');

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  useEffect(() => {
    if (tteSettings) {
      setSignerName(tteSettings.signer_name);
      setSignerPosition(tteSettings.signer_position);
    }
  }, [tteSettings]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('signed_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat daftar dokumen',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: 'File Terlalu Besar',
          description: 'Ukuran file maksimal 20MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      // Open preview dialog after selecting file
      setUploadDialogOpen(false);
      setPreviewDialogOpen(true);
    }
  };

  const handleUploadAndSign = async () => {
    if (!selectedFile || !user) return;

    if (!signerName.trim() || !signerPosition.trim()) {
      toast({
        title: 'Data Tidak Lengkap',
        description: 'Nama dan jabatan penandatangan wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const signedAt = new Date();
      
      // Generate signed PDF with TTE
      const tteData: DocumentTTEData = {
        documentName: selectedFile.name,
        signerName: signerName.trim(),
        signerPosition: signerPosition.trim(),
        signedAt,
        qrPosition,
      };
      
      const signedPdfBlob = await generateSignedPDF(selectedFile, tteData);
      
      // Upload original file
      const originalFileName = `${Date.now()}-${selectedFile.name}`;
      const originalFilePath = `${user.id}/originals/${originalFileName}`;

      const { error: uploadOriginalError } = await supabase.storage
        .from('signed-documents')
        .upload(originalFilePath, selectedFile);

      if (uploadOriginalError) throw uploadOriginalError;

      // Upload signed PDF
      const signedFileName = `${Date.now()}-signed-${selectedFile.name.replace(/\.[^/.]+$/, '')}.pdf`;
      const signedFilePath = `${user.id}/signed/${signedFileName}`;

      const { error: uploadSignedError } = await supabase.storage
        .from('signed-documents')
        .upload(signedFilePath, signedPdfBlob);

      if (uploadSignedError) throw uploadSignedError;

      // Create database record
      const { error: dbError } = await supabase
        .from('signed_documents')
        .insert({
          user_id: user.id,
          original_file_name: selectedFile.name,
          original_file_path: originalFilePath,
          signed_file_path: signedFilePath,
          file_type: selectedFile.type || 'application/octet-stream',
          file_size: selectedFile.size,
          qr_position: qrPosition,
          signer_name: signerName.trim(),
          signer_position: signerPosition.trim(),
          signed_at: signedAt.toISOString(),
        });

      if (dbError) throw dbError;

      toast({
        title: 'Berhasil',
        description: 'Dokumen berhasil ditandatangani dan disimpan',
      });

      // Reset form and refresh
      resetForm();
      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengupload dokumen',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setQrPosition('bottom-right');
    setPreviewDialogOpen(false);
    setUploadDialogOpen(false);
    if (tteSettings) {
      setSignerName(tteSettings.signer_name);
      setSignerPosition(tteSettings.signer_position);
    }
  };

  const handleDownloadOriginal = async (doc: SignedDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('signed-documents')
        .download(doc.original_file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.original_file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading original:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengunduh dokumen asli',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadSigned = async (doc: SignedDocument) => {
    if (!doc.signed_file_path) {
      toast({
        title: 'Error',
        description: 'Dokumen bertanda tangan tidak tersedia',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from('signed-documents')
        .download(doc.signed_file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signed-${doc.original_file_name.replace(/\.[^/.]+$/, '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading signed doc:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengunduh dokumen bertanda tangan',
        variant: 'destructive',
      });
    } finally {
      setGenerating(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;

    try {
      // Delete files from storage
      const pathsToDelete = [selectedDoc.original_file_path];
      if (selectedDoc.signed_file_path) {
        pathsToDelete.push(selectedDoc.signed_file_path);
      }

      const { error: storageError } = await supabase.storage
        .from('signed-documents')
        .remove(pathsToDelete);

      if (storageError) {
        console.warn('Storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('signed_documents')
        .delete()
        .eq('id', selectedDoc.id);

      if (dbError) throw dbError;

      toast({
        title: 'Berhasil',
        description: 'Dokumen berhasil dihapus',
      });

      setDeleteDialogOpen(false);
      setSelectedDoc(null);
      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghapus dokumen',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPositionLabel = (position: string) => {
    const positions: Record<string, string> = {
      'top-left': 'Kiri Atas',
      'top-right': 'Kanan Atas',
      'bottom-left': 'Kiri Bawah',
      'bottom-right': 'Kanan Bawah',
      'center': 'Tengah',
    };
    return positions[position] || position;
  };

  return (
    <AppLayout title="Tanda Tangan Elektronik" subtitle="Upload dan tandatangani dokumen dengan QR Code TTE">
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={fetchDocuments} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Dokumen
          </Button>
        </div>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Riwayat Dokumen Ditandatangani
            </CardTitle>
            <CardDescription>
              Daftar semua dokumen yang telah ditandatangani secara elektronik
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Belum Ada Dokumen</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Klik tombol "Upload Dokumen" untuk menambahkan dokumen baru
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama File</TableHead>
                      <TableHead>Ukuran</TableHead>
                      <TableHead>Posisi QR</TableHead>
                      <TableHead>Penandatangan</TableHead>
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
                            <span className="font-medium truncate max-w-[200px]">
                              {doc.original_file_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                        <TableCell>{getPositionLabel(doc.qr_position)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{doc.signer_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {doc.signer_position}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(doc.signed_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadOriginal(doc)}
                              title="Download dokumen asli"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleDownloadSigned(doc)}
                              disabled={generating === doc.id || !doc.signed_file_path}
                              title="Download PDF bertanda tangan"
                            >
                              {generating === doc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedDoc(doc);
                                setDeleteDialogOpen(true);
                              }}
                              title="Hapus dokumen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Initial Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Pilih Dokumen
            </DialogTitle>
            <DialogDescription>
              Pilih dokumen yang ingin ditandatangani secara elektronik
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pilih Dokumen *</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground">
                Format: PDF, Word, Excel, PowerPoint, Gambar (maks. 20MB)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <DocumentPreviewDialog
        open={previewDialogOpen}
        onOpenChange={(open) => {
          setPreviewDialogOpen(open);
          if (!open) resetForm();
        }}
        file={selectedFile}
        qrPosition={qrPosition}
        onQrPositionChange={setQrPosition}
        signerName={signerName}
        onSignerNameChange={setSignerName}
        signerPosition={signerPosition}
        onSignerPositionChange={setSignerPosition}
        onConfirm={handleUploadAndSign}
        uploading={uploading}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Dokumen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dokumen "{selectedDoc?.original_file_name}" akan dihapus secara permanen beserta
              versi bertanda tangan. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
