import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Move, Grid3X3, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export type QRSize = 'small' | 'medium' | 'large';

export interface QRPositionValue {
  type: 'preset' | 'custom';
  preset?: string;
  x?: number; // percentage 0-100
  y?: number; // percentage 0-100
}

interface QRPositionSelectorProps {
  value: string | QRPositionValue;
  onChange: (value: string | QRPositionValue) => void;
  size?: QRSize;
  onSizeChange?: (size: QRSize) => void;
  showSizeSelector?: boolean;
}

const presets = [
  { id: 'top-left', label: 'Kiri Atas', row: 0, col: 0 },
  { id: 'top-right', label: 'Kanan Atas', row: 0, col: 2 },
  { id: 'center', label: 'Tengah', row: 1, col: 1 },
  { id: 'bottom-left', label: 'Kiri Bawah', row: 2, col: 0 },
  { id: 'bottom-right', label: 'Kanan Bawah', row: 2, col: 2 },
];

const sizeOptions: { value: QRSize; label: string; scale: number }[] = [
  { value: 'small', label: 'Kecil', scale: 0.7 },
  { value: 'medium', label: 'Sedang', scale: 1 },
  { value: 'large', label: 'Besar', scale: 1.4 },
];

export function parseQRPosition(value: string | QRPositionValue): QRPositionValue {
  if (typeof value === 'object') return value;
  
  // Check if it's a custom position string (format: "custom-X-Y")
  if (value.startsWith('custom-')) {
    const parts = value.split('-');
    return {
      type: 'custom',
      x: parseFloat(parts[1]) || 50,
      y: parseFloat(parts[2]) || 50,
    };
  }
  
  // It's a preset
  return { type: 'preset', preset: value };
}

export function stringifyQRPosition(value: QRPositionValue): string {
  if (value.type === 'custom' && value.x !== undefined && value.y !== undefined) {
    return `custom-${value.x.toFixed(1)}-${value.y.toFixed(1)}`;
  }
  return value.preset || 'bottom-right';
}

