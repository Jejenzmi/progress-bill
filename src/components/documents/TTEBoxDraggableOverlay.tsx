import { cn } from '@/lib/utils';
import { useCallback, useMemo, useRef, useState } from 'react';
import { parseQRPosition, stringifyQRPosition, type QRPositionValue } from './QRPositionSelector';
import {
  getAllowedBoxCenterBounds,
  getAllowedBoxCenterBoundsForPage,
  type TTESize,
} from '@/lib/tteBoxPreview';
import { QrCode, GripVertical } from 'lucide-react';

interface TTEBoxDraggableOverlayProps {
  qrPosition: string;
  onQrPositionChange: (next: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  pagePt?: { widthPt: number; heightPt: number };
  className?: string;
}

/**
 * Drag langsung di preview halaman (PDF canvas) agar posisi yg diset sama dengan hasil PDF.
 * Menyimpan koordinat sebagai custom-X-Y-size (persen).
 */
export function TTEBoxDraggableOverlay({
  qrPosition,
  onQrPositionChange,
  containerRef,
  pagePt,
  className,
}: TTEBoxDraggableOverlayProps) {
  const parsed = useMemo(() => parseQRPosition(qrPosition), [qrPosition]);
  const size: TTESize = (parsed.size as TTESize) || 'medium';
  const [dragging, setDragging] = useState(false);
  const pointerIdRef = useRef<number | null>(null);

  const bounds = useMemo(() => {
    if (pagePt?.widthPt && pagePt?.heightPt) {
      return getAllowedBoxCenterBoundsForPage(size, pagePt.widthPt, pagePt.heightPt);
    }
    return getAllowedBoxCenterBounds(size);
  }, [pagePt?.widthPt, pagePt?.heightPt, size]);

  const currentCenter = useMemo(() => {
    if (parsed.type === 'custom' && parsed.x !== undefined && parsed.y !== undefined) {
      return { x: parsed.x, y: parsed.y };
    }
    // Jika masih preset, mulai dari preset center (A4) tapi tetap bisa dipindah
    return { x: 50, y: 50 };
  }, [parsed]);

  const commitCenter = useCallback(
    (x: number, y: number) => {
      const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, x));
      const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, y));
      const next: QRPositionValue = { type: 'custom', x: clampedX, y: clampedY, size };
      onQrPositionChange(stringifyQRPosition(next));
    },
    [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, onQrPositionChange, size]
  );

  const xyFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      return { x, y };
    },
    [containerRef]
  );

  const handleBackgroundPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Klik di area halaman untuk pindah posisi
      if (e.button !== 0) return;
      const xy = xyFromClient(e.clientX, e.clientY);
      if (!xy) return;
      commitCenter(xy.x, xy.y);
    },
    [commitCenter, xyFromClient]
  );

  const handleBoxPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
      pointerIdRef.current = e.pointerId;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    },
    []
  );

  const handleBoxPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
      const xy = xyFromClient(e.clientX, e.clientY);
      if (!xy) return;
      commitCenter(xy.x, xy.y);
    },
    [commitCenter, dragging, xyFromClient]
  );

  const endDrag = useCallback(() => {
    setDragging(false);
    pointerIdRef.current = null;
  }, []);

  return (
    <div className={cn('absolute inset-0 z-30', className)} onPointerDown={handleBackgroundPointerDown}>
      {/* Draggable box */}
      <div
        className={cn('absolute', dragging ? 'cursor-grabbing' : 'cursor-grab')}
        style={{
          left: `${currentCenter.x}%`,
          top: `${currentCenter.y}%`,
          transform: 'translate(-50%, -50%)',
          width: `${bounds.boxW}%`,
          height: `${bounds.boxH}%`,
        }}
        onPointerDown={handleBoxPointerDown}
        onPointerMove={handleBoxPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className={cn(
            'relative h-full w-full rounded border-2 border-dashed',
            'border-primary bg-primary/10',
            dragging && 'ring-2 ring-primary ring-offset-2'
          )}
        >
          <div className="absolute left-[6%] top-[10%] w-[34%] aspect-square rounded border border-primary/40 bg-background/70 flex items-center justify-center">
            <QrCode className="h-4 w-4 text-primary" />
          </div>
          <div className="absolute left-[44%] top-[12%] right-[6%] bottom-[12%] flex flex-col justify-between">
            <div className="text-[7px] font-semibold text-primary leading-tight truncate">Tanda Tangan Elektronik</div>
            <div className="space-y-0.5">
              <div className="h-[2px] w-[85%] rounded bg-primary/30" />
              <div className="h-[2px] w-[70%] rounded bg-primary/25" />
              <div className="h-[2px] w-[55%] rounded bg-primary/20" />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-primary/80">
              <GripVertical className="h-3 w-3" />
              Drag
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
