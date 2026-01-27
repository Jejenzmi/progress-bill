import { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, AlertTriangle, CheckCircle, Trash2, Save, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ConfirmationType = 'delete' | 'save' | 'update' | 'warning' | 'success';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: ConfirmationType;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
  icon?: ReactNode;
}

const typeConfig: Record<ConfirmationType, { 
  icon: ReactNode; 
  iconBgClass: string;
  buttonClass: string;
}> = {
  delete: {
    icon: <Trash2 className="h-6 w-6 text-destructive" />,
    iconBgClass: 'bg-destructive/10',
    buttonClass: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  },
  save: {
    icon: <Save className="h-6 w-6 text-primary" />,
    iconBgClass: 'bg-primary/10',
    buttonClass: 'bg-primary text-primary-foreground hover:bg-primary/90',
  },
  update: {
    icon: <RefreshCw className="h-6 w-6 text-accent-foreground" />,
    iconBgClass: 'bg-accent',
    buttonClass: 'bg-primary text-primary-foreground hover:bg-primary/90',
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/30',
    buttonClass: 'bg-amber-600 text-white hover:bg-amber-700',
  },
  success: {
    icon: <CheckCircle className="h-6 w-6 text-green-600" />,
    iconBgClass: 'bg-green-100',
    buttonClass: 'bg-green-600 text-white hover:bg-green-700',
  },
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  type = 'warning',
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  onConfirm,
  loading = false,
  icon,
}: ConfirmationDialogProps) {
  const config = typeConfig[type];
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="flex flex-col items-center text-center space-y-4">
          {/* Animated Icon */}
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            'animate-in zoom-in-50 duration-300',
            config.iconBgClass
          )}>
            {icon || config.icon}
          </div>
          
          <AlertDialogTitle className="text-xl font-semibold">
            {title}
          </AlertDialogTitle>
          
          <AlertDialogDescription className="text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <AlertDialogCancel 
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className={cn('w-full sm:w-auto', config.buttonClass)}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Preset confirmation dialogs for common actions
export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  itemName,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      type="delete"
      title="Hapus Item?"
      description={`Anda yakin ingin menghapus "${itemName}"? Tindakan ini tidak dapat dibatalkan.`}
      confirmLabel="Hapus"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}

export function SaveConfirmationDialog({
  open,
  onOpenChange,
  itemName,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      type="save"
      title="Simpan Perubahan?"
      description={`Simpan perubahan pada "${itemName}"?`}
      confirmLabel="Simpan"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}

export function UpdateConfirmationDialog({
  open,
  onOpenChange,
  itemName,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      type="update"
      title="Perbarui Data?"
      description={`Anda yakin ingin memperbarui "${itemName}"?`}
      confirmLabel="Perbarui"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}
