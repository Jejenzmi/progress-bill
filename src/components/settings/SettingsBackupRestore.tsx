import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Upload, Loader2, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BackupData {
  version: string;
  exportedAt: string;
  settings: Record<string, any>[];
  bankAccounts: any[];
  products: any[];
  salesTargets: any[];
}

export function SettingsBackupRestore() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<BackupData | null>(null);
  const [importPreview, setImportPreview] = useState<{
    settings: number;
    bankAccounts: number;
    products: number;
    salesTargets: number;
  } | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all settings data
      const [settingsRes, bankAccountsRes, productsRes, targetsRes] = await Promise.all([
        supabase.from('settings').select('*'),
        supabase.from('bank_accounts').select('*'),
        supabase.from('products').select('*'),
        supabase.from('sales_targets').select('*'),
      ]);

      if (settingsRes.error) throw settingsRes.error;
      if (bankAccountsRes.error) throw bankAccountsRes.error;
      if (productsRes.error) throw productsRes.error;
      if (targetsRes.error) throw targetsRes.error;

      const backupData: BackupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        settings: settingsRes.data || [],
        bankAccounts: bankAccountsRes.data || [],
        products: productsRes.data || [],
        salesTargets: targetsRes.data || [],
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `settings-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Berhasil',
        description: `Backup berhasil diunduh dengan ${settingsRes.data?.length || 0} pengaturan, ${bankAccountsRes.data?.length || 0} rekening, ${productsRes.data?.length || 0} produk, dan ${targetsRes.data?.length || 0} target.`,
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Export Gagal',
        description: error.message || 'Terjadi kesalahan saat mengekspor data',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as BackupData;

        // Validate backup structure
        if (!data.version || !data.exportedAt) {
          throw new Error('File backup tidak valid: format tidak dikenali');
        }

        if (!data.settings && !data.bankAccounts && !data.products && !data.salesTargets) {
          throw new Error('File backup tidak berisi data yang dapat diimpor');
        }

        // Set preview and open confirmation dialog
        setImportPreview({
          settings: data.settings?.length || 0,
          bankAccounts: data.bankAccounts?.length || 0,
          products: data.products?.length || 0,
          salesTargets: data.salesTargets?.length || 0,
        });
        setPendingImportData(data);
        setConfirmDialogOpen(true);
      } catch (error: any) {
        toast({
          title: 'File Tidak Valid',
          description: error.message || 'Gagal membaca file backup. Pastikan file JSON valid.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!pendingImportData) return;

    setImporting(true);
    setConfirmDialogOpen(false);

    try {
      const data = pendingImportData;
      let imported = { settings: 0, bankAccounts: 0, products: 0, salesTargets: 0 };

      // Import settings (upsert by key)
      if (data.settings?.length > 0) {
        for (const setting of data.settings) {
          const { error } = await supabase
            .from('settings')
            .upsert({ key: setting.key, value: setting.value }, { onConflict: 'key' });
          if (!error) imported.settings++;
        }
      }

      // Import bank accounts (insert new, skip existing by account_number)
      if (data.bankAccounts?.length > 0) {
        for (const account of data.bankAccounts) {
          const { id, created_at, updated_at, ...accountData } = account;
          const { error } = await supabase
            .from('bank_accounts')
            .upsert(accountData, { onConflict: 'account_number' });
          if (!error) imported.bankAccounts++;
        }
      }

      // Import products (upsert by SKU if exists, otherwise insert)
      if (data.products?.length > 0) {
        for (const product of data.products) {
          const { id, created_at, updated_at, ...productData } = product;
          if (productData.sku) {
            const { error } = await supabase
              .from('products')
              .upsert(productData, { onConflict: 'sku' });
            if (!error) imported.products++;
          } else {
            const { error } = await supabase
              .from('products')
              .insert(productData);
            if (!error) imported.products++;
          }
        }
      }

      // Import sales targets (skip duplicates)
      if (data.salesTargets?.length > 0) {
        for (const target of data.salesTargets) {
          const { id, created_at, updated_at, created_by, ...targetData } = target;
          // Check if similar target exists
          const { data: existing } = await supabase
            .from('sales_targets')
            .select('id')
            .eq('target_type', targetData.target_type)
            .eq('target_period', targetData.target_period)
            .eq('user_id', targetData.user_id || '')
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase
              .from('sales_targets')
              .insert(targetData);
            if (!error) imported.salesTargets++;
          }
        }
      }

      toast({
        title: 'Import Berhasil',
        description: `Berhasil mengimpor: ${imported.settings} pengaturan, ${imported.bankAccounts} rekening, ${imported.products} produk, ${imported.salesTargets} target.`,
      });

      // Reload page to reflect changes
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import Gagal',
        description: error.message || 'Terjadi kesalahan saat mengimpor data',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      setPendingImportData(null);
      setImportPreview(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Backup & Restore
          </CardTitle>
          <CardDescription>
            Export seluruh pengaturan sistem untuk backup atau import dari file backup sebelumnya
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Perhatian:</strong> Import akan menimpa pengaturan yang ada. Pastikan Anda sudah memiliki backup sebelum melakukan import.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
              className="flex-1"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export Backup
            </Button>

            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                id="import-file"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="w-full"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Import Backup
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Backup mencakup: Pengaturan sistem, rekening bank, katalog produk, dan target penjualan.
          </p>
        </CardContent>
      </Card>

      {/* Import Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Konfirmasi Import
            </DialogTitle>
            <DialogDescription>
              Data berikut akan diimpor dan menimpa pengaturan yang ada:
            </DialogDescription>
          </DialogHeader>

          {importPreview && pendingImportData && (
            <div className="space-y-3 py-4">
              <div className="text-sm text-muted-foreground mb-2">
                Backup dari: {format(new Date(pendingImportData.exportedAt), 'dd MMM yyyy HH:mm')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="font-medium text-sm">{importPreview.settings}</div>
                    <div className="text-xs text-muted-foreground">Pengaturan</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="font-medium text-sm">{importPreview.bankAccounts}</div>
                    <div className="text-xs text-muted-foreground">Rekening Bank</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="font-medium text-sm">{importPreview.products}</div>
                    <div className="text-xs text-muted-foreground">Produk</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="font-medium text-sm">{importPreview.salesTargets}</div>
                    <div className="text-xs text-muted-foreground">Target</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Lanjutkan Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
