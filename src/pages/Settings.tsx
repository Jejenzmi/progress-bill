import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Building2, User, Mail, Phone, MapPin, Globe, Save } from 'lucide-react';

export default function Settings() {
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
                defaultValue="PT Zen Multimedia Indonesia"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="npwp">NPWP</Label>
                <Input id="npwp" defaultValue="01.234.567.8-901.000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input id="phone" defaultValue="+62 411 123456" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Input
                id="address"
                defaultValue="Jl. AP Pettarani No. 123, Makassar, Sulawesi Selatan 90221"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="hello@zenmultimedia.co.id" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" defaultValue="www.zenmultimedia.co.id" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rate Card */}
        <Card>
          <CardHeader>
            <CardTitle>Rate Card Default</CardTitle>
            <CardDescription>
              Tarif standar per hari untuk setiap role (digunakan di Quotation Builder)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">Project Manager</span>
                <Input className="w-32 text-right" defaultValue="1500000" />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">Business Analyst</span>
                <Input className="w-32 text-right" defaultValue="1200000" />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">UI/UX Designer</span>
                <Input className="w-32 text-right" defaultValue="1000000" />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">Backend Developer</span>
                <Input className="w-32 text-right" defaultValue="1200000" />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">Frontend Developer</span>
                <Input className="w-32 text-right" defaultValue="1000000" />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">QA Engineer</span>
                <Input className="w-32 text-right" defaultValue="800000" />
              </div>
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
                <Input id="invoicePrefix" defaultValue="INV/ZEN" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultTop">Default Terms of Payment (hari)</Label>
                <Input id="defaultTop" type="number" defaultValue="14" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankInfo">Informasi Rekening</Label>
              <Input
                id="bankInfo"
                defaultValue="Bank BCA - 1234567890 a.n. PT Zen Multimedia Indonesia"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline">Batal</Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
