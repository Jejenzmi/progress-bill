export type TTESize = 'small' | 'medium' | 'large';

// A4 in PDF points (pdf-lib default)
export const A4_PT = {
  width: 595.28,
  height: 841.89,
} as const;

// Must stay in sync with src/lib/pdfEmbedder.ts (QR_SIZES)
export const TTE_BOX_PT: Record<TTESize, { qrSize: number; boxWidth: number; boxHeight: number }> = {
  small: { qrSize: 50, boxWidth: 120, boxHeight: 65 },
  medium: { qrSize: 60, boxWidth: 150, boxHeight: 75 },
  large: { qrSize: 70, boxWidth: 180, boxHeight: 85 },
};

export const TTE_MARGIN_PT = 15;

export function getTTEBoxPercent(size: TTESize) {
  const cfg = TTE_BOX_PT[size] ?? TTE_BOX_PT.medium;
  return {
    boxW: (cfg.boxWidth / A4_PT.width) * 100,
    boxH: (cfg.boxHeight / A4_PT.height) * 100,
    marginX: (TTE_MARGIN_PT / A4_PT.width) * 100,
    marginY: (TTE_MARGIN_PT / A4_PT.height) * 100,
  };
}

export function getAllowedBoxCenterBounds(size: TTESize) {
  const { boxW, boxH, marginX, marginY } = getTTEBoxPercent(size);
  const halfW = boxW / 2;
  const halfH = boxH / 2;

  return {
    minX: halfW + marginX,
    maxX: 100 - halfW - marginX,
    minY: halfH + marginY,
    maxY: 100 - halfH - marginY,
    boxW,
    boxH,
  };
}

export function getPresetBoxCenter(preset: string, size: TTESize): { x: number; y: number } {
  const { minX, maxX, minY, maxY } = getAllowedBoxCenterBounds(size);
  switch (preset) {
    case 'top-left':
      return { x: minX, y: minY };
    case 'top-right':
      return { x: maxX, y: minY };
    case 'bottom-left':
      return { x: minX, y: maxY };
    case 'bottom-right':
      return { x: maxX, y: maxY };
    case 'center':
      return { x: 50, y: 50 };
    default:
      return { x: maxX, y: maxY };
  }
}
