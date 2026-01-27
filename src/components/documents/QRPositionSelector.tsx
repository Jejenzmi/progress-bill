import { cn } from '@/lib/utils';

interface QRPositionSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const positions = [
  { id: 'top-left', label: 'Kiri Atas', row: 0, col: 0 },
  { id: 'top-right', label: 'Kanan Atas', row: 0, col: 2 },
  { id: 'center', label: 'Tengah', row: 1, col: 1 },
  { id: 'bottom-left', label: 'Kiri Bawah', row: 2, col: 0 },
  { id: 'bottom-right', label: 'Kanan Bawah', row: 2, col: 2 },
];

export function QRPositionSelector({ value, onChange }: QRPositionSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="border rounded-lg p-4 bg-muted/30">
        {/* Document Preview */}
        <div className="relative aspect-[210/297] bg-background border rounded shadow-sm mx-auto max-w-[200px]">
          {/* Grid overlay for position selection */}
          <div className="absolute inset-2 grid grid-cols-3 grid-rows-3 gap-1">
            {[0, 1, 2].map((row) =>
              [0, 1, 2].map((col) => {
                const position = positions.find((p) => p.row === row && p.col === col);
                if (!position) {
                  return <div key={`${row}-${col}`} className="invisible" />;
                }
                
                const isSelected = value === position.id;
                
                return (
                  <button
                    key={position.id}
                    type="button"
                    onClick={() => onChange(position.id)}
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
          
          {/* Document lines decoration */}
          <div className="absolute inset-4 pointer-events-none">
            <div className="space-y-2 mt-8">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className="h-1 bg-muted rounded" 
                  style={{ width: `${70 + Math.random() * 30}%` }}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Selected position label */}
        <p className="text-center text-sm text-muted-foreground mt-3">
          Posisi terpilih: <span className="font-medium text-foreground">
            {positions.find((p) => p.id === value)?.label || 'Kanan Bawah'}
          </span>
        </p>
      </div>
      
      {/* Quick select buttons */}
      <div className="flex flex-wrap gap-2">
        {positions.map((position) => (
          <button
            key={position.id}
            type="button"
            onClick={() => onChange(position.id)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-full border transition-colors',
              value === position.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-input'
            )}
          >
            {position.label}
          </button>
        ))}
      </div>
    </div>
  );
}
