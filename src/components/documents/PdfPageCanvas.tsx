import { cn } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any;

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import('pdfjs-dist');
  // Use CDN for worker to avoid Vite/Rollup resolution issues
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  return pdfjsLib;
}

interface PdfPageCanvasProps {
  src: string;
  pageNumber: number;
  className?: string;
  children?:
    | React.ReactNode
    | ((ctx: {
        containerRef: React.RefObject<HTMLDivElement>;
        pagePt?: { widthPt: number; heightPt: number };
      }) => React.ReactNode);
}

/**
 * Render 1 halaman PDF ke canvas agar overlay (TTEBoxOverlay) benar-benar mengacu
 * ke ukuran halaman aktual (bukan iframe browser PDF viewer).
 */
export function PdfPageCanvas({ src, pageNumber, className, children }: PdfPageCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wrapperSize, setWrapperSize] = useState<{ w: number; h: number } | null>(null);
  const [renderSize, setRenderSize] = useState<{ w: number; h: number } | null>(null);
  const [pagePt, setPagePt] = useState<{ widthPt: number; heightPt: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const safePage = useMemo(() => Math.max(1, pageNumber || 1), [pageNumber]);

  // Track available render area
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setWrapperSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    // Initial
    const rect = el.getBoundingClientRect();
    setWrapperSize({ w: rect.width, h: rect.height });

    return () => ro.disconnect();
  }, []);

  // Render page to canvas
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderTask: any = null;

    async function run() {
      if (!src || !wrapperSize?.w || !wrapperSize?.h || !canvasRef.current) return;
      setLoading(true);

      try {
        const pdf = await getPdfJs();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const loadingTask: any = pdf.getDocument({ url: src });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc: any = await loadingTask.promise;

        const pageIndex = Math.min(Math.max(1, safePage), doc.numPages);
        const page = await doc.getPage(pageIndex);

        // page.view is in PDF user space (pt)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const view: any = page.view;
        if (Array.isArray(view) && view.length >= 4) {
          const widthPt = Math.abs(view[2] - view[0]);
          const heightPt = Math.abs(view[3] - view[1]);
          setPagePt({ widthPt, heightPt });
        }

        // Scale to fit container
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(wrapperSize.w / baseViewport.width, wrapperSize.h / baseViewport.height);
        const viewport = page.getViewport({ scale });

        if (cancelled) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        setRenderSize({ w: viewport.width, h: viewport.height });

        renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel?.();
      } catch {
        // ignore
      }
    };
  }, [src, safePage, wrapperSize?.w, wrapperSize?.h]);

  return (
    <div ref={wrapperRef} className={cn('w-full h-full flex items-center justify-center', className)}>
      <div
        ref={pageContainerRef}
        className="relative"
        style={renderSize ? { width: `${renderSize.w}px`, height: `${renderSize.h}px` } : undefined}
      >
        <canvas ref={canvasRef} className={cn('block rounded bg-background', loading && 'opacity-40')} />
        {typeof children === 'function'
          ? children({ containerRef: pageContainerRef, pagePt: pagePt ?? undefined })
          : children}
      </div>
    </div>
  );
}

