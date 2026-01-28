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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QRPositionSelector, QRPositionValue, stringifyQRPosition } from './QRPositionSelector';
import { Loader2, RefreshCw, FileSignature, User, Shield } from 'lucide-react';

// Predefined TTE signers - same as Quotation
const TTE_SIGNERS = [
  { id: 'self', label: 'Marketing (Saya Sendiri)', name: '', position: '' },
  { id: 'coo', label: 'COO - Indra Apriana, S.Kom', name: 'Indra Apriana, S.Kom', position: 'Chief Operational Officer' },
  { id: 'ceo', label: 'CEO - Jejen Jaenudin, SM., M.Kom', name: 'Jejen Jaenudin, SM., M.Kom', position: 'Chief Executive Officer' },
];

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
  // User TTE settings for "self" option
  userTTEName?: string;
  userTTEPosition?: string;
}

export function RegenerateTTEDialog({
  open,
  onOpenChange,
  document,
  onConfirm,
  loading,
  userTTEName = '',
  userTTEPosition = '',
}: RegenerateTTEDialogProps) {
  const [qrPosition, setQrPosition] = useState('bottom-right');
  const [signerName, setSignerName] = useState('');
  const [signerPosition, setSignerPosition] = useState('');
  const [selectedSigner, setSelectedSigner] = useState<string>('coo');

  useEffect(() => {
    if (document && open) {
      setQrPosition(document.qr_position);
      setSignerName(document.signer_name);
      setSignerPosition(document.signer_position);
      
      // Try to match existing signer to predefined list
      const matchedSigner = TTE_SIGNERS.find(s => 
        s.name === document.signer_name && s.position === document.signer_position
      );
      if (matchedSigner) {
        setSelectedSigner(matchedSigner.id);
      } else if (document.signer_name === userTTEName && document.signer_position === userTTEPosition) {
        setSelectedSigner('self');
      } else {
        // Default to showing current values with COO selected
        setSelectedSigner('coo');
      }
    }
  }, [document, open, userTTEName, userTTEPosition]);

  // Handle signer selection change
  const handleSignerChange = (signerId: string) => {
    setSelectedSigner(signerId);
    
    if (signerId === 'self') {
      setSignerName(userTTEName || '');
      setSignerPosition(userTTEPosition || '');
    } else {
      const signer = TTE_SIGNERS.find(s => s.id === signerId);
      if (signer) {
        setSignerName(signer.name);
        setSignerPosition(signer.position);
      }
    }
  };

  const handleConfirm = async () => {
    if (!document) return;
    await onConfirm(document.id, qrPosition, signerName, signerPosition);
  };

  const hasChanges = document && (
    qrPosition !== document.qr_position ||
    signerName !== document.signer_name ||
    signerPosition !== document.signer_position
  );

  // Check if self option is available
  const selfAvailable = !!userTTEName && !!userTTEPosition;

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

          {/* Signer Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Penandatangan Terdaftar *
              </Label>
              <Select value={selectedSigner} onValueChange={handleSignerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih penandatangan..." />
                </SelectTrigger>
                <SelectContent>
                  {TTE_SIGNERS.map((signer) => (
                    <SelectItem 
                      key={signer.id} 
                      value={signer.id}
                      disabled={signer.id === 'self' && !selfAvailable}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{signer.label}</span>
                        {signer.id === 'self' && !selfAvailable && (
                          <span className="text-xs text-muted-foreground">(Belum diatur)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Display selected signer info */}
            <div className="bg-muted/50 border rounded-lg p-3 space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Nama:</span>
                <span className="font-medium">{signerName || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Jabatan:</span>
                <span className="font-medium">{signerPosition || '-'}</span>
              </div>
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
