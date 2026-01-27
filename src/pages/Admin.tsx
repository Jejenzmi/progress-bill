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
import { useToast } from '@/hooks/use-toast';
import { Search, UserCog, Shield, Loader2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRoles {
  user_id: string;
  full_name: string | null;
  roles: AppRole[];
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  marketing: 'Marketing',
  finance: 'Finance',
  project_manager: 'Project Manager',
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  marketing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  finance: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  project_manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export default function Admin() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [editingRoles, setEditingRoles] = useState<AppRole[]>([]);
  const [saving, setSaving] = useState(false);

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

      // Combine profiles with their roles
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => ({
        user_id: profile.user_id,
        full_name: profile.full_name,
        roles: (roles || [])
          .filter((r) => r.user_id === profile.user_id)
          .map((r) => r.role),
      }));

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
      // Get current roles
      const currentRoles = selectedUser.roles;
      const newRoles = editingRoles;

      // Roles to add
      const rolesToAdd = newRoles.filter((r) => !currentRoles.includes(r));
      // Roles to remove
      const rolesToRemove = currentRoles.filter((r) => !newRoles.includes(r));

      // Add new roles
      for (const role of rolesToAdd) {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.user_id, role });
        if (error) throw error;
      }

      // Remove roles
      for (const role of rolesToRemove) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUser.user_id)
          .eq('role', role);
        if (error) throw error;
      }

      toast({
        title: 'Berhasil',
        description: `Role untuk ${selectedUser.full_name || 'User'} telah diperbarui`,
      });

      // Refresh users list
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
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Daftar Pengguna
          </CardTitle>
          <CardDescription>
            Kelola role pengguna untuk mengatur hak akses fitur
          </CardDescription>
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
                  <TableHead className="w-[100px]">Aksi</TableHead>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRoles(user)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Tidak ada pengguna ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
    </AppLayout>
  );
}
