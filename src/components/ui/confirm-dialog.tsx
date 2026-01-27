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
import { cn } from '@/lib/utils';
import { Loader2, AlertTriangle, CheckCircle, Info, Trash2, Save, RefreshCw } from 'lucide-react';

export type ConfirmDialogVariant = 'default' | 'destructive' | 'success' | 'warning';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onConfirm: () => void;
  icon?: ReactNode;
}

const variantStyles: Record<ConfirmDialogVariant, {
  iconBg: string;
  iconColor: string;
  buttonClass: string;
  defaultIcon: ReactNode;
}> = {
  default: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    buttonClass: 'bg-primary text-primary-foreground hover:bg-primary/90',
    defaultIcon: <Save className="h-6 w-6" />,
  },
  destructive: {
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    buttonClass: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    defaultIcon: <Trash2 className="h-6 w-6" />,
  },
  success: {
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-600',
    buttonClass: 'bg-green-600 text-white hover:bg-green-700',
    defaultIcon: <CheckCircle className="h-6 w-6" />,
  },
  warning: {
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
    buttonClass: 'bg-amber-600 text-white hover:bg-amber-700',
    defaultIcon: <AlertTriangle className="h-6 w-6" />,
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'default',
  loading = false,
  onConfirm,
  icon,
}: ConfirmDialogProps) {
  const styles = variantStyles[variant];
  const displayIcon = icon ?? styles.defaultIcon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4">
          {/* Icon Container */}
          <div className={cn(
            'flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full',
            styles.iconBg,
            styles.iconColor
          )}>
            {displayIcon}
          </div>
          
          <div className="flex-1 space-y-2">
            <AlertDialogTitle className="text-lg font-semibold">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="mt-4 sm:mt-6 gap-2 sm:gap-0">
          <AlertDialogCancel 
            disabled={loading}
            className="mt-0"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className={cn(styles.buttonClass, 'min-w-[100px]')}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Specialized confirm dialogs for common use cases
interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType?: string;
  loading?: boolean;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  itemName,
  itemType = 'item',
  loading = false,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Hapus ${itemType}?`}
      description={
        <span>
          <strong className="text-foreground">"{itemName}"</strong> akan dihapus secara permanen. 
          Tindakan ini tidak dapat dibatalkan.
        </span>
      }
      confirmText="Hapus"
      variant="destructive"
      loading={loading}
      onConfirm={onConfirm}
    />
  );
}

interface SaveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string | ReactNode;
  loading?: boolean;
  onConfirm: () => void;
}

export function SaveConfirmDialog({
  open,
  onOpenChange,
  title = 'Simpan Perubahan?',
  description = 'Perubahan yang Anda buat akan disimpan.',
  loading = false,
  onConfirm,
}: SaveConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText="Simpan"
      variant="success"
      loading={loading}
      onConfirm={onConfirm}
      icon={<Save className="h-6 w-6" />}
    />
  );
}

interface UpdateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  changes?: string;
  loading?: boolean;
  onConfirm: () => void;
}

export function UpdateConfirmDialog({
  open,
  onOpenChange,
  itemName,
  changes,
  loading = false,
  onConfirm,
}: UpdateConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Perbarui Data?"
      description={
        <span>
          Data <strong className="text-foreground">"{itemName}"</strong> akan diperbarui.
          {changes && <span className="block mt-1 text-xs">{changes}</span>}
        </span>
      }
      confirmText="Perbarui"
      variant="default"
      loading={loading}
      onConfirm={onConfirm}
      icon={<RefreshCw className="h-6 w-6" />}
    />
  );
}
