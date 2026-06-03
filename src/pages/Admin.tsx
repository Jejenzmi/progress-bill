import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Search, UserCog, Shield, Loader2, Plus, PenTool, Mail, Lock, User } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRoles {
  user_id: string;
  full_name: string | null;
  email?: string;
  roles: AppRole[];
  tte_settings?: {
    id: string;
    signer_name: string;
    signer_position: string;
    is_active: boolean;
  } | null;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  marketing: 'Marketing',
  finance: 'Finance',
  project_manager: 'Project Manager',
  bdo: 'BDO',
  coo: 'COO',
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  marketing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  finance: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  project_manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  bdo: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  coo: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
};

export default function Admin() {
  const { hasRole, profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit roles dialog
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [editingRoles, setEditingRoles] = useState<AppRole[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Add user dialog
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRoles, setNewUserRoles] = useState<AppRole[]>(['marketing']);
  const [newUserTTE, setNewUserTTE] = useState({
    enabled: false,
    signer_name: '',
    signer_position: '',
  });
  const [creating, setCreating] = useState(false);
  
  // TTE settings dialog
  const [showTTEDialog, setShowTTEDialog] = useState(false);
  const [tteUser, setTTEUser] = useState<UserWithRoles | null>(null);
  const [tteSettings, setTTESettings] = useState({
    signer_name: '',
    signer_position: '',
    is_active: true,
  });
  const [savingTTE, setSavingTTE] = useState(false);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch all TTE settings
      const { data: tteData, error: tteError } = await supabase
        .from('user_tte_settings')
        .select('*');

      if (tteError) {
        console.error('Error fetching TTE settings:', tteError);
      }

      // Combine profiles with their roles and TTE settings
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => {
        const userTTE = tteData?.find((t) => t.user_id === profile.user_id);
        return {
          user_id: profile.user_id,
          full_name: profile.full_name,
          roles: (roles || [])
            .filter((r) => r.user_id === profile.user_id)
            .map((r) => r.role),
          tte_settings: userTTE ? {
            id: userTTE.id,
            signer_name: userTTE.signer_name,
            signer_position: userTTE.signer_position,
            is_active: userTTE.is_active ?? true,
          } : null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat daftar pengguna',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditRoles = (user: UserWithRoles) => {
    setSelectedUser(user);
    setEditingRoles([...user.roles]);
  };

  const handleRoleToggle = (role: AppRole) => {
    setEditingRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const currentRoles = selectedUser.roles;
      const newRoles = editingRoles;
      const rolesToAdd = newRoles.filter((r) => !currentRoles.includes(r));
      const rolesToRemove = currentRoles.filter((r) => !newRoles.includes(r));

      for (const role of rolesToAdd) {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.user_id, role });
        if (error) throw error;
      }

      for (const role of rolesToRemove) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUser.user_id)
          .eq('role', role);
        if (error) throw error;
      }

      if (rolesToAdd.length > 0 || rolesToRemove.length > 0) {
        try {
          const userEmail = selectedUser.email || '';
          if (userEmail) {
            await supabase.functions.invoke('send-role-notification', {
              body: {
                user_id: selectedUser.user_id,
                user_email: userEmail,
                user_name: selectedUser.full_name || 'User',
                added_roles: rolesToAdd,
                removed_roles: rolesToRemove,
                changed_by: profile?.full_name || 'Administrator',
              },
            });
          }
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
        }
      }

      toast({
        title: 'Berhasil',
        description: `Role untuk ${selectedUser.full_name || 'User'} telah diperbarui`,
      });

      await fetchUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error('Error saving roles:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan perubahan role',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNewUserRoleToggle = (role: AppRole) => {
    setNewUserRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserName) {
      toast({
        title: 'Error',
        description: 'Semua field wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    if (newUserPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password minimal 6 karakter',
        variant: 'destructive',
      });
      return;
    }

    if (newUserRoles.length === 0) {
      toast({
        title: 'Error',
        description: 'Pilih minimal satu role',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          full_name: newUserName,
          roles: newUserRoles,
          tte_settings: newUserTTE.enabled ? {
            signer_name: newUserTTE.signer_name || newUserName,
            signer_position: newUserTTE.signer_position || 'Staff',
            is_active: true,
          } : undefined,
        },
      });

      if (error) {
        console.error('Create user error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Gagal membuat pengguna',
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Berhasil',
        description: `Pengguna ${newUserName} berhasil dibuat`,
      });

      // Reset form
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRoles(['marketing']);
      setNewUserTTE({ enabled: false, signer_name: '', signer_position: '' });
      setShowAddUser(false);
      
      await fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: 'Gagal membuat pengguna baru',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEditTTE = (user: UserWithRoles) => {
    setTTEUser(user);
    if (user.tte_settings) {
      setTTESettings({
        signer_name: user.tte_settings.signer_name,
        signer_position: user.tte_settings.signer_position,
        is_active: user.tte_settings.is_active,
      });
    } else {
      setTTESettings({
        signer_name: user.full_name || '',
        signer_position: '',
        is_active: true,
      });
    }
    setShowTTEDialog(true);
  };

  const handleSaveTTE = async () => {
    if (!tteUser) return;

    if (!tteSettings.signer_name || !tteSettings.signer_position) {
      toast({
        title: 'Error',
        description: 'Nama dan jabatan penandatangan wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setSavingTTE(true);
    try {
      if (tteUser.tte_settings) {
        // Update existing
        const { error } = await supabase
          .from('user_tte_settings')
          .update({
            signer_name: tteSettings.signer_name,
            signer_position: tteSettings.signer_position,
            is_active: tteSettings.is_active,
          })
          .eq('id', tteUser.tte_settings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_tte_settings')
          .insert({
            user_id: tteUser.user_id,
            signer_name: tteSettings.signer_name,
            signer_position: tteSettings.signer_position,
            is_active: tteSettings.is_active,
          });

        if (error) throw error;
      }

      toast({
        title: 'Berhasil',
        description: `TTE untuk ${tteUser.full_name || 'User'} telah disimpan`,
      });

      setShowTTEDialog(false);
      setTTEUser(null);
      await fetchUsers();
    } catch (error) {
      console.error('Error saving TTE:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan pengaturan TTE',
        variant: 'destructive',
      });
    } finally {
      setSavingTTE(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    (user.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!hasRole('admin')) {
    return (
      <AppLayout title="Akses Ditolak" subtitle="Anda tidak memiliki akses ke halaman ini">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Halaman ini hanya dapat diakses oleh Admin.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Kelola Pengguna" subtitle="Atur role dan akses pengguna sistem">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Daftar Pengguna
              </CardTitle>
              <CardDescription>
                Kelola role dan TTE pengguna untuk mengatur hak akses fitur
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddUser(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pengguna
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari pengguna..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>TTE</TableHead>
                  <TableHead className="w-[150px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">
                      {user.full_name || 'Belum diatur'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Badge key={role} className={ROLE_COLORS[role]} variant="secondary">
                              {ROLE_LABELS[role]}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">Tidak ada role</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.tte_settings ? (
                        <div className="flex items-center gap-2">
                          <Badge variant={user.tte_settings.is_active ? 'default' : 'secondary'}>
                            {user.tte_settings.is_active ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Belum diatur</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRoles(user)}
                        >
                          Edit Role
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTTE(user)}
                        >
                          <PenTool className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Tidak ada pengguna ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            <DialogDescription>
              Buat akun pengguna baru dengan role dan TTE
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nama Lengkap</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-name"
                  placeholder="Nama lengkap pengguna"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-email"
                  type="email"
                  placeholder="email@perusahaan.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`new-${role}`}
                      checked={newUserRoles.includes(role)}
                      onCheckedChange={() => handleNewUserRoleToggle(role)}
                    />
                    <Label htmlFor={`new-${role}`} className="text-sm cursor-pointer">
                      {ROLE_LABELS[role]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label className="text-base">Aktifkan TTE</Label>
                  <p className="text-sm text-muted-foreground">
                    Tanda Tangan Elektronik untuk dokumen
                  </p>
                </div>
                <Switch
                  checked={newUserTTE.enabled}
                  onCheckedChange={(checked) => setNewUserTTE({ ...newUserTTE, enabled: checked })}
                />
              </div>

              {newUserTTE.enabled && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="tte-name">Nama Penandatangan</Label>
                    <Input
                      id="tte-name"
                      placeholder="Nama yang tampil di TTE"
                      value={newUserTTE.signer_name}
                      onChange={(e) => setNewUserTTE({ ...newUserTTE, signer_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tte-position">Jabatan</Label>
                    <Input
                      id="tte-position"
                      placeholder="Contoh: Direktur, Manager"
                      value={newUserTTE.signer_position}
                      onChange={(e) => setNewUserTTE({ ...newUserTTE, signer_position: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateUser} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Buat Pengguna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Roles Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role Pengguna</DialogTitle>
            <DialogDescription>
              Atur role untuk {selectedUser?.full_name || 'User'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
              <div key={role} className="flex items-center space-x-3">
                <Checkbox
                  id={role}
                  checked={editingRoles.includes(role)}
                  onCheckedChange={() => handleRoleToggle(role)}
                />
                <Label htmlFor={role} className="flex-1 cursor-pointer">
                  <span className="font-medium">{ROLE_LABELS[role]}</span>
                  <span className="block text-sm text-muted-foreground">
                    {role === 'admin' && 'Akses penuh ke semua fitur'}
                    {role === 'marketing' && 'Kelola klien, proyek, dan pipeline'}
                    {role === 'finance' && 'Kelola invoice, cashflow, dan pembayaran'}
                    {role === 'project_manager' && 'Kelola milestone dan dokumen proyek'}
                  </span>
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Batal
            </Button>
            <Button onClick={handleSaveRoles} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TTE Settings Dialog */}
      <Dialog open={showTTEDialog} onOpenChange={setShowTTEDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Pengaturan TTE
            </DialogTitle>
            <DialogDescription>
              Konfigurasi Tanda Tangan Elektronik untuk {tteUser?.full_name || 'User'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-signer-name">Nama Penandatangan</Label>
              <Input
                id="edit-signer-name"
                placeholder="Nama yang akan tampil di dokumen"
                value={tteSettings.signer_name}
                onChange={(e) => setTTESettings({ ...tteSettings, signer_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-signer-position">Jabatan</Label>
              <Input
                id="edit-signer-position"
                placeholder="Contoh: Direktur Utama, Manager Marketing"
                value={tteSettings.signer_position}
                onChange={(e) => setTTESettings({ ...tteSettings, signer_position: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <Label htmlFor="tte-active">Status TTE</Label>
                <p className="text-sm text-muted-foreground">
                  Aktifkan untuk menampilkan TTE di dokumen
                </p>
              </div>
              <Switch
                id="tte-active"
                checked={tteSettings.is_active}
                onCheckedChange={(checked) => setTTESettings({ ...tteSettings, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTTEDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveTTE} disabled={savingTTE}>
              {savingTTE && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan TTE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
