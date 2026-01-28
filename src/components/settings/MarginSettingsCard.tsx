import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Percent, Save, Loader2 } from 'lucide-react';

interface MarginSettings {
  default_margin_percentage: number;
  apply_to_mandays: boolean;
  apply_to_products: boolean;
}

interface MarginSettingsCardProps {
  disabled?: boolean;
}

export function MarginSettingsCard({ disabled = false }: MarginSettingsCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<MarginSettings>({
    default_margin_percentage: 20,
    apply_to_mandays: true,
    apply_to_products: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'margin_settings')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        const value = data.value as unknown as MarginSettings;
        setSettings({
          default_margin_percentage: value.default_margin_percentage ?? 20,
          apply_to_mandays: value.apply_to_mandays ?? true,
          apply_to_products: value.apply_to_products ?? true,
        });
      }
    } catch (error: any) {
      console.error('Error fetching margin settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Check if setting exists
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'margin_settings')
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabase
          .from('settings')
          .update({ value: settings as any })
          .eq('key', 'margin_settings');

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('settings')
          .insert({ key: 'margin_settings', value: settings as any });

        if (error) throw error;
      }

      toast({
        title: 'Berhasil',
        description: 'Pengaturan margin berhasil disimpan',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Margin Default Perusahaan
        </CardTitle>
        <CardDescription>
          Persentase margin yang akan auto-apply ke harga dasar saat membuat quotation.
          Margin bisa di-override per quotation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="marginPercentage">Persentase Margin Default (%)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="marginPercentage"
              type="number"
              min={0}
              max={100}
              value={settings.default_margin_percentage}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  default_margin_percentage: parseFloat(e.target.value) || 0,
                })
              }
              disabled={disabled}
              className="w-32"
            />
            <span className="text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Contoh: Jika harga dasar Rp 1.000.000 dan margin 20%, maka harga jual = Rp 1.200.000
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="applyToMandays">Terapkan ke Man-days</Label>
              <p className="text-xs text-muted-foreground">
                Margin otomatis ditambahkan ke item jasa/man-days
              </p>
            </div>
            <Switch
              id="applyToMandays"
              checked={settings.apply_to_mandays}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, apply_to_mandays: checked })
              }
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="applyToProducts">Terapkan ke Produk</Label>
              <p className="text-xs text-muted-foreground">
                Margin otomatis ditambahkan ke item produk dari katalog
              </p>
            </div>
            <Switch
              id="applyToProducts"
              checked={settings.apply_to_products}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, apply_to_products: checked })
              }
              disabled={disabled}
            />
          </div>
        </div>

        {!disabled && (
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Simpan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
