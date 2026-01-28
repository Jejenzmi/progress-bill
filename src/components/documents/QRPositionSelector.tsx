import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Move, Grid3X3, GripVertical, Maximize, Minimize, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getAllowedBoxCenterBounds, getPresetBoxCenter, getTTEBoxPercent } from '@/lib/tteBoxPreview';

export type QRSize = 'small' | 'medium' | 'large';

export interface QRPositionValue {
  type: 'preset' | 'custom';
  preset?: string;
  x?: number; // percentage 0-100
  y?: number; // percentage 0-100
  size?: QRSize;
}

interface QRPositionSelectorProps {
  value: string | QRPositionValue;
  onChange: (value: string | QRPositionValue) => void;
  showSizeSelector?: boolean;
}

const presets = [
  { id: 'top-left', label: 'Kiri Atas', row: 0, col: 0 },
  { id: 'top-right', label: 'Kanan Atas', row: 0, col: 2 },
  { id: 'center', label: 'Tengah', row: 1, col: 1 },
  { id: 'bottom-left', label: 'Kiri Bawah', row: 2, col: 0 },
  { id: 'bottom-right', label: 'Kanan Bawah', row: 2, col: 2 },
];

const sizeOptions: { id: QRSize; label: string; icon: React.ReactNode }[] = [
  { id: 'small', label: 'Kecil', icon: <Minimize className="h-4 w-4" /> },
  { id: 'medium', label: 'Sedang', icon: <Square className="h-4 w-4" /> },
  { id: 'large', label: 'Besar', icon: <Maximize className="h-4 w-4" /> },
];

export function parseQRPosition(value: string | QRPositionValue): QRPositionValue {
  if (typeof value === 'object') return { size: 'medium', ...value };
  
  // Check if it's a custom position string (format: "custom-X-Y" or "custom-X-Y-size")
  if (value.startsWith('custom-')) {
    const parts = value.split('-');
    const x = parseFloat(parts[1]) || 50;
    const y = parseFloat(parts[2]) || 50;
    const size = (parts[3] as QRSize) || 'medium';
    return { type: 'custom', x, y, size };
  }
  
  // Check for size suffix in preset (format: "bottom-right-medium")
  const sizeMatch = value.match(/(small|medium|large)$/);
  if (sizeMatch) {
    const preset = value.replace(`-${sizeMatch[1]}`, '');
    return { type: 'preset', preset, size: sizeMatch[1] as QRSize };
  }
  
  return { type: 'preset', preset: value, size: 'medium' };
}

export function stringifyQRPosition(value: QRPositionValue): string {
  const size = value.size || 'medium';
  if (value.type === 'custom' && value.x !== undefined && value.y !== undefined) {
    return `custom-${value.x.toFixed(1)}-${value.y.toFixed(1)}-${size}`;
  }
  return `${value.preset || 'bottom-right'}-${size}`;
}

