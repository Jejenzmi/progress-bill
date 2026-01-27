import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PDFPageSelectorProps {
  file: File | null;
  value: number;
  onChange: (page: number) => void;
  className?: string;
}

export function PDFPageSelector({ file, value, onChange, className }: PDFPageSelectorProps) {
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file || file.type !== 'application/pdf') {
      setTotalPages(1);
      onChange(1);
      return;
    }

    const countPages = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        // Simple PDF page count by searching for /Type /Page entries
        // This is a lightweight approach without loading full pdf-lib
        const text = new TextDecoder('latin1').decode(bytes);
        
        // Count /Type /Page or /Type/Page patterns (actual page objects, not /Pages)
        const pageMatches = text.match(/\/Type\s*\/Page[^s]/g);
        const count = pageMatches ? pageMatches.length : 1;
        
        // Alternative: look for /Count in /Pages object
        const countMatch = text.match(/\/Count\s+(\d+)/);
        const pagesCount = countMatch ? parseInt(countMatch[1], 10) : count;
        
        const finalCount = Math.max(1, pagesCount || count);
        setTotalPages(finalCount);
        
        // Reset to page 1 if current page exceeds total
        if (value > finalCount) {
          onChange(1);
        }
      } catch (err) {
        console.error('Error counting PDF pages:', err);
        setError('Gagal menghitung halaman PDF');
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    countPages();
  }, [file]);

  if (!file || file.type !== 'application/pdf') {
    return null;
  }

  const handlePrevPage = () => {
    if (value > 1) {
      onChange(value - 1);
    }
  };

  const handleNextPage = () => {
    if (value < totalPages) {
      onChange(value + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      onChange(num);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Halaman untuk QR Code TTE
      </Label>
      
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Menghitung halaman...
        </div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : (
        <div className="space-y-3">
          {/* Quick Select for common options */}
          <Select 
            value={value === 1 ? 'first' : value === totalPages ? 'last' : 'custom'}
            onValueChange={(val) => {
              if (val === 'first') onChange(1);
              else if (val === 'last') onChange(totalPages);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih halaman" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first">Halaman Pertama (1)</SelectItem>
              <SelectItem value="last">Halaman Terakhir ({totalPages})</SelectItem>
              {totalPages > 2 && (
                <SelectItem value="custom">Pilih Manual</SelectItem>
              )}
            </SelectContent>
          </Select>

          {/* Page Navigator */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handlePrevPage}
              disabled={value <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2 flex-1 justify-center">
              <span className="text-sm text-muted-foreground">Halaman</span>
              <Input
                type="number"
                min={1}
                max={totalPages}
                value={value}
                onChange={handleInputChange}
                className="w-16 h-8 text-center"
              />
              <span className="text-sm text-muted-foreground">dari {totalPages}</span>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleNextPage}
              disabled={value >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Visual indicator */}
          {totalPages > 1 && (
            <div className="flex gap-1 justify-center flex-wrap">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => onChange(page)}
                  className={cn(
                    'w-7 h-7 rounded text-xs font-medium transition-colors',
                    page === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  {page}
                </button>
              ))}
              {totalPages > 10 && (
                <span className="w-7 h-7 flex items-center justify-center text-xs text-muted-foreground">
                  ...
                </span>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            QR Code TTE akan ditempatkan di halaman {value}
          </p>
        </div>
      )}
    </div>
  );
}
