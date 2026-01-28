import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Package, Loader2, Percent } from 'lucide-react';

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

interface MarginSettings {
  default_margin_percentage: number;
  apply_to_mandays: boolean;
  apply_to_products: boolean;
}

interface SelectedProduct extends Product {
  quantity: number;
  finalPrice: number; // Price after margin
}

interface ProductSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductsSelected: (products: Array<{
    item: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>, marginPercentage: number) => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function ProductSelectorDialog({
  open,
  onOpenChange,
  onProductsSelected,
}: ProductSelectorDialogProps) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Map<string, SelectedProduct>>(new Map());
  const [marginSettings, setMarginSettings] = useState<MarginSettings>({
    default_margin_percentage: 20,
    apply_to_mandays: true,
    apply_to_products: true,
  });
  const [marginOverride, setMarginOverride] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      fetchProducts();
      fetchMarginSettings();
      setSelectedProducts(new Map());
      setMarginOverride(null);
    }
  }, [open]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
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

  const fetchMarginSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'margin_settings')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        const value = data.value as unknown as MarginSettings;
        setMarginSettings({
          default_margin_percentage: value.default_margin_percentage ?? 20,
          apply_to_mandays: value.apply_to_mandays ?? true,
          apply_to_products: value.apply_to_products ?? true,
        });
      }
    } catch (error: any) {
      console.error('Error fetching margin settings:', error);
    }
  };

  const effectiveMargin = marginOverride !== null ? marginOverride : marginSettings.default_margin_percentage;
  const shouldApplyMargin = marginSettings.apply_to_products;

  const calculateFinalPrice = (basePrice: number) => {
    if (!shouldApplyMargin) return basePrice;
    return Math.round(basePrice * (1 + effectiveMargin / 100));
  };

  const handleToggleProduct = (product: Product) => {
    const newSelected = new Map(selectedProducts);
    
    if (newSelected.has(product.id)) {
      newSelected.delete(product.id);
    } else {
      newSelected.set(product.id, {
        ...product,
        quantity: 1,
        finalPrice: calculateFinalPrice(product.base_price),
      });
    }
    
    setSelectedProducts(newSelected);
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    const newSelected = new Map(selectedProducts);
    const product = newSelected.get(productId);
    if (product) {
      newSelected.set(productId, {
        ...product,
        quantity: Math.max(1, quantity),
      });
    }
    setSelectedProducts(newSelected);
  };

  const handleMarginOverrideChange = (value: number | null) => {
    setMarginOverride(value);
    // Recalculate all selected product prices
    const newSelected = new Map(selectedProducts);
    newSelected.forEach((product, id) => {
      const newMargin = value !== null ? value : marginSettings.default_margin_percentage;
      const newFinalPrice = shouldApplyMargin 
        ? Math.round(product.base_price * (1 + newMargin / 100))
        : product.base_price;
      newSelected.set(id, { ...product, finalPrice: newFinalPrice });
    });
    setSelectedProducts(newSelected);
  };

  const handleConfirm = () => {
    const items = Array.from(selectedProducts.values()).map((p) => ({
      item: p.name,
      quantity: p.quantity,
      unit: p.unit,
      unitPrice: p.finalPrice,
      total: p.quantity * p.finalPrice,
    }));

    onProductsSelected(items, effectiveMargin);
    onOpenChange(false);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalSelectedValue = Array.from(selectedProducts.values()).reduce(
    (sum, p) => sum + p.quantity * p.finalPrice,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pilih Produk dari Katalog
          </DialogTitle>
          <DialogDescription>
            Pilih produk yang ingin ditambahkan ke quotation. Harga akan otomatis ditambahkan margin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          {/* Margin Override */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Margin Default: {marginSettings.default_margin_percentage}%</span>
            <div className="flex items-center gap-2 ml-auto">
              <Label htmlFor="marginOverride" className="text-sm">Override Margin:</Label>
              <Input
                id="marginOverride"
                type="number"
                min={0}
                max={100}
                value={marginOverride ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  handleMarginOverrideChange(val === '' ? null : parseFloat(val));
                }}
                placeholder={`${marginSettings.default_margin_percentage}`}
                className="w-20 h-8"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk berdasarkan nama, SKU, atau kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Product List */}
          <div className="flex-1 overflow-auto border rounded-lg">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery
                  ? 'Tidak ada produk yang sesuai dengan pencarian'
                  : 'Belum ada produk di katalog. Tambahkan produk di halaman Settings.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Harga Dasar</TableHead>
                    <TableHead>Harga + Margin</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProducts.has(product.id);
                    const selectedData = selectedProducts.get(product.id);
                    const finalPrice = calculateFinalPrice(product.base_price);

                    return (
                      <TableRow
                        key={product.id}
                        className={isSelected ? 'bg-primary/5' : undefined}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleProduct(product)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.sku && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {product.sku}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.category ? (
                            <Badge variant="outline">{product.category}</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatCurrency(product.base_price)}
                        </TableCell>
                        <TableCell className="font-medium text-primary">
                          {formatCurrency(finalPrice)}
                          {shouldApplyMargin && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (+{effectiveMargin}%)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{product.unit}</TableCell>
                        <TableCell>
                          {isSelected && (
                            <Input
                              type="number"
                              min={1}
                              value={selectedData?.quantity || 1}
                              onChange={(e) =>
                                handleQuantityChange(product.id, parseInt(e.target.value) || 1)
                              }
                              className="w-20 h-8"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Summary */}
          {selectedProducts.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <span className="font-medium">
                {selectedProducts.size} produk dipilih
              </span>
              <span className="font-bold text-primary">
                Total: {formatCurrency(totalSelectedValue)}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedProducts.size === 0}
          >
            <Package className="h-4 w-4 mr-2" />
            Tambahkan {selectedProducts.size} Produk
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
