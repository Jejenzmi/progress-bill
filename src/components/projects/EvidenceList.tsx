import { useState } from 'react';
import { FileText, Download, Trash2, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
import { Database } from '@/integrations/supabase/types';

type TermEvidence = Database['public']['Tables']['term_evidences']['Row'];

interface EvidenceListProps {
  evidences: TermEvidence[];
  onDelete?: (evidenceId: string) => void;
  canDelete?: boolean;
}

export function EvidenceList({ evidences, onDelete, canDelete = false }: EvidenceListProps) {
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDownload = async (evidence: TermEvidence) => {
    setDownloadingId(evidence.id);
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(evidence.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = evidence.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Berhasil',
        description: 'File berhasil diunduh',
      });
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengunduh file',
        variant: 'destructive',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (evidence: TermEvidence) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(evidence.file_path, 60 * 5); // 5 minutes

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error('Error creating preview URL:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal membuka preview',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (evidenceId: string) => {
    const evidence = evidences.find((e) => e.id === evidenceId);
    if (!evidence) return;

    setDeletingId(evidenceId);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([evidence.file_path]);

      if (storageError) {
        console.warn('Storage delete error:', storageError);
        // Continue with DB delete even if storage fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('term_evidences')
        .delete()
        .eq('id', evidenceId);

      if (dbError) throw dbError;

      toast({
        title: 'Berhasil',
        description: 'Dokumen berhasil dihapus',
      });

      onDelete?.(evidenceId);
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus dokumen',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    return <FileText className="h-4 w-4 text-primary" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (evidences.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Dokumen Pendukung:</p>
        {evidences.map((evidence) => (
          <div
            key={evidence.id}
            className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {getFileIcon(evidence.file_type)}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{evidence.file_name}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {evidence.file_type}
                  </span>
                  {evidence.file_size && <span>{formatFileSize(evidence.file_size)}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handlePreview(evidence)}
                title="Preview"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleDownload(evidence)}
                disabled={downloadingId === evidence.id}
                title="Download"
              >
                {downloadingId === evidence.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </Button>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setConfirmDeleteId(evidence.id)}
                  disabled={deletingId === evidence.id}
                  title="Hapus"
                >
                  {deletingId === evidence.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Dokumen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dokumen yang dihapus tidak dapat dikembalikan. Apakah Anda yakin ingin menghapus dokumen ini?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
