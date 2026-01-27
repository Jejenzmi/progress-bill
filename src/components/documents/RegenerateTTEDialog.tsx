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
import { QRPositionSelector, QRPositionValue, stringifyQRPosition } from './QRPositionSelector';
import { Loader2, RefreshCw, FileSignature } from 'lucide-react';

interface SignedDocument {
  id: string;
  original_file_name: string;
  original_file_path: string;
  qr_position: string;
  signer_name: string;
  signer_position: string;
}

interface RegenerateTTEDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: SignedDocument | null;
  onConfirm: (docId: string, qrPosition: string, signerName: string, signerPosition: string) => Promise<void>;
  loading: boolean;
}

export function RegenerateTTEDialog({
  open,
  onOpenChange,
  document,
  onConfirm,
  loading,
}: RegenerateTTEDialogProps) {
  const [qrPosition, setQrPosition] = useState('bottom-right');
  const [signerName, setSignerName] = useState('');
  const [signerPosition, setSignerPosition] = useState('');

  useEffect(() => {
    if (document) {
      setQrPosition(document.qr_position);
      setSignerName(document.signer_name);
      setSignerPosition(document.signer_position);
    }
  }, [document]);

  const handleConfirm = async () => {
    if (!document) return;
    await onConfirm(document.id, qrPosition, signerName, signerPosition);
  };

  const hasChanges = document && (
    qrPosition !== document.qr_position ||
    signerName !== document.signer_name ||
    signerPosition !== document.signer_position
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Regenerate TTE
          </DialogTitle>
          <DialogDescription>
            Ubah posisi QR Code atau informasi penandatangan untuk dokumen ini
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <Label className="text-xs text-muted-foreground">Nama Dokumen</Label>
            <p className="font-medium truncate">{document?.original_file_name}</p>
          </div>

          {/* QR Position */}
          <div className="space-y-2">
            <Label>Posisi QR Code TTE</Label>
            <QRPositionSelector 
              value={qrPosition} 
              onChange={(val) => {
                if (typeof val === 'string') {
                  setQrPosition(val);
                } else {
                  setQrPosition(stringifyQRPosition(val));
                }
              }} 
            />
          </div>

          {/* Signer Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Penandatangan *</Label>
              <Input
                placeholder="Nama lengkap"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Jabatan *</Label>
              <Input
                placeholder="Jabatan penandatangan"
                value={signerPosition}
                onChange={(e) => setSignerPosition(e.target.value)}
              />
            </div>
          </div>

          {/* Changes Indicator */}
          {hasChanges && (
            <div className="text-xs text-primary flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Ada perubahan yang akan diterapkan
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !signerName.trim() || !signerPosition.trim() || !hasChanges}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <FileSignature className="mr-2 h-4 w-4" />
            Regenerate TTE
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}