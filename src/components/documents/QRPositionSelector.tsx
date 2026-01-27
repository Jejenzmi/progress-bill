import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Move, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface QRPositionValue {
  type: 'preset' | 'custom';
  preset?: string;
  x?: number; // percentage 0-100
  y?: number; // percentage 0-100
}

interface QRPositionSelectorProps {
  value: string | QRPositionValue;
  onChange: (value: string | QRPositionValue) => void;
}

const presets = [
  { id: 'top-left', label: 'Kiri Atas', row: 0, col: 0 },
  { id: 'top-right', label: 'Kanan Atas', row: 0, col: 2 },
  { id: 'center', label: 'Tengah', row: 1, col: 1 },
  { id: 'bottom-left', label: 'Kiri Bawah', row: 2, col: 0 },
  { id: 'bottom-right', label: 'Kanan Bawah', row: 2, col: 2 },
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

export function QRPositionSelector({ value, onChange }: QRPositionSelectorProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>(() => {
    const parsed = parseQRPosition(value);
    return parsed.type;
  });
  
  const parsed = parseQRPosition(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePresetClick = (presetId: string) => {
    setMode('preset');
    onChange({ type: 'preset', preset: presetId });
  };

  const handleCustomClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'custom') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Clamp values to keep QR inside bounds (considering QR size ~15%)
    const clampedX = Math.max(8, Math.min(92, x));
    const clampedY = Math.max(8, Math.min(92, y));
    
    onChange({ type: 'custom', x: clampedX, y: clampedY });
  }, [mode, onChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || mode !== 'custom') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const clampedX = Math.max(8, Math.min(92, x));
    const clampedY = Math.max(8, Math.min(92, y));
    
    onChange({ type: 'custom', x: clampedX, y: clampedY });
  }, [isDragging, mode, onChange]);

  const getPresetPosition = (presetId: string): { x: number; y: number } => {
    switch (presetId) {
      case 'top-left': return { x: 12, y: 12 };
      case 'top-right': return { x: 88, y: 12 };
      case 'center': return { x: 50, y: 50 };
      case 'bottom-left': return { x: 12, y: 85 };
      case 'bottom-right': return { x: 88, y: 85 };
      default: return { x: 88, y: 85 };
    }
  };

  const currentPosition = parsed.type === 'custom' && parsed.x !== undefined && parsed.y !== undefined
    ? { x: parsed.x, y: parsed.y }
    : getPresetPosition(parsed.preset || 'bottom-right');

  const getPositionLabel = (): string => {
    if (parsed.type === 'custom') {
      return `Kustom (${parsed.x?.toFixed(0)}%, ${parsed.y?.toFixed(0)}%)`;
    }
    return presets.find((p) => p.id === parsed.preset)?.label || 'Kanan Bawah';
  };

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

      <div className="border rounded-lg p-4 bg-muted/30">
        {/* Document Preview */}
        <div 
          ref={containerRef}
          className={cn(
            "relative aspect-[210/297] bg-background border rounded shadow-sm mx-auto max-w-[200px]",
            mode === 'custom' && "cursor-crosshair"
          )}
          onClick={handleCustomClick}
          onMouseMove={handleMouseMove}
          onMouseDown={() => mode === 'custom' && setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
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
                          'w-6 h-6 rounded border-2 border-dashed flex items-center justify-center text-[8px] font-bold',
                          isSelected 
                            ? 'border-primary-foreground' 
                            : 'border-muted-foreground'
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
            <div 
              className="absolute pointer-events-none"
              style={{
                left: `${currentPosition.x}%`,
                top: `${currentPosition.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div 
                className={cn(
                  'w-8 h-8 rounded border-2 border-dashed flex items-center justify-center text-[8px] font-bold transition-all',
                  'bg-primary text-primary-foreground border-primary-foreground',
                  isDragging && 'scale-110'
                )}
              >
                QR
              </div>
            </div>
          )}

          {/* Click hint for custom mode */}
          {mode === 'custom' && !isDragging && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-muted-foreground">
                Klik untuk pindahkan
              </div>
            </div>
          )}
        </div>
        
        {/* Selected position label */}
        <p className="text-center text-sm text-muted-foreground mt-3">
          Posisi terpilih: <span className="font-medium text-foreground">
            {getPositionLabel()}
          </span>
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
          Klik atau drag pada preview dokumen untuk memindahkan posisi QR Code
        </p>
      )}
    </div>
  );
}