export function QRPositionSelector({ 
  value, 
  onChange, 
  size = 'medium',
  onSizeChange,
  showSizeSelector = true 
}: QRPositionSelectorProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>(() => {
    const parsed = parseQRPosition(value);
    return parsed.type;
  });
  
  const parsed = parseQRPosition(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handlePresetClick = (presetId: string) => {
    setMode('preset');
    onChange({ type: 'preset', preset: presetId });
  };

  const getPresetPosition = (presetId: string): { x: number; y: number } => {
    switch (presetId) {
      case 'top-left': return { x: 15, y: 12 };
      case 'top-right': return { x: 85, y: 12 };
      case 'center': return { x: 50, y: 50 };
      case 'bottom-left': return { x: 15, y: 88 };
      case 'bottom-right': return { x: 85, y: 88 };
      default: return { x: 85, y: 88 };
    }
  };

  const currentPosition = parsed.type === 'custom' && parsed.x !== undefined && parsed.y !== undefined
    ? { x: parsed.x, y: parsed.y }
    : getPresetPosition(parsed.preset || 'bottom-right');

  // Mouse/Touch event handlers for drag
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'custom') return;
    e.preventDefault();
    
    const container = containerRef.current;
    const qr = qrRef.current;
    if (!container || !qr) return;
    
    const containerRect = container.getBoundingClientRect();
    const qrRect = qr.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    setDragOffset({
      x: clientX - qrRect.left - qrRect.width / 2,
      y: clientY - qrRect.top - qrRect.height / 2,
    });
    setIsDragging(true);
  }, [mode]);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || mode !== 'custom') return;
    e.preventDefault();
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    const clampedX = Math.max(10, Math.min(90, x));
    const clampedY = Math.max(10, Math.min(90, y));
    
    onChange({ type: 'custom', x: clampedX, y: clampedY });
  }, [isDragging, mode, onChange]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global event listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Click to place in custom mode
  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'custom' || isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const clampedX = Math.max(10, Math.min(90, x));
    const clampedY = Math.max(10, Math.min(90, y));
    
    onChange({ type: 'custom', x: clampedX, y: clampedY });
  }, [mode, isDragging, onChange]);

  const getPositionLabel = (): string => {
    if (parsed.type === 'custom') {
      return `Kustom (${parsed.x?.toFixed(0)}%, ${parsed.y?.toFixed(0)}%)`;
    }
    return presets.find((p) => p.id === parsed.preset)?.label || 'Kanan Bawah';
  };

  const currentSizeConfig = sizeOptions.find(s => s.value === size) || sizeOptions[1];

  return (
    <div className="space-y-3">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === 'preset' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setMode('preset');
            if (parsed.type !== 'preset') {
              onChange({ type: 'preset', preset: 'bottom-right' });
            }
          }}
          className="flex-1"
        >
          <Grid3X3 className="h-4 w-4 mr-2" />
          Preset
        </Button>
        <Button
          type="button"
          variant={mode === 'custom' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setMode('custom');
            if (parsed.type !== 'custom') {
              onChange({ type: 'custom', x: 85, y: 85 });
            }
          }}
          className="flex-1"
        >
          <Move className="h-4 w-4 mr-2" />
          Bebas
        </Button>
      </div>

      {/* Size Selector */}
      {showSizeSelector && onSizeChange && (
        <div className="space-y-2">
          <Label className="text-sm">Ukuran QR Code</Label>
          <div className="flex gap-2">
            {sizeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSizeChange(option.value)}
                className={cn(
                  'flex-1 px-3 py-2 text-xs rounded-lg border transition-all flex flex-col items-center gap-1',
                  size === option.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-input'
                )}
              >
                <div 
                  className={cn(
                    'border-2 border-current rounded flex items-center justify-center',
                    option.value === 'small' && 'w-4 h-4 text-[6px]',
                    option.value === 'medium' && 'w-5 h-5 text-[7px]',
                    option.value === 'large' && 'w-6 h-6 text-[8px]'
                  )}
                >
                  QR
                </div>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border rounded-lg p-4 bg-muted/30">
        {/* Document Preview */}
        <div 
          ref={containerRef}
          className={cn(
            "relative aspect-[210/297] bg-background border rounded shadow-sm mx-auto max-w-[200px] select-none",
            mode === 'custom' && "cursor-crosshair"
          )}
          onClick={handleContainerClick}
        >
          {/* Document lines decoration */}
          <div className="absolute inset-4 pointer-events-none">
            <div className="h-3 w-16 bg-muted rounded mb-2" />
            <div className="space-y-1.5 mt-4">
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i} 
                  className="h-1 bg-muted/70 rounded" 
                  style={{ width: `${60 + (i % 3) * 15}%` }}
                />
              ))}
            </div>
          </div>

          {mode === 'preset' ? (
            /* Preset Grid overlay for position selection */
            <div className="absolute inset-2 grid grid-cols-3 grid-rows-3 gap-1">
              {[0, 1, 2].map((row) =>
                [0, 1, 2].map((col) => {
                  const position = presets.find((p) => p.row === row && p.col === col);
                  if (!position) {
                    return <div key={`${row}-${col}`} className="invisible" />;
                  }
                  
                  const isSelected = parsed.type === 'preset' && parsed.preset === position.id;
                  
                  return (
                    <button
                      key={position.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePresetClick(position.id);
                      }}
                      className={cn(
                        'flex items-center justify-center rounded transition-all',
                        'hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary',
                        isSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted/50'
                      )}
                      title={position.label}
                    >
                      <div 
                        className={cn(
                          'rounded border-2 border-dashed flex items-center justify-center font-bold transition-all',
                          isSelected 
                            ? 'border-primary-foreground' 
                            : 'border-muted-foreground',
                          currentSizeConfig.value === 'small' && 'w-5 h-5 text-[6px]',
                          currentSizeConfig.value === 'medium' && 'w-6 h-6 text-[7px]',
                          currentSizeConfig.value === 'large' && 'w-8 h-8 text-[8px]'
                        )}
                      >
                        QR
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            /* Free placement mode - draggable QR indicator */
            <>
              <div 
                ref={qrRef}
                className={cn(
                  'absolute cursor-grab active:cursor-grabbing z-10 group',
                  isDragging && 'scale-110'
                )}
                style={{
                  left: `${currentPosition.x}%`,
                  top: `${currentPosition.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
              >
                {/* Drag handle indicator */}
                <div 
                  className={cn(
                    'rounded border-2 flex items-center justify-center font-bold transition-all relative',
                    'bg-primary text-primary-foreground border-primary-foreground shadow-lg',
                    isDragging && 'ring-4 ring-primary/30',
                    currentSizeConfig.value === 'small' && 'w-6 h-6 text-[7px]',
                    currentSizeConfig.value === 'medium' && 'w-8 h-8 text-[8px]',
                    currentSizeConfig.value === 'large' && 'w-10 h-10 text-[10px]'
                  )}
                >
                  QR
                  {/* Drag grip icon */}
                  <div className="absolute -top-1 -right-1 bg-primary rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-2 h-2 text-primary-foreground" />
                  </div>
                </div>
              </div>
              
              {/* Drop zone hint */}
              {!isDragging && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-[10px] text-muted-foreground shadow-sm border">
                    Drag atau klik untuk pindahkan
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Selected position label */}
        <p className="text-center text-sm text-muted-foreground mt-3">
          Posisi: <span className="font-medium text-foreground">{getPositionLabel()}</span>
          {showSizeSelector && (
            <span className="ml-2">• Ukuran: <span className="font-medium text-foreground">{currentSizeConfig.label}</span></span>
          )}
        </p>
      </div>
      
      {/* Quick select buttons (preset mode only) */}
      {mode === 'preset' && (
        <div className="flex flex-wrap gap-2">
          {presets.map((position) => (
            <button
              key={position.id}
              type="button"
              onClick={() => handlePresetClick(position.id)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-full border transition-colors',
                parsed.type === 'preset' && parsed.preset === position.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-input'
              )}
            >
              {position.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
