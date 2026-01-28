import { useState, useCallback, useEffect } from 'react';
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
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QRPositionSelector, QRPositionValue, stringifyQRPosition } from './QRPositionSelector';
import { Loader2, FileSignature, Upload, X, FileText, CheckCircle2, AlertCircle, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// Predefined TTE signers - same as Quotation
const TTE_SIGNERS = [
  { id: 'self', label: 'Marketing (Saya Sendiri)', name: '', position: '' },
  { id: 'coo', label: 'COO - Indra Apriana, S.Kom', name: 'Indra Apriana, S.Kom', position: 'Chief Operational Officer' },
  { id: 'ceo', label: 'CEO - Jejen Jaenudin, SM., M.Kom', name: 'Jejen Jaenudin, SM., M.Kom', position: 'Chief Executive Officer' },
];

interface FileWithStatus {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

interface BatchSigningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signerName: string;
  onSignerNameChange: (name: string) => void;
  signerPosition: string;
  onSignerPositionChange: (position: string) => void;
  onConfirm: (files: File[], qrPosition: string) => Promise<void>;
  uploading: boolean;
  // User TTE settings for "self" option
  userTTEName?: string;
  userTTEPosition?: string;
}

export function BatchSigningDialog({
  open,
  onOpenChange,
  signerName,
  onSignerNameChange,
  signerPosition,
  onSignerPositionChange,
  onConfirm,
  uploading,
  userTTEName = '',
  userTTEPosition = '',
}: BatchSigningDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithStatus[]>([]);
  const [qrPosition, setQrPosition] = useState('bottom-right');
  const [progress, setProgress] = useState(0);
  const [selectedSigner, setSelectedSigner] = useState<string>('self');

  // Initialize signer when dialog opens
  useEffect(() => {
    if (open) {
      if (userTTEName && userTTEPosition) {
        setSelectedSigner('self');
        onSignerNameChange(userTTEName);
        onSignerPositionChange(userTTEPosition);
      } else {
        // Default to COO if no user TTE settings
        setSelectedSigner('coo');
        const coo = TTE_SIGNERS.find(s => s.id === 'coo')!;
        onSignerNameChange(coo.name);
        onSignerPositionChange(coo.position);
      }
    }
  }, [open, userTTEName, userTTEPosition]);

  // Handle signer selection change
  const handleSignerChange = (signerId: string) => {
    setSelectedSigner(signerId);
    
    if (signerId === 'self') {
      onSignerNameChange(userTTEName || '');
      onSignerPositionChange(userTTEPosition || '');
    } else {
      const signer = TTE_SIGNERS.find(s => s.id === signerId);
      if (signer) {
        onSignerNameChange(signer.name);
        onSignerPositionChange(signer.position);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 20 * 1024 * 1024) {
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [
      ...prev,
      ...validFiles.map(file => ({ file, status: 'pending' as const }))
    ]);
    
    // Reset input
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (selectedFiles.length === 0) return;
    
    const files = selectedFiles.map(f => f.file);
    await onConfirm(files, qrPosition);
    
    // Reset after completion
    setSelectedFiles([]);
    setProgress(0);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (status: FileWithStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Check if self option is available
  const selfAvailable = !!userTTEName && !!userTTEPosition;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Batch Signing - Tanda Tangan Banyak Dokumen
          </DialogTitle>
          <DialogDescription>
            Upload dan tandatangani beberapa dokumen sekaligus dengan pengaturan TTE yang sama
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden min-h-0">
          {/* File Upload Area */}
          <div className="space-y-2">
            <Label>Pilih Dokumen (Multiple)</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                id="batch-file-input"
              />
              <label
                htmlFor="batch-file-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Klik untuk memilih file atau drag & drop
                </span>
                <span className="text-xs text-muted-foreground">
                  PDF, Word, Excel, PowerPoint, Gambar (maks. 20MB per file)
                </span>
              </label>
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>File Terpilih ({selectedFiles.length})</Label>
              <ScrollArea className="h-[120px] border rounded-lg p-2">
                <div className="space-y-2">
                  {selectedFiles.map((fileItem, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50",
                        fileItem.status === 'error' && "bg-destructive/10"
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getFileIcon(fileItem.status)}
                        <span className="text-sm truncate">{fileItem.file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({formatFileSize(fileItem.file.size)})
                        </span>
                      </div>
                      {!uploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2">
              <Label>Progress</Label>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Memproses dokumen...
              </p>
            </div>
          )}

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Batal
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedFiles.length === 0 || uploading || !signerName.trim() || !signerPosition.trim()}
          >
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <FileSignature className="mr-2 h-4 w-4" />
            Tanda Tangani {selectedFiles.length} Dokumen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
