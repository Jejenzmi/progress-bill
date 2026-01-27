import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, X, Loader2 } from 'lucide-react';

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  title?: string;
  description?: string;
}

export function PDFPreviewDialog({
  open,
  onOpenChange,
  html,
  title = 'Preview Dokumen',
  description = 'Preview sebelum download atau cetak',
}: PDFPreviewDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && iframeRef.current && html) {
      setLoading(true);
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        // Remove print button from preview
        const cleanHtml = html.replace(/<div class="no-print"[\s\S]*?<\/div>\s*<\/body>/, '</body>');
        doc.open();
        doc.write(cleanHtml);
        doc.close();
        setTimeout(() => setLoading(false), 300);
      }
    }
  }, [open, html]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative overflow-hidden bg-muted/30">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title="PDF Preview"
            style={{ transform: 'scale(0.85)', transformOrigin: 'top center', height: '118%' }}
          />
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Tutup
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Cetak / Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
