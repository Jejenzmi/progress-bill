import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, 
  Settings, 
  Users, 
  Briefcase, 
  Calculator, 
  Receipt, 
  FileSignature,
  TrendingUp,
  Calendar,
  Shield,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Info,
  AlertCircle,
  UserPlus,
  Target,
  Activity,
  BarChart3,
  FileText,
  Crown,
  Wallet,
  Play,
  ChevronRight,
  Circle,
  Upload,
  Image,
  Building,
  CreditCard,
  Percent,
  ClipboardList,
  ArrowDown,
  Zap,
  RefreshCw,
  Eye,
  Download,
  HandCoins,
  XCircle,
  Clock,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface SlideProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: any;
  step?: number;
  totalSteps?: number;
}

function Slide({ title, subtitle, children, icon: Icon, step, totalSteps }: SlideProps) {
  return (
    <div className="min-h-[500px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-3 rounded-xl bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {step && totalSteps && (
          <Badge variant="outline" className="text-sm">
            {step} / {totalSteps}
          </Badge>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function StepCard({ step, title, description, icon: Icon }: { step: number; title: string; description: string; icon?: any }) {
  return (
    <div className="flex gap-4 p-4 rounded-xl bg-muted/50 border">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
          {step}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          <h4 className="font-semibold">{title}</h4>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function FeatureCard({ title, description, icon: Icon }: { title: string; description: string; icon?: any }) {
  return (
    <div className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        <h4 className="font-semibold">{title}</h4>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default function Guide() {
  const { hasRole } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedRole, setSelectedRole] = useState<string>('overview');

  const roleSlides = {
    // Setup Guide - Panduan Setup Awal yang Detail
    setup: [
      {
        title: 'Panduan Setup Awal',
        subtitle: 'Langkah pertama sebelum menggunakan aplikasi',
        icon: Settings,
        content: (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <h3 className="text-xl font-semibold mb-4">Sebelum Mulai</h3>
              <p className="text-muted-foreground leading-relaxed">
                Pastikan Anda sudah login dengan akun Admin untuk mengakses semua pengaturan.
                Setup awal ini penting agar semua dokumen (Quotation, Invoice) memiliki informasi perusahaan yang lengkap.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <FeatureCard icon={Image} title="1. Upload Logo" description="Logo akan tampil di kop surat PDF Quotation dan Invoice" />
              <FeatureCard icon={Building} title="2. Profil Perusahaan" description="Nama, NPWP, alamat, email, website perusahaan" />
              <FeatureCard icon={CreditCard} title="3. Rekening Bank" description="Informasi rekening untuk pembayaran di Invoice" />
              <FeatureCard icon={Percent} title="4. Template Termin" description="Template pembagian termin pembayaran proyek" />
            </div>
            
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">Akses Admin Diperlukan</p>
                  <p className="text-sm text-muted-foreground">
                    Hanya user dengan role Admin yang dapat mengubah pengaturan. Hubungi admin jika Anda tidak memiliki akses.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Step 1: Upload Logo Perusahaan',
        subtitle: 'Logo akan muncul di semua dokumen PDF',
        icon: Image,
        content: (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Cara Upload Logo</h3>
                <StepCard step={1} title="Buka Pengaturan" description="Klik menu 'Pengaturan' di sidebar atau navigasi ke /settings" />
                <StepCard step={2} title="Scroll ke Logo Upload" description="Di bagian 'Profil Perusahaan', cari section 'Logo Perusahaan'" />
                <StepCard step={3} title="Pilih File" description="Klik 'Pilih File' atau drag & drop gambar logo (PNG/JPG, max 2MB)" />
                <StepCard step={4} title="Simpan" description="Logo otomatis diupload. Klik 'Simpan Pengaturan' di bawah halaman" />
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Spesifikasi Logo</h3>
                <div className="p-4 rounded-xl bg-muted/50 border space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span className="text-sm">Format: PNG atau JPG</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span className="text-sm">Ukuran maksimal: 2MB</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span className="text-sm">Resolusi rekomendasi: 300x100px</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span className="text-sm">Background transparan (PNG) lebih baik</span>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-muted-foreground">
                    <Info className="h-4 w-4 inline mr-1" />
                    Logo akan otomatis muncul di kop surat Quotation dan Invoice PDF
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Step 2: Isi Profil Perusahaan',
        subtitle: 'Data perusahaan untuk dokumen resmi',
        icon: Building,
        content: (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-muted/50 border">
              <h3 className="font-semibold mb-4">Data yang Harus Diisi</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <div>
                      <p className="font-medium text-sm">Nama Perusahaan</p>
                      <p className="text-xs text-muted-foreground">Contoh: PT Zen Multimedia Indonesia</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <div>
                      <p className="font-medium text-sm">NPWP Perusahaan</p>
                      <p className="text-xs text-muted-foreground">Nomor Pokok Wajib Pajak (15 digit)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <div>
                      <p className="font-medium text-sm">Alamat Lengkap</p>
                      <p className="text-xs text-muted-foreground">Jalan, nomor, kota, provinsi, kode pos</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                    <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold shrink-0">4</div>
                    <div>
                      <p className="font-medium text-sm">Telepon</p>
                      <p className="text-xs text-muted-foreground">Nomor telepon kantor</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                    <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold shrink-0">5</div>
                    <div>
                      <p className="font-medium text-sm">Email</p>
                      <p className="text-xs text-muted-foreground">Email resmi perusahaan</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                    <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold shrink-0">6</div>
                    <div>
                      <p className="font-medium text-sm">Website</p>
                      <p className="text-xs text-muted-foreground">URL website perusahaan (opsional)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Tips Pengisian
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• NPWP harus sesuai format: XX.XXX.XXX.X-XXX.XXX</li>
                <li>• Alamat akan muncul di header setiap dokumen</li>
                <li>• Email digunakan untuk korespondensi dengan klien</li>
              </ul>
            </div>
          </div>
        ),
      },
      {
        title: 'Step 3: Tambah Rekening Bank',
        subtitle: 'Informasi pembayaran untuk Invoice',
        icon: CreditCard,
        content: (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Cara Menambah Rekening</h3>
                <StepCard step={1} title="Scroll ke Bank Accounts" description="Di halaman Settings, cari section 'Kelola Rekening Bank'" />
                <StepCard step={2} title="Klik Tambah Rekening" description="Klik tombol '+ Tambah Rekening Baru'" />
                <StepCard step={3} title="Isi Detail Rekening" description="Nama Bank, Nomor Rekening, Nama Pemilik Rekening" />
                <StepCard step={4} title="Set Sebagai Default" description="Centang 'Jadikan Default' untuk rekening utama" />
                <StepCard step={5} title="Simpan" description="Klik 'Simpan' untuk menyimpan rekening" />
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Contoh Pengisian</h3>
                <div className="p-4 rounded-xl border bg-card">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Nama Bank</p>
                      <p className="font-medium">Bank Central Asia (BCA)</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nomor Rekening</p>
                      <p className="font-medium font-mono">123-456-7890</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Atas Nama</p>
                      <p className="font-medium">PT Zen Multimedia Indonesia</p>
                    </div>
                    <Badge className="bg-primary/10 text-primary">Default</Badge>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-muted-foreground">
                    <Info className="h-4 w-4 inline mr-1" />
                    Anda bisa menambah beberapa rekening dan memilih saat membuat Invoice
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Step 4: Setup Template Termin',
        subtitle: 'Template pembagian termin pembayaran',
        icon: Percent,
        content: (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-muted/50 border">
              <h3 className="font-semibold mb-4">Apa itu Template Termin?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Template termin adalah pola pembagian pembayaran proyek yang akan otomatis diterapkan saat membuat proyek baru dari Quotation yang diapprove.
              </p>
              
              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-background border text-center">
                  <p className="text-2xl font-bold text-primary">30%</p>
                  <p className="text-xs text-muted-foreground">Down Payment (DP)</p>
                  <Badge variant="outline" className="mt-2 text-xs">SPK Signed</Badge>
                </div>
                <div className="p-3 rounded-lg bg-background border text-center">
                  <p className="text-2xl font-bold text-primary">40%</p>
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <Badge variant="outline" className="mt-2 text-xs">Progress Report</Badge>
                </div>
                <div className="p-3 rounded-lg bg-background border text-center">
                  <p className="text-2xl font-bold text-primary">30%</p>
                  <p className="text-xs text-muted-foreground">Final Payment</p>
                  <Badge variant="outline" className="mt-2 text-xs">BAST</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <StepCard step={1} title="Buka Template Manager" description="Di halaman Settings, scroll ke 'Template Termin Pembayaran'" />
              <StepCard step={2} title="Edit atau Tambah Termin" description="Klik 'Edit Template' untuk mengubah default, atau buat template baru" />
              <StepCard step={3} title="Atur Persentase" description="Pastikan total semua termin = 100%" />
              <StepCard step={4} title="Pilih Trigger" description="Pilih kondisi trigger: SPK Signed, Progress Report, BAST, Maintenance, atau Custom" />
            </div>
            
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">Total Harus 100%</p>
                  <p className="text-sm text-muted-foreground">
                    Jumlah persentase semua termin harus sama dengan 100%. Sistem akan menampilkan error jika tidak sesuai.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Setup Selesai!',
        subtitle: 'Anda siap menggunakan aplikasi',
        icon: CheckCircle2,
        content: (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Setup Awal Berhasil!</h3>
              <p className="text-muted-foreground">
                Semua pengaturan dasar sudah dikonfigurasi. Anda sekarang bisa mulai menambah data klien dan leads.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-blue-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    Langkah Selanjutnya
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ol className="space-y-2 list-decimal list-inside">
                    <li>Tambah data Klien di menu Klien</li>
                    <li>Input Lead baru di menu Leads</li>
                    <li>Buat Quotation dari Lead Hot</li>
                    <li>Ajukan approval ke COO</li>
                  </ol>
                </CardContent>
              </Card>
              
              <Card className="border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Play className="h-5 w-5 text-primary" />
                    Alur Otomatis
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Hot Lead → Quotation → Approve → Project
                    </li>
                    <li className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Termin otomatis dari template
                    </li>
                    <li className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Notifikasi ke Finance saat project dibuat
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <h4 className="font-medium mb-2">Navigasi Cepat</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">Klien → /clients</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">Leads → /leads</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">Quotation → /quotation</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">Projects → /projects</Badge>
              </div>
            </div>
          </div>
        ),
      },
    ],
    overview: [
      {
        title: 'Selamat Datang!',
        subtitle: 'Sales Order Management System',
        icon: BookOpen,
        content: (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <h3 className="text-xl font-semibold mb-4">Tentang Aplikasi</h3>
              <p className="text-muted-foreground leading-relaxed">
                Sistem ini dirancang untuk mengelola seluruh proses penjualan dari awal hingga akhir,
                mulai dari pengelolaan leads, pembuatan quotation, manajemen proyek, hingga penagihan invoice.
                Setiap role memiliki akses dan tanggung jawab yang berbeda sesuai fungsinya.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                <Target className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <p className="font-semibold">Marketing</p>
                <p className="text-xs text-muted-foreground">The Hunter</p>
              </div>
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                <Wallet className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="font-semibold">Finance</p>
                <p className="text-xs text-muted-foreground">The Keeper</p>
              </div>
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
                <Briefcase className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                <p className="font-semibold">Project Manager</p>
                <p className="text-xs text-muted-foreground">The Enabler</p>
              </div>
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                <Crown className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <p className="font-semibold">BDO / COO</p>
                <p className="text-xs text-muted-foreground">The Leader</p>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Alur Kerja Aplikasi',
        subtitle: 'End-to-End Sales Process',
        icon: TrendingUp,
        content: (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-2 flex-wrap p-6 bg-muted/30 rounded-2xl">
              <Badge className="text-sm py-2 px-4">Lead Masuk</Badge>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
              <Badge variant="secondary" className="text-sm py-2 px-4">Follow Up</Badge>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
              <Badge variant="outline" className="text-sm py-2 px-4">Quotation</Badge>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
              <Badge className="text-sm py-2 px-4">Negosiasi</Badge>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
              <Badge variant="secondary" className="text-sm py-2 px-4">Proyek Won</Badge>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
              <Badge variant="outline" className="text-sm py-2 px-4">Invoice</Badge>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
              <Badge className="bg-green-500 text-sm py-2 px-4">Paid</Badge>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-blue-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <UserPlus className="h-4 w-4 text-blue-500" />
                    </div>
                    Tahap Sales
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-1">
                    <li>• Kelola leads dari berbagai sumber</li>
                    <li>• Follow up dan catat aktivitas</li>
                    <li>• Buat quotation & proposal</li>
                    <li>• Negosiasi dengan klien</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="border-orange-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Briefcase className="h-4 w-4 text-orange-500" />
                    </div>
                    Tahap Proyek
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-1">
                    <li>• Konversi deal ke proyek</li>
                    <li>• Setup termin pembayaran</li>
                    <li>• Upload dokumen pendukung</li>
                    <li>• Monitor progress proyek</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="border-green-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Receipt className="h-4 w-4 text-green-500" />
                    </div>
                    Tahap Finance
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-1">
                    <li>• Generate invoice per termin</li>
                    <li>• Kirim tagihan ke klien</li>
                    <li>• Tracking pembayaran</li>
                    <li>• Proyeksi cashflow</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        ),
      },
      {
        title: 'Alur Data Lengkap',
        subtitle: 'Hubungan antar modul aplikasi',
        icon: RefreshCw,
        content: (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-muted/30 border">
              <h3 className="font-semibold mb-4 text-center">Diagram Alur Data</h3>
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center min-w-[120px]">
                    <UserPlus className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                    <p className="text-sm font-medium">LEAD</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center min-w-[120px]">
                    <Users className="h-6 w-6 mx-auto mb-1 text-purple-500" />
                    <p className="text-sm font-medium">CLIENT</p>
                  </div>
                </div>
                <ArrowDown className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center min-w-[120px]">
                    <Calculator className="h-6 w-6 mx-auto mb-1 text-yellow-600" />
                    <p className="text-sm font-medium">QUOTATION</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center min-w-[120px]">
                    <Briefcase className="h-6 w-6 mx-auto mb-1 text-orange-500" />
                    <p className="text-sm font-medium">PROJECT</p>
                  </div>
                </div>
                <ArrowDown className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center min-w-[120px]">
                    <FileText className="h-6 w-6 mx-auto mb-1 text-green-500" />
                    <p className="text-sm font-medium">EVIDENCE</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center min-w-[120px]">
                    <Receipt className="h-6 w-6 mx-auto mb-1 text-emerald-500" />
                    <p className="text-sm font-medium">INVOICE</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Fitur Auto-Create
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Lead Hot → Quotation → Project (otomatis)</li>
                  <li>• Template termin otomatis diterapkan</li>
                  <li>• Notifikasi otomatis ke Finance</li>
                </ul>
              </div>
              
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Trigger Invoice
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Invoice terkunci sampai evidence diupload</li>
                  <li>• Evidence: SPK, BAST, Laporan Progress</li>
                  <li>• Finance bisa generate setelah unlock</li>
                </ul>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Quick Start',
        subtitle: 'Langkah awal menggunakan aplikasi',
        icon: Play,
        content: (
          <div className="space-y-4">
            <StepCard
              step={1}
              title="Lengkapi Pengaturan"
              description="Buka menu Pengaturan → Upload logo perusahaan, isi data perusahaan (nama, NPWP, alamat), dan informasi rekening bank."
              icon={Settings}
            />
            <StepCard
              step={2}
              title="Tambah Data Klien"
              description="Buka menu Klien → Tambah klien baru dengan informasi lengkap (nama perusahaan, alamat, PIC, kontak)."
              icon={Users}
            />
            <StepCard
              step={3}
              title="Input Lead atau Buat Proyek"
              description="Jika ada prospek baru, input ke Leads. Jika sudah ada deal, langsung buat Proyek dengan termin pembayaran."
              icon={Briefcase}
            />
            <StepCard
              step={4}
              title="Kelola Dokumen"
              description="Buat Quotation untuk penawaran, generate Invoice untuk tagihan, dan gunakan TTE untuk tandatangan elektronik."
              icon={FileText}
            />
            
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Lihat Panduan Setup Lengkap
              </h4>
              <p className="text-sm text-muted-foreground">
                Klik tombol "Setup Awal" di atas untuk melihat panduan detail setup logo, rekening bank, dan template termin.
              </p>
            </div>
          </div>
        ),
      },
    ],
    marketing: [
      {
        title: 'Panduan Marketing',
        subtitle: 'The Hunter - Mencari dan Mengkonversi Leads',
        icon: Target,
        content: (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <h3 className="text-xl font-semibold mb-2">Peran Anda</h3>
              <p className="text-muted-foreground">
                Sebagai Marketing, Anda bertanggung jawab untuk mencari prospek baru, 
                melakukan follow up, membuat penawaran, dan mengkonversi leads menjadi proyek.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <FeatureCard
                icon={UserPlus}
                title="Kelola Leads"
                description="Input dan tracking semua prospek dari berbagai sumber (referral, website, event, dll)"
              />
              <FeatureCard
                icon={Activity}
                title="Catat Aktivitas"
                description="Log semua interaksi: meeting, telepon, email, WhatsApp untuk history lengkap"
              />
              <FeatureCard
                icon={Calculator}
                title="Buat Quotation"
                description="Generate penawaran profesional dengan kalkulasi otomatis dan PDF template"
              />
              <FeatureCard
                icon={TrendingUp}
                title="Monitor Pipeline"
                description="Lacak progress setiap deal dari meeting hingga closing"
              />
            </div>
          </div>
        ),
      },
      {
        title: 'Mengelola Leads',
        subtitle: 'Cara input dan tracking leads',
        icon: UserPlus,
        content: (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                <Badge className="bg-blue-500">Cold</Badge>
                <p className="text-xs text-muted-foreground mt-2">Lead baru, belum ada interaksi</p>
              </div>
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
                <Badge className="bg-yellow-500">Warm</Badge>
                <p className="text-xs text-muted-foreground mt-2">Sudah ada komunikasi aktif</p>
              </div>
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                <Badge className="bg-red-500">Hot</Badge>
                <p className="text-xs text-muted-foreground mt-2">Siap closing, prioritas tinggi</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <StepCard
                step={1}
                title="Tambah Lead Baru"
                description="Klik 'Tambah Lead' → Isi nama, perusahaan, kontak, sumber lead, dan estimasi nilai proyek"
              />
              <StepCard
                step={2}
                title="Catat Aktivitas"
                description="Setiap interaksi, tambahkan aktivitas (meeting/call/email) dengan catatan detail"
              />
              <StepCard
                step={3}
                title="Update Status"
                description="Ubah status Cold → Warm → Hot sesuai progress. Atur jadwal follow up berikutnya"
              />
              <StepCard
                step={4}
                title="Konversi ke Klien"
                description="Saat deal closing, konversi lead menjadi klien dan buat proyek baru"
              />
            </div>
          </div>
        ),
      },
      {
        title: 'Membuat Quotation',
        subtitle: 'Generate penawaran profesional',
        icon: Calculator,
        content: (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Langkah Pembuatan</h3>
                <StepCard step={1} title="Pilih/Buat Klien" description="Pilih klien existing atau tambah klien baru" />
                <StepCard step={2} title="Isi Detail Quotation" description="Nama proyek, tanggal, masa berlaku" />
                <StepCard step={3} title="Kalkulasi Man-days" description="Input role, jumlah hari, dan rate per hari" />
                <StepCard step={4} title="Tambah Biaya Lain" description="Hosting, maintenance, atau biaya tambahan" />
                <StepCard step={5} title="Submit untuk Approval" description="Ajukan ke COO/Admin untuk persetujuan" />
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Fitur Quotation</h3>
                <div className="space-y-3">
                  <FeatureCard icon={Calculator} title="Kalkulasi Otomatis" description="Subtotal, PPN 11%, dan grand total dihitung otomatis" />
                  <FeatureCard icon={FileText} title="PDF Profesional" description="Template dengan kop surat dan logo perusahaan" />
                  <FeatureCard icon={FileSignature} title="TTE Terintegrasi" description="QR Code untuk verifikasi keaslian dokumen" />
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">Penting!</p>
                  <p className="text-sm text-muted-foreground">
                    Quotation harus disubmit untuk approval oleh COO/Admin sebelum dapat dikirim ke klien.
                    Anda akan mendapat notifikasi saat quotation disetujui atau ditolak.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Sales Pipeline',
        subtitle: 'Tracking progress deal',
        icon: TrendingUp,
        content: (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-primary/10 border-2 border-primary/30 text-center">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-primary">1</span>
                </div>
                <Badge>Meeting</Badge>
                <p className="text-xs text-muted-foreground mt-2">Pertemuan awal dengan prospek</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/50 border-2 border-secondary text-center">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold">2</span>
                </div>
                <Badge variant="secondary">Proposal</Badge>
                <p className="text-xs text-muted-foreground mt-2">Quotation sudah dikirim</p>
              </div>
              <div className="p-4 rounded-xl bg-accent/50 border-2 border-accent text-center">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold">3</span>
                </div>
                <Badge variant="outline">Negosiasi</Badge>
                <p className="text-xs text-muted-foreground mt-2">Diskusi harga & scope</p>
              </div>
              <div className="p-4 rounded-xl bg-green-500/10 border-2 border-green-500/30 text-center">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-green-600">4</span>
                </div>
                <Badge className="bg-green-500">Closing</Badge>
                <p className="text-xs text-muted-foreground mt-2">Finalisasi kontrak</p>
              </div>
            </div>
            
            <div className="p-6 rounded-xl bg-muted/50 border">
              <h3 className="font-semibold mb-4">Cara Menggunakan Pipeline</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Proyek dengan status "Pipeline" otomatis muncul di halaman Pipeline
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Drag & drop kartu untuk memindahkan antar tahapan
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Klik kartu untuk edit detail dan ubah probabilitas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Ubah status ke "Won" saat deal berhasil closing
                </li>
              </ul>
            </div>
          </div>
        ),
      },
      {
        title: 'Negosiasi Harga',
        subtitle: 'Input dan revisi harga deal dengan klien',
        icon: HandCoins,
        content: (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
              <h3 className="text-xl font-semibold mb-2">Alur Negosiasi Harga</h3>
              <p className="text-muted-foreground">
                Setelah quotation dikirim ke klien dan ada negosiasi harga, Marketing dapat mencatat 
                harga deal yang disetujui klien. Harga ini harus diapprove oleh BDO/COO sebelum dianggap final.
              </p>
            </div>
            
            <div className="grid md:grid-cols-4 gap-3 mb-6">
              <div className="p-4 rounded-xl bg-muted/50 border text-center">
                <Badge variant="secondary">Draft</Badge>
                <p className="text-xs text-muted-foreground mt-2">Belum ada negosiasi</p>
              </div>
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
                <Badge className="bg-yellow-500">Pending</Badge>
                <p className="text-xs text-muted-foreground mt-2">Menunggu approval</p>
              </div>
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                <Badge className="bg-green-500">Deal</Badge>
                <p className="text-xs text-muted-foreground mt-2">Disetujui</p>
              </div>
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                <Badge variant="destructive">Ditolak</Badge>
                <p className="text-xs text-muted-foreground mt-2">Perlu revisi</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <StepCard step={1} title="Buka Quotation" description="Klik ikon 'Harga Negosiasi' (ikon tangan+koin) di daftar quotation yang sudah Sent/Approved" />
              <StepCard step={2} title="Input Harga Deal" description="Masukkan harga yang disepakati klien. Sistem akan menampilkan diskon/selisih dari harga awal" />
              <StepCard step={3} title="Tambah Catatan" description="Jelaskan alasan diskon, misalnya 'repeat order' atau 'volume besar'" />
              <StepCard step={4} title="Submit untuk Approval" description="Harga akan diajukan ke BDO/COO. Anda akan mendapat notifikasi saat disetujui/ditolak" />
            </div>
            
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">Jika Ditolak</p>
                  <p className="text-sm text-muted-foreground">
                    Anda dapat merevisi harga negosiasi dengan klik ikon revisi (panah melingkar). 
                    Sistem akan menampilkan alasan penolakan sebelumnya untuk panduan revisi Anda.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
      },
    ],
    finance: [
      {
        title: 'Panduan Finance',
        subtitle: 'The Keeper - Mengelola Keuangan Proyek',
        icon: Wallet,
        content: (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20">
              <h3 className="text-xl font-semibold mb-2">Peran Anda</h3>
              <p className="text-muted-foreground">
                Sebagai Finance, Anda bertanggung jawab untuk mengelola invoice, 
                tracking pembayaran, dan memantau proyeksi cashflow perusahaan.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <FeatureCard
                icon={Receipt}
                title="Kelola Invoice"
                description="Generate dan kirim invoice berdasarkan termin pembayaran proyek"
              />
              <FeatureCard
                icon={Calendar}
                title="Proyeksi Cashflow"
                description="Pantau arus kas masuk berdasarkan jadwal jatuh tempo"
              />
              <FeatureCard
                icon={CheckCircle2}
                title="Tracking Pembayaran"
                description="Record pembayaran masuk dan update status invoice"
              />
              <FeatureCard
                icon={FileText}
                title="Dokumen Proyek"
                description="Akses dokumen pendukung seperti SPK, BAST, faktur pajak"
              />
            </div>
          </div>
        ),
      },
      {
        title: 'Mengelola Invoice',
        subtitle: 'Cara membuat dan tracking invoice',
        icon: Receipt,
        content: (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-3 mb-6">
              <div className="p-4 rounded-xl bg-muted/50 border text-center">
                <Badge variant="secondary">Draft</Badge>
                <p className="text-xs text-muted-foreground mt-2">Belum dikirim</p>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                <Badge className="bg-blue-500">Sent</Badge>
                <p className="text-xs text-muted-foreground mt-2">Sudah dikirim</p>
              </div>
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                <Badge className="bg-green-500">Paid</Badge>
                <p className="text-xs text-muted-foreground mt-2">Sudah dibayar</p>
              </div>
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                <Badge variant="destructive">Overdue</Badge>
                <p className="text-xs text-muted-foreground mt-2">Jatuh tempo</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <StepCard step={1} title="Pilih Proyek & Termin" description="Pilih proyek yang sudah Won, lalu pilih termin yang akan ditagih" />
              <StepCard step={2} title="Generate Invoice" description="Sistem otomatis generate nomor invoice dan mengisi detail dari termin" />
              <StepCard step={3} title="Download PDF" description="Download invoice PDF dengan format resmi untuk dikirim ke klien" />
              <StepCard step={4} title="Update Status" description="Ubah status ke 'Sent' setelah mengirim, lalu 'Paid' setelah menerima pembayaran" />
            </div>
            
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-blue-500 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Invoice yang melewati jatuh tempo akan otomatis berubah status menjadi "Overdue" 
                  dan akan muncul notifikasi untuk tim terkait.
                </p>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Proyeksi Cashflow',
        subtitle: 'Monitoring arus kas',
        icon: Calendar,
        content: (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-muted/50 border">
              <h3 className="font-semibold mb-4">Fitur Cashflow</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FeatureCard
                  icon={Calendar}
                  title="Tampilan Kalender"
                  description="Lihat jadwal pembayaran dalam format kalender bulanan"
                />
                <FeatureCard
                  icon={BarChart3}
                  title="Grafik Proyeksi"
                  description="Chart visualisasi penerimaan per bulan"
                />
                <FeatureCard
                  icon={AlertCircle}
                  title="Alert Jatuh Tempo"
                  description="Highlight invoice yang mendekati atau melewati jatuh tempo"
                />
                <FeatureCard
                  icon={TrendingUp}
                  title="Trend Analysis"
                  description="Lihat tren penerimaan dari waktu ke waktu"
                />
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Tips Penggunaan
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Cek halaman Cashflow secara rutin untuk planning pengeluaran</li>
                <li>• Perhatikan periode dengan penerimaan rendah untuk antisipasi</li>
                <li>• Gunakan filter untuk melihat proyeksi per periode tertentu</li>
              </ul>
            </div>
          </div>
        ),
      },
    ],
    pm: [
      {
        title: 'Panduan Project Manager',
        subtitle: 'The Enabler - Memastikan Proyek Berjalan Lancar',
        icon: Briefcase,
        content: (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-orange-500/10 border border-orange-500/20">
              <h3 className="text-xl font-semibold mb-2">Peran Anda</h3>
              <p className="text-muted-foreground">
                Sebagai Project Manager, Anda bertanggung jawab untuk memastikan proyek berjalan sesuai jadwal,
                mengelola dokumen pendukung, dan melakukan koordinasi dengan tim internal maupun klien.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <FeatureCard
                icon={Briefcase}
                title="Monitor Proyek"
                description="Pantau status dan progress semua proyek yang Anda handle"
              />
              <FeatureCard
                icon={FileText}
                title="Kelola Dokumen"
                description="Upload dan kelola dokumen proyek (SPK, BAST, laporan progress)"
              />
              <FeatureCard
                icon={Activity}
                title="Catat Aktivitas"
                description="Log meeting, follow up, dan komunikasi dengan klien"
              />
              <FeatureCard
                icon={Calendar}
                title="Tracking Termin"
                description="Monitor termin pembayaran dan trigger conditions"
              />
            </div>
          </div>
        ),
      },
      {
        title: 'Mengelola Proyek',
        subtitle: 'Day-to-day project management',
        icon: Briefcase,
        content: (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold">Akses yang Tersedia</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    View semua proyek
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Upload dokumen pendukung
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Catat aktivitas proyek
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Lihat detail termin pembayaran
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Akses halaman TTE Dokumen
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold">Jenis Dokumen Termin</h3>
                <div className="space-y-2">
                  <Badge variant="outline" className="mr-2">SPK</Badge>
                  <Badge variant="outline" className="mr-2">BAST</Badge>
                  <Badge variant="outline" className="mr-2">Laporan Progress</Badge>
                  <Badge variant="outline" className="mr-2">Faktur Pajak</Badge>
                  <Badge variant="outline">Bukti Potong PPh</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload dokumen pendukung sesuai trigger condition masing-masing termin
                </p>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">Penting!</p>
                  <p className="text-sm text-muted-foreground">
                    Pastikan dokumen seperti BAST dan Laporan Progress sudah diupload sebelum 
                    Finance membuat invoice untuk termin terkait.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
      },
    ],
    bdo: [
      {
        title: 'Panduan BDO / COO',
        subtitle: 'The Leader - Oversight dan Decision Making',
        icon: Crown,
        content: (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-purple-500/10 border border-purple-500/20">
              <h3 className="text-xl font-semibold mb-2">Peran Anda</h3>
              <p className="text-muted-foreground">
                Sebagai BDO/COO, Anda memiliki akses penuh ke seluruh sistem untuk monitoring,
                approval quotation, dan pengambilan keputusan strategis.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <FeatureCard
                icon={Crown}
                title="CEO Dashboard"
                description="Overview bisnis secara keseluruhan dengan KPI utama"
              />
              <FeatureCard
                icon={BarChart3}
                title="BDO Dashboard"
                description="Monitoring pipeline, deals, dan performa sales"
              />
              <FeatureCard
                icon={CheckCircle2}
                title="Approval Quotation"
                description="Review dan approve/reject quotation yang disubmit"
              />
              <FeatureCard
                icon={Settings}
                title="Pengaturan Sistem"
                description="Konfigurasi perusahaan, target sales, dan TTE"
              />
            </div>
          </div>
        ),
      },
      {
        title: 'Approval Quotation',
        subtitle: 'Proses review dan persetujuan',
        icon: CheckCircle2,
        content: (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
                <Badge className="bg-yellow-500">Pending</Badge>
                <p className="text-xs text-muted-foreground mt-2">Menunggu review</p>
              </div>
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                <Badge className="bg-green-500">Approved</Badge>
                <p className="text-xs text-muted-foreground mt-2">Disetujui</p>
              </div>
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                <Badge variant="destructive">Rejected</Badge>
                <p className="text-xs text-muted-foreground mt-2">Ditolak</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <StepCard step={1} title="Terima Notifikasi" description="Anda akan mendapat notifikasi saat ada quotation baru yang disubmit" />
              <StepCard step={2} title="Review Detail" description="Buka quotation, periksa klien, nilai proyek, dan kalkulasi man-days" />
              <StepCard step={3} title="Berikan Komentar" description="Tambahkan catatan atau pertanyaan jika diperlukan" />
              <StepCard step={4} title="Approve atau Reject" description="Setujui jika sudah sesuai, atau tolak dengan alasan yang jelas" />
            </div>
            
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-blue-500 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Submitter akan mendapat notifikasi real-time saat Anda approve atau reject quotation mereka.
                </p>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Approval Harga Negosiasi',
        subtitle: 'Review dan setujui harga deal dari Marketing',
        icon: HandCoins,
        content: (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
              <h3 className="text-xl font-semibold mb-2">Tentang Approval Negosiasi</h3>
              <p className="text-muted-foreground">
                Saat Marketing menginput harga negosiasi dengan klien, BDO/COO harus mereview dan menyetujui 
                atau menolak harga tersebut. Ini memastikan setiap deal sesuai dengan kebijakan margin perusahaan.
              </p>
            </div>
            
            <div className="space-y-3">
              <StepCard step={1} title="Terima Notifikasi" description="Anda akan mendapat notifikasi 'Harga Negosiasi Perlu Approval' saat ada pengajuan baru" />
              <StepCard step={2} title="Review di Quotation" description="Buka daftar quotation, cari yang status negosiasi 'Pending', klik ikon review (centang kuning)" />
              <StepCard step={3} title="Periksa Detail" description="Lihat harga awal, harga negosiasi, persentase diskon, dan catatan dari Marketing" />
              <StepCard step={4} title="Approve atau Reject" description="Setujui jika margin masih acceptable, atau tolak dengan alasan yang jelas" />
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Jika Disetujui
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Status berubah ke "Deal"</li>
                  <li>• Notifikasi ke Marketing & Finance</li>
                  <li>• Harga final tercatat di sistem</li>
                </ul>
              </div>
              
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Jika Ditolak
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Wajib isi alasan penolakan</li>
                  <li>• Notifikasi ke Marketing untuk revisi</li>
                  <li>• Marketing bisa ajukan harga baru</li>
                </ul>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Riwayat Negosiasi',
        subtitle: 'Monitoring dan laporan negosiasi',
        icon: History,
        content: (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-muted/50 border">
              <h3 className="font-semibold mb-4">Fitur Halaman Riwayat Negosiasi</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FeatureCard
                  icon={BarChart3}
                  title="Grafik Tren Diskon"
                  description="Visualisasi rata-rata diskon per bulan untuk analisis pricing"
                />
                <FeatureCard
                  icon={Calendar}
                  title="Filter Periode"
                  description="Lihat negosiasi berdasarkan rentang tanggal tertentu"
                />
                <FeatureCard
                  icon={Users}
                  title="Filter Klien"
                  description="Analisis negosiasi per klien untuk strategi pricing"
                />
                <FeatureCard
                  icon={Download}
                  title="Export CSV"
                  description="Download data negosiasi untuk laporan eksternal"
                />
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-blue-500 shrink-0" />
                <div>
                  <p className="font-medium text-blue-700 dark:text-blue-400">Akses Halaman</p>
                  <p className="text-sm text-muted-foreground">
                    Buka menu Keuangan → Riwayat Negosiasi untuk melihat laporan lengkap semua negosiasi 
                    beserta statistik dan grafik tren bulanan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Dashboards & Reports',
        subtitle: 'Monitoring performa bisnis',
        icon: BarChart3,
        content: (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crown className="h-5 w-5 text-purple-500" />
                    CEO Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-1">
                    <li>• Total revenue vs target</li>
                    <li>• Pipeline value overview</li>
                    <li>• Win rate dan conversion</li>
                    <li>• Top performing deals</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    BDO Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-1">
                    <li>• Pipeline per stage</li>
                    <li>• Deals closing soon</li>
                    <li>• Activity summary</li>
                    <li>• Team performance</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Sales Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-1">
                    <li>• Monthly sales trend</li>
                    <li>• Lead source analysis</li>
                    <li>• Quotation statistics</li>
                    <li>• Conversion funnel</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-orange-500" />
                    Laporan Performa
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-1">
                    <li>• Lead conversion rate</li>
                    <li>• Activity completion</li>
                    <li>• Target achievement</li>
                    <li>• Monthly trends</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        ),
      },
    ],
    tte: [
      {
        title: 'Tanda Tangan Elektronik',
        subtitle: 'Sistem TTE dengan QR Code Verifikasi',
        icon: FileSignature,
        content: (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20">
              <h3 className="text-xl font-semibold mb-2">Tentang TTE</h3>
              <p className="text-muted-foreground">
                Setiap dokumen yang dibuat (Quotation, Invoice) atau diupload ke sistem dapat 
                ditandatangani secara elektronik dengan QR Code yang dapat diverifikasi oleh pihak eksternal.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <FeatureCard
                icon={FileSignature}
                title="Single Signing"
                description="Tandatangani satu dokumen dengan posisi QR yang dapat dikustomisasi"
              />
              <FeatureCard
                icon={FileText}
                title="Batch Signing"
                description="Tandatangani beberapa dokumen sekaligus dalam satu proses"
              />
              <FeatureCard
                icon={CheckCircle2}
                title="Verifikasi Publik"
                description="Pihak eksternal dapat memverifikasi keaslian dokumen"
              />
            </div>
          </div>
        ),
      },
      {
        title: 'Cara Menggunakan TTE',
        subtitle: 'Step-by-step guide',
        icon: FileSignature,
        content: (
          <div className="space-y-6">
            <div className="space-y-3">
              <StepCard step={1} title="Buka TTE Dokumen" description="Akses menu 'TTE Dokumen' dari sidebar navigasi" />
              <StepCard step={2} title="Upload File" description="Upload file PDF atau gambar yang akan ditandatangani" />
              <StepCard step={3} title="Pilih Halaman" description="Untuk PDF multi-halaman, pilih halaman untuk menempatkan QR" />
              <StepCard step={4} title="Atur Posisi QR" description="Klik pada preview untuk menentukan posisi QR Code" />
              <StepCard step={5} title="Konfirmasi Data" description="Pastikan nama dan jabatan penandatangan sudah benar" />
              <StepCard step={6} title="Tanda Tangani" description="Klik tombol 'Tanda Tangani' untuk generate dokumen" />
            </div>
            
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Cara Verifikasi
              </h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Scan QR Code menggunakan kamera smartphone</li>
                <li>Atau buka halaman /verify dan masukkan ID Verifikasi</li>
                <li>Sistem akan menampilkan detail dokumen jika valid</li>
              </ol>
            </div>
          </div>
        ),
      },
    ],
  };

  const currentRoleSlides = roleSlides[selectedRole as keyof typeof roleSlides] || roleSlides.overview;
  const currentSlideData = currentRoleSlides[currentSlide];

  const nextSlide = () => {
    if (currentSlide < currentRoleSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const selectRole = (role: string) => {
    setSelectedRole(role);
    setCurrentSlide(0);
  };

  return (
    <AppLayout title="Panduan Penggunaan" subtitle="Tutorial lengkap untuk setiap role">
      <div className="space-y-6">
        {/* Role Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Pilih Panduan</CardTitle>
            <CardDescription>Pilih panduan sesuai role Anda atau lihat overview umum</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedRole === 'setup' ? 'default' : 'outline'}
                size="sm"
                onClick={() => selectRole('setup')}
                className={selectedRole === 'setup' ? 'bg-green-600 hover:bg-green-700' : 'border-green-500 text-green-600 hover:bg-green-50'}
              >
                <Settings className="h-4 w-4 mr-2" />
                Setup Awal
              </Button>
              <Button
                variant={selectedRole === 'overview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => selectRole('overview')}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Overview
              </Button>
              <Button
                variant={selectedRole === 'marketing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => selectRole('marketing')}
              >
                <Target className="h-4 w-4 mr-2" />
                Marketing
              </Button>
              <Button
                variant={selectedRole === 'finance' ? 'default' : 'outline'}
                size="sm"
                onClick={() => selectRole('finance')}
              >
                <Wallet className="h-4 w-4 mr-2" />
                Finance
              </Button>
              <Button
                variant={selectedRole === 'pm' ? 'default' : 'outline'}
                size="sm"
                onClick={() => selectRole('pm')}
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Project Manager
              </Button>
              <Button
                variant={selectedRole === 'bdo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => selectRole('bdo')}
              >
                <Crown className="h-4 w-4 mr-2" />
                BDO / COO
              </Button>
              <Button
                variant={selectedRole === 'tte' ? 'default' : 'outline'}
                size="sm"
                onClick={() => selectRole('tte')}
              >
                <FileSignature className="h-4 w-4 mr-2" />
                TTE Dokumen
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Slide Content */}
        <Card className="min-h-[600px]">
          <CardContent className="pt-6">
            <Slide
              title={currentSlideData.title}
              subtitle={currentSlideData.subtitle}
              icon={currentSlideData.icon}
              step={currentSlide + 1}
              totalSteps={currentRoleSlides.length}
            >
              {currentSlideData.content}
            </Slide>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={prevSlide}
            disabled={currentSlide === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Sebelumnya
          </Button>
          
          {/* Slide Indicators */}
          <div className="flex items-center gap-2">
            {currentRoleSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={cn(
                  'w-2.5 h-2.5 rounded-full transition-all',
                  index === currentSlide
                    ? 'bg-primary w-6'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                )}
              />
            ))}
          </div>
          
          <Button
            onClick={nextSlide}
            disabled={currentSlide === currentRoleSlides.length - 1}
          >
            Selanjutnya
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Access Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Matriks Hak Akses
            </CardTitle>
            <CardDescription>
              Fitur yang tersedia untuk setiap role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Fitur</th>
                    <th className="text-center py-3 px-4">Admin</th>
                    <th className="text-center py-3 px-4">Marketing</th>
                    <th className="text-center py-3 px-4">Finance</th>
                    <th className="text-center py-3 px-4">PM</th>
                    <th className="text-center py-3 px-4">BDO/COO</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-3 px-4">Dashboard Utama</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">CEO/BDO Dashboard</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Leads & Pipeline</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Quotation</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Invoice</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Proyek</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Cashflow</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Pengaturan</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Kelola User</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