export function QRPositionSelector({ value, onChange, showSizeSelector = true }: QRPositionSelectorProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>(() => {
    const parsed = parseQRPosition(value);
    return parsed.type;
  });
  
  const parsed = parseQRPosition(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const handlePresetClick = (presetId: string) => {
    setMode('preset');
    onChange({ type: 'preset', preset: presetId, size: parsed.size || 'medium' });
  };

  const handleSizeChange = (newSize: QRSize) => {
    onChange({ ...parsed, size: newSize });
  };

  const handleCustomClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'custom' || isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Clamp berdasarkan ukuran kotak TTE sebenarnya (bukan kotak QR preview)
    const bounds = getAllowedBoxCenterBounds(parsed.size || 'medium');
    const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, x));
    const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, y));
    
    onChange({ type: 'custom', x: clampedX, y: clampedY, size: parsed.size || 'medium' });
  }, [mode, onChange, isDragging, parsed.size]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'custom') return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [mode]);

  const handleDragMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || mode !== 'custom' || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const bounds = getAllowedBoxCenterBounds(parsed.size || 'medium');
    const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, x));
    const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, y));
    
    onChange({ type: 'custom', x: clampedX, y: clampedY, size: parsed.size || 'medium' });
  }, [isDragging, mode, onChange, parsed.size]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (mode !== 'custom') return;
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX, y: touch.clientY });
  }, [mode]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || mode !== 'custom' || !containerRef.current) return;
    
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    
    const bounds = getAllowedBoxCenterBounds(parsed.size || 'medium');
    const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, x));
    const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, y));
    
    onChange({ type: 'custom', x: clampedX, y: clampedY, size: parsed.size || 'medium' });
  }, [isDragging, mode, onChange, parsed.size]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchend', handleDragEnd);
      return () => {
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDragEnd]);

  const getPresetPosition = (presetId: string): { x: number; y: number } =>
    getPresetBoxCenter(presetId, parsed.size || 'medium');

  const currentPosition = parsed.type === 'custom' && parsed.x !== undefined && parsed.y !== undefined
    ? { x: parsed.x, y: parsed.y }
    : getPresetPosition(parsed.preset || 'bottom-right');

  const getPositionLabel = (): string => {
    if (parsed.type === 'custom') {
      return `Kustom (${parsed.x?.toFixed(0)}%, ${parsed.y?.toFixed(0)}%)`;
    }
    return presets.find((p) => p.id === parsed.preset)?.label || 'Kanan Bawah';
  };

  const getBoxStyle = (): React.CSSProperties => {
    const { boxW, boxH } = getTTEBoxPercent(parsed.size || 'medium');
    return { width: `${boxW}%`, height: `${boxH}%` };
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === 'preset' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setMode('preset');
            if (parsed.type !== 'preset') {
              onChange({ type: 'preset', preset: 'bottom-right', size: parsed.size || 'medium' });
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
              const initial = getPresetBoxCenter('bottom-right', parsed.size || 'medium');
              onChange({ type: 'custom', x: initial.x, y: initial.y, size: parsed.size || 'medium' });
            }
          }}
          className="flex-1"
        >
          <Move className="h-4 w-4 mr-2" />
          Bebas
        </Button>
      </div>

      {/* Size Selector */}
      {showSizeSelector && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Ukuran QR Code</Label>
          <div className="flex gap-2">
            {sizeOptions.map((option) => (
              <Button
                key={option.id}
                type="button"
                variant={parsed.size === option.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSizeChange(option.id)}
                className="flex-1"
              >
                {option.icon}
                <span className="ml-2 hidden sm:inline">{option.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="border rounded-lg p-4 bg-muted/30">
        {/* Document Preview */}
        <div 
          ref={containerRef}
          className={cn(
            "relative aspect-[210/297] bg-background border rounded shadow-sm mx-auto max-w-[200px]",
            mode === 'custom' && "cursor-crosshair",
            isDragging && "cursor-grabbing"
          )}
          onClick={handleCustomClick}
          onMouseMove={handleDragMove}
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
                          'rounded border-2 border-dashed flex items-center justify-center font-bold',
                          isSelected ? 'border-primary-foreground' : 'border-muted-foreground'
                        )}
                        style={{ width: '80%', height: '45%' }}
                      >
                        <span className="text-[9px]">TTE</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            /* Free placement mode - draggable QR indicator */
            <div 
              className={cn(
                "absolute transition-all",
                isDragging ? "cursor-grabbing scale-110" : "cursor-grab"
              )}
              style={{
                left: `${currentPosition.x}%`,
                top: `${currentPosition.y}%`,
                transform: 'translate(-50%, -50%)',
                ...getBoxStyle(),
              }}
              onMouseDown={handleDragStart}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
            >
              <div
                className={cn(
                  'relative h-full w-full rounded border-2 border-dashed transition-all',
                  'bg-primary/10 border-primary',
                  'shadow-lg hover:shadow-xl',
                  isDragging && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                <div className="absolute left-[6%] top-[10%] w-[34%] aspect-square rounded border border-primary/40 bg-background/70 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-primary">QR</span>
                </div>
                <div className="absolute left-[44%] top-[12%] right-[6%] bottom-[12%] flex flex-col justify-between">
                  <div className="text-[8px] font-semibold text-primary leading-tight">Tanda Tangan Elektronik</div>
                  <div className="space-y-1">
                    <div className="h-[2px] w-[85%] rounded bg-primary/30" />
                    <div className="h-[2px] w-[70%] rounded bg-primary/25" />
                  </div>
                  <div className="flex items-center gap-1 text-[8px] font-bold text-primary">
                    <GripVertical className="h-3 w-3 opacity-70" />
                    Drag
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Drag hint for custom mode */}
          {mode === 'custom' && !isDragging && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
              <div className="bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-muted-foreground border shadow-sm">
                Drag untuk pindahkan
              </div>
            </div>
          )}
        </div>
        
        {/* Selected position label */}
        <p className="text-center text-sm text-muted-foreground mt-3">
          Posisi: <span className="font-medium text-foreground">{getPositionLabel()}</span>
          {showSizeSelector && (
            <span className="ml-2">
              | Ukuran: <span className="font-medium text-foreground capitalize">{parsed.size || 'Sedang'}</span>
            </span>
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

      {/* Custom position info */}
      {mode === 'custom' && (
        <p className="text-xs text-muted-foreground text-center">
          Klik atau drag QR Code untuk memindahkan ke posisi yang diinginkan
        </p>
      )}
    </div>
  );
}
