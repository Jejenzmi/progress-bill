import { cn } from '@/lib/utils';
import { QrCode } from 'lucide-react';
import { parseQRPosition, QRPositionValue } from './QRPositionSelector';
import { getAllowedBoxCenterBoundsForPage, getPresetBoxCenter, getPresetBoxCenterForPage, getTTEBoxPercent, type TTESize } from '@/lib/tteBoxPreview';

interface TTEBoxOverlayProps {
  qrPosition: string | QRPositionValue;
  qrPage?: number;
  isPdf?: boolean;
  showInfoBadge?: boolean;
  className?: string;
  pagePt?: { widthPt: number; heightPt: number };
}

/**
 * Overlay yang menunjukkan posisi dan ukuran kotak TTE (QR + teks) secara proporsional
 * terhadap ukuran halaman A4, sehingga konsisten dengan hasil PDF.
 */
export function TTEBoxOverlay({
  qrPosition,
  qrPage,
  isPdf = false,
  showInfoBadge = true,
  className,
  pagePt,
}: TTEBoxOverlayProps) {
  const parsed = parseQRPosition(qrPosition);
  const size: TTESize = parsed.size || 'medium';

  // Ukuran kotak harus mengikuti ukuran halaman asli (pt) agar 1:1 dengan embed PDF.
  const { boxW, boxH } = pagePt
    ? getAllowedBoxCenterBoundsForPage(size, pagePt.widthPt, pagePt.heightPt)
    : getTTEBoxPercent(size);

  // Hitung posisi center
  const getCenter = (): { x: number; y: number } => {
    if (parsed.type === 'custom' && parsed.x !== undefined && parsed.y !== undefined) {
      return { x: parsed.x, y: parsed.y };
    }
    if (pagePt) {
      return getPresetBoxCenterForPage(parsed.preset || 'bottom-right', size, pagePt.widthPt, pagePt.heightPt);
    }
    return getPresetBoxCenter(parsed.preset || 'bottom-right', size);
  };

  const center = getCenter();

  const getPositionLabel = (): string => {
    if (parsed.type === 'custom') {
      return `Kustom (${parsed.x?.toFixed(0)}%, ${parsed.y?.toFixed(0)}%)`;
    }
    const presetLabels: Record<string, string> = {
      'top-left': 'Kiri Atas',
      'top-right': 'Kanan Atas',
      'center': 'Tengah',
      'bottom-left': 'Kiri Bawah',
      'bottom-right': 'Kanan Bawah',
    };
    return presetLabels[parsed.preset || 'bottom-right'] || 'Kanan Bawah';
  };

  const getSizeLabel = (): string => {
    switch (size) {
      case 'small': return 'Kecil';
      case 'large': return 'Besar';
      default: return 'Sedang';
    }
  };

  return (
    <>
      {/* TTE Box Overlay - ukuran proporsional A4 */}
      <div
        className={cn(
          'absolute border-2 border-dashed border-primary bg-primary/10 rounded pointer-events-none z-20',
          className
        )}
        style={{
          left: `${center.x}%`,
          top: `${center.y}%`,
          transform: 'translate(-50%, -50%)',
          width: `${boxW}%`,
          height: `${boxH}%`,
        }}
      >
        {/* QR icon area (kiri) */}
        <div className="absolute left-[6%] top-[10%] w-[34%] aspect-square rounded border border-primary/40 bg-background/70 flex items-center justify-center">
          <QrCode className="h-4 w-4 text-primary" />
        </div>

        {/* Text area (kanan) */}
        <div className="absolute left-[44%] top-[12%] right-[6%] bottom-[12%] flex flex-col justify-between">
          <div className="text-[7px] font-semibold text-primary leading-tight truncate">
            Tanda Tangan Elektronik
          </div>
          <div className="space-y-0.5">
            <div className="h-[2px] w-[85%] rounded bg-primary/30" />
            <div className="h-[2px] w-[70%] rounded bg-primary/25" />
            <div className="h-[2px] w-[55%] rounded bg-primary/20" />
          </div>
          <div className="text-[6px] text-primary/70">ID: ••••••</div>
        </div>
      </div>

      {/* Position Info Badge */}
      {showInfoBadge && (
        <div className="absolute bottom-2 left-2 bg-background/95 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium z-20 border shadow-sm flex items-center gap-2 flex-wrap">
          <QrCode className="h-3 w-3 text-primary" />
          {isPdf && qrPage && (
            <>
              <span className="text-muted-foreground">Hal:</span>
              <span className="font-semibold">{qrPage}</span>
              <span className="text-muted-foreground">|</span>
            </>
          )}
          <span className="text-muted-foreground">Posisi:</span>
          <span className="font-semibold">{getPositionLabel()}</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">Ukuran:</span>
          <span className="font-semibold">{getSizeLabel()}</span>
        </div>
      )}
    </>
  );
}
