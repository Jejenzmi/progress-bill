import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, Loader2, Eye, CheckCircle2 } from 'lucide-react';

interface ContractPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  title?: string;
  description?: string;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmLoading?: boolean;
  showConfirmButton?: boolean;
}

export function ContractPreviewDialog({
  open,
  onOpenChange,
  html,
  title = 'Preview Kontrak SPK',
  description = 'Preview kontrak sebelum tanda tangan TTE',
  onConfirm,
  confirmLabel = 'Lanjutkan TTE',
  confirmLoading = false,
  showConfirmButton = true,
}: ContractPreviewDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const writeToIframe = useCallback(() => {
    if (!iframeRef.current || !html) return;
    
    setLoading(true);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const doc = iframeRef.current.contentDocument;
    if (doc) {
      try {
        // Remove print button from preview
        const cleanHtml = html.replace(/<div class="no-print"[\s\S]*?<\/div>\s*<\/body>/, '</body>');
        doc.open();
        doc.write(cleanHtml);
        doc.close();
        
        // Set loading to false after a short delay to ensure content is rendered
        timeoutRef.current = setTimeout(() => {
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Error writing to iframe:', error);
        setLoading(false);
      }
    } else {
      // If no document access, hide loading after timeout
      timeoutRef.current = setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
  }, [html]);

  useEffect(() => {
    if (open && html) {
      // Small delay to ensure dialog is mounted
      const mountTimeout = setTimeout(() => {
        writeToIframe();
      }, 100);
      
      return () => clearTimeout(mountTimeout);
    } else if (!open) {
      // Reset loading state when closed
      setLoading(true);
    }
  }, [open, html, writeToIframe]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative overflow-hidden bg-muted/30">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Memuat preview kontrak...</p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title="Contract Preview"
            style={{ 
              transform: 'scale(0.9)', 
              transformOrigin: 'top center', 
              height: '111%',
              opacity: loading ? 0 : 1,
              transition: 'opacity 0.3s ease'
            }}
          />
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30 flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Tutup
          </Button>
          <Button variant="secondary" onClick={handlePrint} disabled={loading}>
            <Printer className="h-4 w-4 mr-2" />
            Cetak / Download
          </Button>
          {showConfirmButton && onConfirm && (
            <Button onClick={onConfirm} disabled={loading || confirmLoading}>
              {confirmLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
