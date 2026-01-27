import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';

interface LogoUploadProps {
  currentLogoUrl: string;
  onLogoChange: (url: string) => void;
  disabled?: boolean;
}

export function LogoUpload({ currentLogoUrl, onLogoChange, disabled = false }: LogoUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'File harus berupa gambar (PNG, JPG, atau JPEG)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Ukuran file maksimal 2MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      onLogoChange(urlData.publicUrl);

      toast({
        title: 'Berhasil',
        description: 'Logo berhasil diupload',
      });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengupload logo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    onLogoChange('');
    toast({
      title: 'Logo dihapus',
      description: 'Logo perusahaan telah dihapus dari pengaturan',
    });
  };

  return (
    <div className="space-y-4">
      <Label>Logo Perusahaan</Label>
      <p className="text-xs text-muted-foreground">
        Logo ini akan tampil di kop surat PDF Quotation dan Invoice
      </p>

      <div className="flex items-start gap-4">
        {/* Logo Preview */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
            {currentLogoUrl ? (
              <img
                src={currentLogoUrl}
                alt="Company Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Upload Controls */}
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {uploading ? 'Mengupload...' : 'Upload Logo'}
          </Button>

          {currentLogoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveLogo}
              disabled={disabled || uploading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus Logo
            </Button>
          )}

          <p className="text-xs text-muted-foreground mt-1">
            Format: PNG, JPG. Maks: 2MB
          </p>
        </div>
      </div>
    </div>
  );
}
