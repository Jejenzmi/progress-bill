import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CreditCard, Plus, Pencil, Trash2, Loader2, Star } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
  is_active: boolean;
}

interface BankAccountFormData {
  bank_name: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
  is_active: boolean;
}

export function BankAccountManager() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState<BankAccountFormData>({
    bank_name: '',
    account_number: '',
    account_name: '',
    is_default: false,
    is_active: true,
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('is_default', { ascending: false })
        .order('bank_name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error('Error fetching bank accounts:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat daftar rekening bank',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (account?: BankAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        bank_name: account.bank_name,
        account_number: account.account_number,
        account_name: account.account_name,
        is_default: account.is_default,
        is_active: account.is_active,
      });
    } else {
      setEditingAccount(null);
      setFormData({
        bank_name: '',
        account_number: '',
        account_name: '',
        is_default: false,
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    // Enhanced validation with specific error messages
    const errors: string[] = [];
    
    if (!formData.bank_name.trim()) {
      errors.push('Nama bank harus diisi');
    }
    
    if (!formData.account_number.trim()) {
      errors.push('Nomor rekening harus diisi');
    } else if (!/^[0-9-]+$/.test(formData.account_number)) {
      errors.push('Nomor rekening hanya boleh berisi angka dan tanda hubung');
    } else if (formData.account_number.replace(/-/g, '').length < 8) {
      errors.push('Nomor rekening minimal 8 digit');
    }
    
    if (!formData.account_name.trim()) {
      errors.push('Nama pemilik rekening harus diisi');
    }
    
    if (errors.length > 0) {
      toast({
        title: 'Validasi Gagal',
        description: errors.join('. '),
        variant: 'destructive',
      });
      return;
    }

    try {
      // If setting as default, unset other defaults first
      if (formData.is_default) {
        await supabase
          .from('bank_accounts')
          .update({ is_default: false })
          .neq('id', editingAccount?.id || '');
      }

      if (editingAccount) {
        const { error } = await supabase
          .from('bank_accounts')
          .update(formData)
          .eq('id', editingAccount.id);

        if (error) throw error;
        toast({
          title: 'Berhasil',
          description: 'Rekening bank berhasil diperbarui',
        });
      } else {
        const { error } = await supabase
          .from('bank_accounts')
          .insert(formData);

        if (error) throw error;
        toast({
          title: 'Berhasil',
          description: 'Rekening bank berhasil ditambahkan',
        });
      }

      setDialogOpen(false);
      fetchAccounts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;

    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', accountToDelete.id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Rekening bank berhasil dihapus',
      });

      setDeleteDialogOpen(false);
      setAccountToDelete(null);
      fetchAccounts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (account: BankAccount) => {
    try {
      // Unset all defaults
      await supabase
        .from('bank_accounts')
        .update({ is_default: false })
        .neq('id', account.id);

      // Set new default
      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_default: true })
        .eq('id', account.id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: `${account.bank_name} dijadikan rekening default`,
      });

      fetchAccounts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Daftar Rekening Bank
              </CardTitle>
              <CardDescription>
                Kelola rekening bank yang dapat dipilih saat membuat invoice
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Rekening
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada rekening bank. Klik "Tambah Rekening" untuk menambahkan.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank</TableHead>
                  <TableHead>Nomor Rekening</TableHead>
                  <TableHead>Atas Nama</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {account.bank_name}
                        {account.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Default
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{account.account_number}</TableCell>
                    <TableCell>{account.account_name}</TableCell>
                    <TableCell>
                      <Badge variant={account.is_active ? 'default' : 'secondary'}>
                        {account.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {!account.is_default && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSetDefault(account)}
                            title="Jadikan Default"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(account)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            setAccountToDelete(account);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Edit Rekening Bank' : 'Tambah Rekening Bank'}
            </DialogTitle>
            <DialogDescription>
              Masukkan informasi rekening bank yang akan digunakan di invoice
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Nama Bank</Label>
              <Input
                id="bank_name"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Contoh: Bank BCA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Nomor Rekening</Label>
              <Input
                id="account_number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="Contoh: 1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_name">Atas Nama</Label>
              <Input
                id="account_name"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                placeholder="Contoh: PT Zen Multimedia Indonesia"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="is_default">Rekening Default</Label>
                <p className="text-xs text-muted-foreground">
                  Pilih otomatis saat membuat invoice baru
                </p>
              </div>
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Status Aktif</Label>
                <p className="text-xs text-muted-foreground">
                  Rekening tidak aktif tidak akan tampil di pilihan
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave}>
              {editingAccount ? 'Simpan Perubahan' : 'Tambah Rekening'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        type="delete"
        title="Hapus Rekening Bank"
        description={`Apakah Anda yakin ingin menghapus rekening ${accountToDelete?.bank_name} - ${accountToDelete?.account_number}?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={handleDelete}
      />
    </>
  );
}
