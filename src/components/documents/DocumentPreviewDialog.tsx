import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { QRPositionSelector } from './QRPositionSelector';
import { Loader2, FileSignature, Download, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  fileUrl?: string;
  qrPosition: string;
  onQrPositionChange: (position: string) => void;
  signerName: string;
  onSignerNameChange: (name: string) => void;
  signerPosition: string;
  onSignerPositionChange: (position: string) => void;
  onConfirm: () => void;
  uploading: boolean;
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  file,
  fileUrl,
  qrPosition,
  onQrPositionChange,
  signerName,
  onSignerNameChange,
  signerPosition,
  onSignerPositionChange,
  onConfirm,
  uploading,
}: DocumentPreviewDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setFileType(file.type);
      return () => URL.revokeObjectURL(url);
    } else if (fileUrl) {
      setPreviewUrl(fileUrl);
    }
  }, [file, fileUrl]);

  const getQrOverlayPosition = () => {
    const positions: Record<string, string> = {
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    };
    return positions[qrPosition] || positions['bottom-right'];
  };

  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview Dokumen & Posisi TTE
          </DialogTitle>
          <DialogDescription>
            Lihat preview dokumen dan atur posisi QR Code TTE sebelum menandatangani
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden min-h-0">
          {/* Document Preview */}
          <div className="relative border rounded-lg bg-muted/30 overflow-hidden min-h-[400px]">
            <div className="absolute top-2 left-2 bg-background/90 px-2 py-1 rounded text-xs font-medium z-10">
              Preview Dokumen
            </div>
            
            {previewUrl ? (
              <div className="relative w-full h-full flex items-center justify-center p-4">
                {isImage ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={previewUrl}
                      alt="Document preview"
                      className="max-w-full max-h-full object-contain rounded shadow-lg"
                    />
                    {/* QR Overlay for images */}
                    <div
                      className={cn(
                        'absolute w-16 h-16 border-2 border-dashed border-primary bg-primary/10 rounded flex items-center justify-center transition-all',
                        getQrOverlayPosition()
                      )}
                    >
                      <div className="text-[8px] font-bold text-primary text-center leading-tight">
                        QR<br/>TTE
                      </div>
                    </div>
                  </div>
                ) : isPdf ? (
                  <div className="relative w-full h-full">
                    <iframe
                      src={previewUrl}
                      className="w-full h-full border-0 rounded"
                      title="PDF Preview"
                    />
                    {/* QR Overlay indicator for PDF */}
                    <div
                      className={cn(
                        'absolute w-16 h-16 border-2 border-dashed border-primary bg-primary/20 rounded flex items-center justify-center pointer-events-none',
                        getQrOverlayPosition()
                      )}
                    >
                      <div className="text-[8px] font-bold text-primary text-center leading-tight">
                        QR<br/>TTE
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FileSignature className="h-16 w-16 mb-4" />
                    <p className="text-sm font-medium">{file?.name}</p>
                    <p className="text-xs mt-1">Preview tidak tersedia untuk tipe file ini</p>
                    
                    {/* QR Position indicator */}
                    <div className="mt-6 w-48 h-64 border-2 border-dashed rounded-lg relative bg-background/50">
                      <div className="absolute inset-4 flex flex-col gap-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-2 bg-muted rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
                        ))}
                      </div>
                      <div
                        className={cn(
                          'absolute w-10 h-10 border-2 border-primary bg-primary/20 rounded flex items-center justify-center',
                          getQrOverlayPosition().replace('top-4', 'top-2').replace('bottom-4', 'bottom-2').replace('left-4', 'left-2').replace('right-4', 'right-2')
                        )}
                      >
                        <span className="text-[6px] font-bold text-primary">QR</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Tidak ada file dipilih</p>
              </div>
            )}
          </div>

          {/* Settings Panel */}
          <div className="space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Posisi QR Code TTE</Label>
              <QRPositionSelector value={qrPosition} onChange={onQrPositionChange} />
            </div>

            <div className="border-t pt-4 space-y-4">
              <Label className="text-base font-semibold">Informasi Penandatangan</Label>
              
              <div className="space-y-2">
                <Label>Nama Penandatangan *</Label>
                <Input
                  placeholder="Nama lengkap"
                  value={signerName}
                  onChange={(e) => onSignerNameChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Jabatan *</Label>
                <Input
                  placeholder="Jabatan penandatangan"
                  value={signerPosition}
                  onChange={(e) => onSignerPositionChange(e.target.value)}
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-muted/50 border rounded-lg p-4 text-sm">
              <h4 className="font-medium mb-2">Informasi TTE</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• QR Code akan ditempatkan di posisi yang dipilih</li>
                <li>• Dokumen PDF akan di-generate dengan TTE ter-embed</li>
                <li>• Informasi penandatangan akan tercantum dalam QR</li>
                <li>• Dokumen asli dan hasil TTE akan disimpan</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!file || uploading || !signerName.trim() || !signerPosition.trim()}
          >
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <FileSignature className="mr-2 h-4 w-4" />
            Tanda Tangani & Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
