import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  base_price: number;
  unit: string;
  category: string | null;
  is_active: boolean;
}

interface ProductFormData {
  name: string;
  sku: string;
  description: string;
  base_price: number;
  unit: string;
  category: string;
  is_active: boolean;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const UNIT_OPTIONS = ['Unit', 'Pcs', 'Set', 'Paket', 'Box', 'License', 'Bulan', 'Tahun'];
const CATEGORY_OPTIONS = ['Hardware', 'Software', 'Lisensi', 'Jasa', 'Lainnya'];

export function ProductCatalogManager() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    description: '',
    base_price: 0,
    unit: 'Unit',
    category: '',
    is_active: true,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat katalog produk',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        sku: product.sku || '',
        description: product.description || '',
        base_price: product.base_price,
        unit: product.unit,
        category: product.category || '',
        is_active: product.is_active,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        sku: '',
        description: '',
        base_price: 0,
        unit: 'Unit',
        category: '',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    // Enhanced validation with specific error messages
    const errors: string[] = [];
    
    if (!formData.name.trim()) {
      errors.push('Nama produk harus diisi');
    } else if (formData.name.length < 3) {
      errors.push('Nama produk minimal 3 karakter');
    }
    
    if (formData.base_price <= 0) {
      errors.push('Harga dasar harus lebih dari 0');
    } else if (formData.base_price > 100000000000) {
      errors.push('Harga dasar terlalu besar (maksimal 100 miliar)');
    }
    
    if (formData.sku && !/^[A-Za-z0-9-_]+$/.test(formData.sku)) {
      errors.push('SKU hanya boleh berisi huruf, angka, tanda hubung, dan underscore');
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
      const payload = {
        name: formData.name,
        sku: formData.sku || null,
        description: formData.description || null,
        base_price: formData.base_price,
        unit: formData.unit,
        category: formData.category || null,
        is_active: formData.is_active,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({
          title: 'Berhasil',
          description: 'Produk berhasil diperbarui',
        });
      } else {
        const { error } = await supabase
          .from('products')
          .insert(payload);

        if (error) throw error;
        toast({
          title: 'Berhasil',
          description: 'Produk berhasil ditambahkan',
        });
      }

      setDialogOpen(false);
      fetchProducts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Produk berhasil dihapus',
      });

      setDeleteDialogOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
                <Package className="h-5 w-5" />
                Katalog Produk
              </CardTitle>
              <CardDescription>
                Master data produk dengan harga tetap yang bisa dipilih saat membuat quotation
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Produk
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? 'Tidak ada produk yang sesuai dengan pencarian'
                : 'Belum ada produk. Klik "Tambah Produk" untuk menambahkan.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Harga Dasar</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs">
                      {product.sku || '-'}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      {product.category ? (
                        <Badge variant="outline">{product.category}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(product.base_price)}
                    </TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? 'default' : 'secondary'}>
                        {product.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            setProductToDelete(product);
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Produk' : 'Tambah Produk'}
            </DialogTitle>
            <DialogDescription>
              Masukkan informasi produk untuk katalog
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name">Nama Produk *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Laptop ASUS VivoBook"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Kode</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Contoh: LPT-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="base_price">Harga Dasar *</Label>
                <Input
                  id="base_price"
                  type="number"
                  value={formData.base_price}
                  onChange={(e) =>
                    setFormData({ ...formData, base_price: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Satuan</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih satuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi singkat produk"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Status Aktif</Label>
                <p className="text-xs text-muted-foreground">
                  Produk tidak aktif tidak akan tampil di pilihan quotation
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
              {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        type="delete"
        title="Hapus Produk"
        description={`Apakah Anda yakin ingin menghapus produk "${productToDelete?.name}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={handleDelete}
      />
    </>
  );
}
