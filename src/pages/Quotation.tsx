import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateQuotationHTML, openPrintWindow } from '@/lib/pdfGenerator';
import { Plus, Trash2, Calculator, FileText, Download, Save, Loader2 } from 'lucide-react';

interface ManDaysEstimate {
  role: string;
  ratePerDay: number;
  days: number;
  total: number;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const defaultRoles = [
  { role: 'Project Manager', rate: 1500000 },
  { role: 'Business Analyst', rate: 1200000 },
  { role: 'UI/UX Designer', rate: 1000000 },
  { role: 'Backend Developer', rate: 1200000 },
  { role: 'Frontend Developer', rate: 1000000 },
  { role: 'QA Engineer', rate: 800000 },
  { role: 'DevOps Engineer', rate: 1300000 },
];

export default function Quotation() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [manDays, setManDays] = useState<ManDaysEstimate[]>([
    { role: 'Project Manager', ratePerDay: 1500000, days: 20, total: 30000000 },
    { role: 'Backend Developer', ratePerDay: 1200000, days: 40, total: 48000000 },
    { role: 'Frontend Developer', ratePerDay: 1000000, days: 30, total: 30000000 },
  ]);
  const [hostingCost, setHostingCost] = useState(5000000);
  const [maintenanceCost, setMaintenanceCost] = useState(3000000);
  const [maintenancePeriod, setMaintenancePeriod] = useState<'Bulanan' | 'Tahunan'>('Tahunan');

  const addManDay = () => {
    setManDays([
      ...manDays,
      { role: '', ratePerDay: 1000000, days: 1, total: 1000000 },
    ]);
  };

  const removeManDay = (index: number) => {
    setManDays(manDays.filter((_, i) => i !== index));
  };

  const updateManDay = (index: number, field: keyof ManDaysEstimate, value: string | number) => {
    const updated = [...manDays];
    if (field === 'role') {
      const preset = defaultRoles.find((r) => r.role === value);
      updated[index] = {
        ...updated[index],
        role: value as string,
        ratePerDay: preset?.rate || updated[index].ratePerDay,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    updated[index].total = updated[index].ratePerDay * updated[index].days;
    setManDays(updated);
  };

  const totalDevelopment = manDays.reduce((sum, m) => sum + m.total, 0);
  const grandTotal = totalDevelopment + hostingCost + maintenanceCost;

  const handleSave = async () => {
    if (!projectName) {
      toast({
        title: 'Error',
        description: 'Nama proyek wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      const { error } = await supabase.from('quotations').insert([{
        project_name: projectName,
        man_days: manDays as any,
        hosting_cost: hostingCost,
        maintenance_cost: maintenanceCost,
        maintenance_period: maintenancePeriod,
        total_development: totalDevelopment,
        grand_total: grandTotal,
        valid_until: validUntil.toISOString().split('T')[0],
        status: 'Draft',
      }]);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Quotation berhasil disimpan',
      });
    } catch (error: any) {
      console.error('Error saving quotation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan quotation',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!projectName) {
      toast({
        title: 'Error',
        description: 'Nama proyek wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    // Fetch company profile
    const { data: companyData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'company_profile')
      .maybeSingle();

    const company = companyData?.value as any || {
      name: 'PT Zen Multimedia Indonesia',
      npwp: '-',
      address: '-',
      phone: '-',
      email: '-',
      website: '-',
      bank_info: '-',
    };

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const quotationData = {
      projectName,
      clientName: clientName || 'Klien',
      manDays,
      hostingCost,
      maintenanceCost,
      maintenancePeriod,
      totalDevelopment,
      grandTotal,
      validUntil,
    };

    const html = generateQuotationHTML(quotationData, company);
    openPrintWindow(html);
  };

  return (
    <AppLayout title="Quotation Builder" subtitle="Buat penawaran harga proyek dengan Man-days Calculator">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Proyek</CardTitle>
              <CardDescription>Detail dasar penawaran</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Nama Proyek *</Label>
                  <Input
                    id="projectName"
                    placeholder="Contoh: Dashboard Eksekutif"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nama Klien</Label>
                  <Input
                    id="clientName"
                    placeholder="Contoh: Diskominfo Takalar"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Man-days Calculator */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Man-days Calculator
                  </CardTitle>
                  <CardDescription>Hitung estimasi biaya berdasarkan role dan durasi</CardDescription>
                </div>
                <Button onClick={addManDay} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Role
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-3 text-sm font-medium text-muted-foreground px-2">
                  <div className="col-span-4">Role</div>
                  <div className="col-span-3">Rate/Hari</div>
                  <div className="col-span-2">Hari</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Rows */}
                {manDays.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-4">
                      <Select
                        value={item.role}
                        onValueChange={(value) => updateManDay(index, 'role', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih role" />
                        </SelectTrigger>
                        <SelectContent>
                          {defaultRoles.map((role) => (
                            <SelectItem key={role.role} value={role.role}>
                              {role.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        value={item.ratePerDay}
                        onChange={(e) =>
                          updateManDay(index, 'ratePerDay', parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={item.days}
                        onChange={(e) =>
                          updateManDay(index, 'days', parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="col-span-2 text-right font-semibold">
                      {formatCurrency(item.total)}
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeManDay(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Subtotal */}
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center px-2">
                    <span className="font-medium">Subtotal Development</span>
                    <span className="text-lg font-bold">{formatCurrency(totalDevelopment)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Costs */}
          <Card>
            <CardHeader>
              <CardTitle>Biaya Tambahan</CardTitle>
              <CardDescription>Hosting & Maintenance (berulang)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hosting">Biaya Hosting (Tahunan)</Label>
                  <Input
                    id="hosting"
                    type="number"
                    value={hostingCost}
                    onChange={(e) => setHostingCost(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance">Biaya Maintenance</Label>
                  <div className="flex gap-2">
                    <Input
                      id="maintenance"
                      type="number"
                      value={maintenanceCost}
                      onChange={(e) => setMaintenanceCost(parseInt(e.target.value) || 0)}
                    />
                    <Select
                      value={maintenancePeriod}
                      onValueChange={(value) => setMaintenancePeriod(value as 'Bulanan' | 'Tahunan')}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bulanan">Bulanan</SelectItem>
                        <SelectItem value="Tahunan">Tahunan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Section */}
        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ringkasan Penawaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {projectName && (
                <div>
                  <p className="text-sm text-muted-foreground">Proyek</p>
                  <p className="font-medium">{projectName}</p>
                </div>
              )}
              {clientName && (
                <div>
                  <p className="text-sm text-muted-foreground">Klien</p>
                  <p className="font-medium">{clientName}</p>
                </div>
              )}

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Development ({manDays.length} roles)</span>
                  <span>{formatCurrency(totalDevelopment)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Hosting</span>
                  <span>{formatCurrency(hostingCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Maintenance ({maintenancePeriod})</span>
                  <span>{formatCurrency(maintenanceCost)}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Grand Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Button className="w-full" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" className="w-full" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Simpan Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
