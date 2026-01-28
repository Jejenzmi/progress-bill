import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Building2, Save, Target, TrendingUp, Loader2, CreditCard, FileText, QrCode, Package, Percent } from 'lucide-react';
import { LogoUpload } from '@/components/settings/LogoUpload';
import { SalesTargetManager } from '@/components/settings/SalesTargetManager';
import { BankAccountManager } from '@/components/settings/BankAccountManager';
import { PaymentTermTemplateManager } from '@/components/settings/PaymentTermTemplateManager';
import { ProductCatalogManager } from '@/components/settings/ProductCatalogManager';
import { MarginSettingsCard } from '@/components/settings/MarginSettingsCard';

interface SettingsData {
  company_profile: {
    name: string;
    npwp: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    bank_info: string;
    logo_url: string;
  };
  invoice_settings: {
    prefix: string;
    default_top_days: number;
  };
  quotation_settings: {
    prefix: string;
  };
  tte_settings: {
    signer_name: string;
    signer_position: string;
    enabled: boolean;
  };
  rate_card: Record<string, number>;
  targets: {
    monthly_target_2026: number;
    yearly_target_2026: number;
  };
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function Settings() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    company_profile: {
      name: 'PT Zen Multimedia Indonesia',
      npwp: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      bank_info: '',
      logo_url: '',
    },
    invoice_settings: {
      prefix: 'INV/ZEN',
      default_top_days: 14,
    },
    quotation_settings: {
      prefix: 'QUO-ZMI',
    },
    tte_settings: {
      signer_name: '',
      signer_position: 'Direktur',
      enabled: true,
    },
    rate_card: {},
    targets: {
      monthly_target_2026: 500000000,
      yearly_target_2026: 6000000000,
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value');

      if (error) throw error;

      if (data) {
        const newSettings = { ...settings };
        data.forEach((item) => {
          if (item.key === 'company_profile') {
            newSettings.company_profile = item.value as any;
          } else if (item.key === 'invoice_settings') {
            newSettings.invoice_settings = item.value as any;
          } else if (item.key === 'quotation_settings') {
            newSettings.quotation_settings = item.value as any;
          } else if (item.key === 'tte_settings') {
            newSettings.tte_settings = item.value as any;
          } else if (item.key === 'rate_card') {
            newSettings.rate_card = item.value as any;
          } else if (item.key === 'targets') {
            newSettings.targets = item.value as any;
          }
        });
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Update each setting
      const updates = [
        { key: 'company_profile', value: settings.company_profile },
        { key: 'invoice_settings', value: settings.invoice_settings },
        { key: 'quotation_settings', value: settings.quotation_settings },
        { key: 'tte_settings', value: settings.tte_settings },
        { key: 'rate_card', value: settings.rate_card },
        { key: 'targets', value: settings.targets },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .update({ value: update.value })
          .eq('key', update.key);

        if (error) throw error;
      }

      toast({
        title: 'Berhasil',
        description: 'Pengaturan berhasil disimpan',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan pengaturan',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateCompanyProfile = (field: string, value: string) => {
    setSettings({
      ...settings,
      company_profile: {
        ...settings.company_profile,
        [field]: value,
      },
    });
  };

  const updateInvoiceSettings = (field: string, value: string | number) => {
    setSettings({
      ...settings,
      invoice_settings: {
        ...settings.invoice_settings,
        [field]: value,
      },
    });
  };

  const updateQuotationSettings = (field: string, value: string) => {
    setSettings({
      ...settings,
      quotation_settings: {
        ...settings.quotation_settings,
        [field]: value,
      },
    });
  };

  const updateRateCard = (role: string, value: number) => {
    setSettings({
      ...settings,
      rate_card: {
        ...settings.rate_card,
        [role]: value,
      },
    });
  };

  const updateTargets = (field: string, value: number) => {
    setSettings({
      ...settings,
      targets: {
        ...settings.targets,
        [field]: value,
      },
    });
  };

  const updateTTESettings = (field: string, value: string | boolean) => {
    setSettings({
      ...settings,
      tte_settings: {
        ...settings.tte_settings,
        [field]: value,
      },
    });
  };

  if (loading) {
    return (
      <AppLayout title="Pengaturan" subtitle="Memuat...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const isAdmin = hasRole('admin');

  return (
    <AppLayout title="Pengaturan" subtitle="Konfigurasi aplikasi dan profil perusahaan">
      <div className="max-w-3xl space-y-6">
        {/* Company Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Profil Perusahaan
            </CardTitle>
            <CardDescription>
              Informasi perusahaan yang akan tampil di dokumen dan invoice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nama Perusahaan</Label>
              <Input
                id="companyName"
                value={settings.company_profile.name}
                onChange={(e) => updateCompanyProfile('name', e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="npwp">NPWP</Label>
                <Input
                  id="npwp"
                  value={settings.company_profile.npwp}
                  onChange={(e) => updateCompanyProfile('npwp', e.target.value)}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input
                  id="phone"
                  value={settings.company_profile.phone}
                  onChange={(e) => updateCompanyProfile('phone', e.target.value)}
                  disabled={!isAdmin}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Input
                id="address"
                value={settings.company_profile.address}
                onChange={(e) => updateCompanyProfile('address', e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.company_profile.email}
                  onChange={(e) => updateCompanyProfile('email', e.target.value)}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={settings.company_profile.website}
                  onChange={(e) => updateCompanyProfile('website', e.target.value)}
                  disabled={!isAdmin}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankInfo">Informasi Rekening Bank</Label>
              <Textarea
                id="bankInfo"
                value={settings.company_profile.bank_info}
                onChange={(e) => updateCompanyProfile('bank_info', e.target.value)}
                disabled={!isAdmin}
                rows={3}
                placeholder="Bank BCA&#10;No. Rekening: 123-456-7890&#10;A.n. PT Zen Multimedia Indonesia"
              />
              <p className="text-xs text-muted-foreground">
                Info ini akan muncul di PDF Invoice sebagai informasi pembayaran
              </p>
            </div>

            <Separator className="my-4" />

            {/* Logo Upload */}
            <LogoUpload
              currentLogoUrl={settings.company_profile.logo_url}
              onLogoChange={(url) => updateCompanyProfile('logo_url', url)}
              disabled={!isAdmin}
            />
          </CardContent>
        </Card>

        {/* TTE Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Pengaturan TTE (Tanda Tangan Elektronik)
            </CardTitle>
            <CardDescription>
              Konfigurasi nama dan jabatan penandatangan yang tampil di QR Code dokumen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="tteEnabled"
                checked={settings.tte_settings.enabled}
                onChange={(e) => updateTTESettings('enabled', e.target.checked)}
                disabled={!isAdmin}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="tteEnabled">Aktifkan TTE dengan QR Code di dokumen PDF</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signerName">Nama Penandatangan</Label>
                <Input
                  id="signerName"
                  value={settings.tte_settings.signer_name}
                  onChange={(e) => updateTTESettings('signer_name', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Nama lengkap penandatangan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signerPosition">Jabatan</Label>
                <Input
                  id="signerPosition"
                  value={settings.tte_settings.signer_position}
                  onChange={(e) => updateTTESettings('signer_position', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Direktur"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Informasi ini akan tampil di bagian TTE pada PDF Invoice dan Quotation
            </p>
          </CardContent>
        </Card>

        {/* Bank Accounts */}
        {isAdmin && (
          <BankAccountManager />
        )}

        {/* Margin Settings */}
        {isAdmin && (
          <MarginSettingsCard disabled={!isAdmin} />
        )}

        {/* Product Catalog */}
        {isAdmin && (
          <ProductCatalogManager />
        )}

        {/* Sales Targets */}
        {isAdmin && (
          <SalesTargetManager />
        )}

        {/* Payment Term Templates */}
        {isAdmin && (
          <PaymentTermTemplateManager disabled={!isAdmin} />
        )}

        {/* Legacy Targets (for backwards compatibility) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Target Default 2026
            </CardTitle>
            <CardDescription>
              Target default untuk dashboard (gunakan Sales Target Manager untuk target lebih detail)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyTarget">Target Bulanan</Label>
                <Input
                  id="monthlyTarget"
                  type="number"
                  value={settings.targets.monthly_target_2026}
                  onChange={(e) => updateTargets('monthly_target_2026', parseInt(e.target.value) || 0)}
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(settings.targets.monthly_target_2026)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearlyTarget">Target Tahunan</Label>
                <Input
                  id="yearlyTarget"
                  type="number"
                  value={settings.targets.yearly_target_2026}
                  onChange={(e) => updateTargets('yearly_target_2026', parseInt(e.target.value) || 0)}
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(settings.targets.yearly_target_2026)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rate Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Rate Card Default
            </CardTitle>
            <CardDescription>
              Tarif standar per hari untuk setiap role (digunakan di Quotation Builder)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(settings.rate_card).map(([role, rate]) => (
                <div key={role} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium text-sm">{role}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-32 text-right"
                      type="number"
                      value={rate}
                      onChange={(e) => updateRateCard(role, parseInt(e.target.value) || 0)}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quotation Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Quotation</CardTitle>
            <CardDescription>
              Konfigurasi format nomor surat penawaran
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quotationPrefix">Prefix Nomor Quotation</Label>
              <Input
                id="quotationPrefix"
                value={settings.quotation_settings?.prefix || 'QUO-ZMI'}
                onChange={(e) => updateQuotationSettings('prefix', e.target.value)}
                disabled={!isAdmin}
                placeholder="Contoh: QUO-ZMI"
              />
              <p className="text-xs text-muted-foreground">
                Format: [Nomor Urut]/{'{prefix}'}/[Bulan]/[Tahun] → Contoh: 123/{settings.quotation_settings?.prefix || 'QUO-ZMI'}/JAN/2026
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Invoice</CardTitle>
            <CardDescription>
              Konfigurasi format dan default terms of payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoicePrefix">Prefix Nomor Invoice</Label>
                <Input
                  id="invoicePrefix"
                  value={settings.invoice_settings.prefix}
                  onChange={(e) => updateInvoiceSettings('prefix', e.target.value)}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultTop">Default Terms of Payment (hari)</Label>
                <Input
                  id="defaultTop"
                  type="number"
                  value={settings.invoice_settings.default_top_days}
                  onChange={(e) => updateInvoiceSettings('default_top_days', parseInt(e.target.value) || 14)}
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={fetchSettings}>
              Batal
            </Button>
            <Button onClick={saveSettings} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Simpan Perubahan
            </Button>
          </div>
        )}

        {!isAdmin && (
          <p className="text-sm text-muted-foreground text-center">
            Hanya Admin yang dapat mengubah pengaturan
          </p>
        )}
      </div>
    </AppLayout>
  );
}
