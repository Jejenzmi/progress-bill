import { useState, useEffect, useCallback } from 'react';
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
import { QRPositionSelector, QRPositionValue, parseQRPosition, stringifyQRPosition, QRSize } from './QRPositionSelector';
import { PDFPageSelector } from './PDFPageSelector';
import { Loader2, FileSignature, Eye } from 'lucide-react';
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
  onConfirm: (pageNumber?: number) => void;
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
  const [selectedPage, setSelectedPage] = useState<number>(1);

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

  // Handle QR position change from selector (supports both preset and custom)
  const handleQrPositionChange = useCallback((value: string | QRPositionValue) => {
    if (typeof value === 'string') {
      onQrPositionChange(value);
    } else {
      onQrPositionChange(stringifyQRPosition(value));
    }
  }, [onQrPositionChange]);

  // Get QR size class for preview
  const getQrSizeClass = (): { size: string; text: string } => {
    const parsed = parseQRPosition(qrPosition);
    switch (parsed.size) {
      case 'small': return { size: 'w-12 h-12', text: 'text-[6px]' };
      case 'large': return { size: 'w-20 h-20', text: 'text-[10px]' };
      default: return { size: 'w-16 h-16', text: 'text-[8px]' };
    }
  };

  // Calculate QR overlay style for preview
  const getQrOverlayStyle = useCallback(() => {
    const parsed = parseQRPosition(qrPosition);
    
    if (parsed.type === 'custom' && parsed.x !== undefined && parsed.y !== undefined) {
      return {
        position: 'absolute' as const,
        left: `${parsed.x}%`,
        top: `${parsed.y}%`,
        transform: 'translate(-50%, -50%)',
      };
    }
    
    // Preset positions
    const presetStyles: Record<string, React.CSSProperties> = {
      'top-left': { position: 'absolute', top: '1rem', left: '1rem' },
      'top-right': { position: 'absolute', top: '1rem', right: '1rem' },
      'bottom-left': { position: 'absolute', bottom: '1rem', left: '1rem' },
      'bottom-right': { position: 'absolute', bottom: '1rem', right: '1rem' },
      'center': { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    };
    
    return presetStyles[parsed.preset || 'bottom-right'] || presetStyles['bottom-right'];
  }, [qrPosition]);

  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf';
  const qrSizeClass = getQrSizeClass();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview Dokumen & Posisi TTE
          </DialogTitle>
          <DialogDescription>
            Lihat preview dokumen dan atur posisi serta ukuran QR Code TTE sebelum menandatangani
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
                        'border-2 border-dashed border-primary bg-primary/10 rounded flex items-center justify-center transition-all',
                        qrSizeClass.size
                      )}
                      style={getQrOverlayStyle()}
                    >
                      <div className={cn('font-bold text-primary text-center leading-tight', qrSizeClass.text)}>
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
                        'border-2 border-dashed border-primary bg-primary/20 rounded flex items-center justify-center pointer-events-none',
                        qrSizeClass.size
                      )}
                      style={getQrOverlayStyle()}
                    >
                      <div className={cn('font-bold text-primary text-center leading-tight', qrSizeClass.text)}>
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
                          'border-2 border-primary bg-primary/20 rounded flex items-center justify-center',
                          parseQRPosition(qrPosition).size === 'small' ? 'w-8 h-8' : 
                          parseQRPosition(qrPosition).size === 'large' ? 'w-14 h-14' : 'w-10 h-10'
                        )}
                        style={{
                          position: 'absolute',
                          ...(() => {
                            const parsed = parseQRPosition(qrPosition);
                            if (parsed.type === 'custom' && parsed.x !== undefined && parsed.y !== undefined) {
                              return { left: `${parsed.x}%`, top: `${parsed.y}%`, transform: 'translate(-50%, -50%)' };
                            }
                            const presets: Record<string, React.CSSProperties> = {
                              'top-left': { top: '0.5rem', left: '0.5rem' },
                              'top-right': { top: '0.5rem', right: '0.5rem' },
                              'bottom-left': { bottom: '0.5rem', left: '0.5rem' },
                              'bottom-right': { bottom: '0.5rem', right: '0.5rem' },
                              'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
                            };
                            return presets[parsed.preset || 'bottom-right'] || presets['bottom-right'];
                          })()
                        }}
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
            {/* Page Selector for multi-page PDFs */}
            {isPdf && (
              <div className="border-b pb-4">
                <PDFPageSelector
                  file={file}
                  value={selectedPage}
                  onChange={setSelectedPage}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-base font-semibold">Posisi & Ukuran QR Code TTE</Label>
              <QRPositionSelector 
                value={qrPosition} 
                onChange={handleQrPositionChange}
                showSizeSelector={true}
              />
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
                <li>• QR Code di-embed langsung ke dalam PDF asli</li>
                <li>• Ukuran QR dapat disesuaikan (kecil/sedang/besar)</li>
                <li>• Informasi penandatangan akan tercantum dalam QR</li>
                {isPdf && <li>• Pilih halaman untuk PDF multi-halaman</li>}
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={() => onConfirm(isPdf ? selectedPage : undefined)}
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
