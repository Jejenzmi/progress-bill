import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
  Info,
  AlertCircle
} from 'lucide-react';

export default function Guide() {
  return (
    <AppLayout title="Panduan Aplikasi" subtitle="Dokumentasi lengkap penggunaan sistem">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Panduan Aplikasi</h1>
            <p className="text-muted-foreground">
              Dokumentasi lengkap penggunaan sistem Sales Order Management
            </p>
          </div>
        </div>

        {/* Quick Start */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Langkah Awal (Quick Start)
            </CardTitle>
            <CardDescription>
              Ikuti langkah-langkah berikut untuk mulai menggunakan aplikasi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-background">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-2">1</div>
                <p className="font-medium">Pengaturan</p>
                <p className="text-sm text-muted-foreground">Upload logo & isi data perusahaan</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-background">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-2">2</div>
                <p className="font-medium">Tambah Klien</p>
                <p className="text-sm text-muted-foreground">Daftarkan klien baru</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-background">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-2">3</div>
                <p className="font-medium">Buat Proyek</p>
                <p className="text-sm text-muted-foreground">Buat proyek dengan termin pembayaran</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-background">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-2">4</div>
                <p className="font-medium">Kelola Dokumen</p>
                <p className="text-sm text-muted-foreground">Buat Quotation & Invoice</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Guide Tabs */}
        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList className="grid grid-cols-4 lg:grid-cols-8 h-auto gap-1">
            <TabsTrigger value="settings" className="flex flex-col gap-1 py-2">
              <Settings className="h-4 w-4" />
              <span className="text-xs">Pengaturan</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex flex-col gap-1 py-2">
              <Users className="h-4 w-4" />
              <span className="text-xs">Klien</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex flex-col gap-1 py-2">
              <Briefcase className="h-4 w-4" />
              <span className="text-xs">Proyek</span>
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="flex flex-col gap-1 py-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Pipeline</span>
            </TabsTrigger>
            <TabsTrigger value="quotation" className="flex flex-col gap-1 py-2">
              <Calculator className="h-4 w-4" />
              <span className="text-xs">Quotation</span>
            </TabsTrigger>
            <TabsTrigger value="invoice" className="flex flex-col gap-1 py-2">
              <Receipt className="h-4 w-4" />
              <span className="text-xs">Invoice</span>
            </TabsTrigger>
            <TabsTrigger value="tte" className="flex flex-col gap-1 py-2">
              <FileSignature className="h-4 w-4" />
              <span className="text-xs">TTE</span>
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="flex flex-col gap-1 py-2">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Cashflow</span>
            </TabsTrigger>
          </TabsList>

          {/* Settings */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Pengaturan Sistem
                </CardTitle>
                <CardDescription>
                  Konfigurasi data perusahaan, logo, dan pengaturan TTE
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Profil Perusahaan</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-medium mb-2">Logo Perusahaan</h4>
                      <p className="text-sm text-muted-foreground">
                        Upload logo perusahaan yang akan tampil di kop surat Quotation dan Invoice. 
                        Format yang didukung: PNG, JPG. Ukuran maksimal: 2MB.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-medium mb-2">Data Perusahaan</h4>
                      <p className="text-sm text-muted-foreground">
                        Isi nama perusahaan, NPWP, alamat lengkap, nomor telepon, email, dan website. 
                        Data ini akan muncul di semua dokumen resmi.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Informasi Rekening Bank</h3>
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      Masukkan informasi rekening bank untuk ditampilkan di Invoice. 
                      Format yang disarankan: "Bank [Nama Bank] Cabang [Cabang] | No. Rek: [Nomor] | A.n. [Nama Pemilik]"
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Pengaturan TTE (Tanda Tangan Elektronik)</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-medium mb-2">TTE Global</h4>
                      <p className="text-sm text-muted-foreground">
                        Pengaturan TTE default yang berlaku untuk semua dokumen. 
                        Isi nama penandatangan dan jabatan yang akan tampil di QR Code.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-medium mb-2">TTE Per-User</h4>
                      <p className="text-sm text-muted-foreground">
                        Setiap user dapat memiliki pengaturan TTE sendiri melalui menu Admin. 
                        Dokumen yang dibuat akan menggunakan TTE sesuai akun pembuat.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-400">Penting</p>
                      <p className="text-sm text-muted-foreground">
                        Pastikan semua pengaturan sudah terisi dengan benar sebelum membuat dokumen. 
                        Data yang tidak lengkap akan membuat dokumen terlihat tidak profesional.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients */}
          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Manajemen Klien
                </CardTitle>
                <CardDescription>
                  Kelola database klien dan informasi kontak
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Menambah Klien Baru</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Buka menu <Badge variant="secondary">Klien</Badge> dari sidebar</li>
                    <li>Klik tombol <Badge>Tambah Klien</Badge></li>
                    <li>Isi formulir data klien:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>Nama Perusahaan/Instansi</li>
                        <li>Tipe Klien (Pemerintah/Swasta)</li>
                        <li>Alamat Lengkap</li>
                        <li>Nama PIC (Person in Charge)</li>
                        <li>Email dan Nomor Telepon PIC</li>
                      </ul>
                    </li>
                    <li>Klik <Badge>Simpan</Badge></li>
                  </ol>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Tipe Klien</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <Badge className="mb-2">Pemerintah</Badge>
                      <p className="text-sm text-muted-foreground">
                        Instansi pemerintah, BUMN, atau lembaga negara. 
                        Biasanya memerlukan format dokumen khusus dan proses pengadaan formal.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <Badge variant="secondary" className="mb-2">Swasta</Badge>
                      <p className="text-sm text-muted-foreground">
                        Perusahaan swasta, startup, atau organisasi non-pemerintah. 
                        Proses lebih fleksibel dan cepat.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="flex gap-2">
                    <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-700 dark:text-blue-400">Tips</p>
                      <p className="text-sm text-muted-foreground">
                        Anda juga dapat menambah klien baru secara langsung saat membuat Quotation. 
                        Klik "Tambah Klien Baru" pada form pembuatan Quotation.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects */}
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Manajemen Proyek
                </CardTitle>
                <CardDescription>
                  Buat dan kelola proyek beserta termin pembayaran
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Membuat Proyek Baru</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Buka menu <Badge variant="secondary">Proyek</Badge></li>
                    <li>Klik <Badge>Tambah Proyek</Badge></li>
                    <li>Pilih klien dari dropdown atau tambah klien baru</li>
                    <li>Isi informasi proyek:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>Nama Proyek</li>
                        <li>Deskripsi</li>
                        <li>Nilai Total Proyek</li>
                        <li>Tanggal Mulai dan Selesai</li>
                      </ul>
                    </li>
                    <li>Tambahkan termin pembayaran</li>
                    <li>Klik <Badge>Simpan</Badge></li>
                  </ol>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Termin Pembayaran (Milestone)</h3>
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-3">
                      Termin adalah tahapan pembayaran yang dikaitkan dengan kondisi tertentu. 
                      Total persentase semua termin harus 100%.
                    </p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">Jenis Kondisi:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• <strong>SPK Ditandatangani</strong> - Setelah kontrak ditandatangani</li>
                          <li>• <strong>Laporan Progress</strong> - Setelah laporan progress diterima</li>
                          <li>• <strong>BAST</strong> - Setelah serah terima pekerjaan</li>
                          <li>• <strong>Maintenance</strong> - Periode pemeliharaan</li>
                          <li>• <strong>Custom</strong> - Kondisi khusus lainnya</li>
                        </ul>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">Contoh Termin:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Termin 1: 30% - SPK Ditandatangani</li>
                          <li>• Termin 2: 40% - Laporan Progress 50%</li>
                          <li>• Termin 3: 20% - BAST</li>
                          <li>• Termin 4: 10% - Maintenance 3 bulan</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Status Proyek</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Pipeline</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Badge className="bg-primary">Won</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="secondary">Completed</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Atau bisa menjadi <Badge variant="destructive">Lost</Badge> jika proyek tidak jadi dilanjutkan.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pipeline */}
          <TabsContent value="pipeline">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Sales Pipeline
                </CardTitle>
                <CardDescription>
                  Lacak prospek dan peluang penjualan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Tahapan Pipeline</h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg border bg-primary/10 border-primary/30">
                      <Badge className="mb-2">Meeting</Badge>
                      <p className="text-sm text-muted-foreground">
                        Tahap pertemuan awal dengan calon klien untuk memahami kebutuhan.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-secondary/50 border-secondary">
                      <Badge variant="secondary" className="mb-2">Proposal</Badge>
                      <p className="text-sm text-muted-foreground">
                        Proposal dan quotation sudah dikirimkan ke klien.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-accent/50 border-accent">
                      <Badge variant="outline" className="mb-2">Negosiasi</Badge>
                      <p className="text-sm text-muted-foreground">
                        Sedang dalam proses negosiasi harga dan scope pekerjaan.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-primary/10 border-primary/30">
                      <Badge className="mb-2">Closing</Badge>
                      <p className="text-sm text-muted-foreground">
                        Finalisasi kontrak, menunggu tanda tangan SPK.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/30 border">
                  <h4 className="font-medium mb-2">Cara Menggunakan Pipeline</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Proyek dengan status "Pipeline" akan otomatis muncul di halaman Pipeline</li>
                    <li>Drag & drop kartu proyek untuk memindahkan antar tahapan</li>
                    <li>Klik kartu untuk melihat detail dan mengedit proyek</li>
                    <li>Ubah status menjadi "Won" saat proyek berhasil closing</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quotation */}
          <TabsContent value="quotation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Pembuatan Quotation
                </CardTitle>
                <CardDescription>
                  Buat penawaran harga profesional dengan format resmi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Cara Membuat Quotation</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Buka menu <Badge variant="secondary">Quotation</Badge></li>
                    <li>Klik <Badge>Tambah Quotation</Badge> atau pilih draft yang ada</li>
                    <li>Isi informasi penawaran:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>Pilih klien atau tambah klien baru</li>
                        <li>Nomor Quotation (otomatis atau manual)</li>
                        <li>Tanggal dan masa berlaku</li>
                      </ul>
                    </li>
                    <li>Tambahkan item pekerjaan:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>Nama item/deskripsi pekerjaan</li>
                        <li>Kuantitas dan satuan</li>
                        <li>Harga satuan</li>
                      </ul>
                    </li>
                    <li>Atur PPN (default 11%)</li>
                    <li>Preview PDF untuk melihat hasil</li>
                    <li>Download atau simpan sebagai draft</li>
                  </ol>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Fitur Quotation</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-medium mb-2">Kalkulasi Otomatis</h4>
                      <p className="text-sm text-muted-foreground">
                        Subtotal, PPN, dan grand total dihitung otomatis. 
                        Angka terbilang juga dihasilkan secara otomatis dalam bahasa Indonesia.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-medium mb-2">Template Profesional</h4>
                      <p className="text-sm text-muted-foreground">
                        PDF menggunakan template resmi dengan kop surat perusahaan, 
                        logo, dan informasi kontak yang diambil dari pengaturan.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-medium mb-2">TTE Terintegrasi</h4>
                      <p className="text-sm text-muted-foreground">
                        Setiap quotation menyertakan QR Code TTE yang dapat diverifikasi 
                        untuk membuktikan keaslian dokumen.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-medium mb-2">Status Tracking</h4>
                      <p className="text-sm text-muted-foreground">
                        Lacak status quotation: Draft, Sent, Approved, atau Rejected.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-primary">Quotation Sudah Aktif!</p>
                      <p className="text-sm text-muted-foreground">
                        Fitur pembuatan Quotation sudah dapat digunakan. Anda dapat membuat, 
                        mengedit, dan mengunduh PDF quotation dengan format profesional.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoice */}
          <TabsContent value="invoice">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Manajemen Invoice
                </CardTitle>
                <CardDescription>
                  Kelola tagihan berdasarkan termin proyek
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Cara Kerja Invoice</h3>
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-3">
                      Invoice dibuat berdasarkan termin pembayaran yang sudah dikonfigurasi di proyek. 
                      Setiap termin dapat dibuatkan invoice-nya masing-masing.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">Proyek + Termin</Badge>
                      <ArrowRight className="h-4 w-4" />
                      <Badge variant="outline">Buat Invoice</Badge>
                      <ArrowRight className="h-4 w-4" />
                      <Badge variant="outline">Kirim ke Klien</Badge>
                      <ArrowRight className="h-4 w-4" />
                      <Badge variant="outline">Terima Pembayaran</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Status Invoice</h3>
                  <div className="grid md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg border text-center">
                      <Badge variant="secondary" className="mb-2">Draft</Badge>
                      <p className="text-xs text-muted-foreground">Invoice belum dikirim</p>
                    </div>
                    <div className="p-3 rounded-lg border text-center">
                      <Badge className="mb-2">Sent</Badge>
                      <p className="text-xs text-muted-foreground">Sudah dikirim ke klien</p>
                    </div>
                    <div className="p-3 rounded-lg border text-center">
                      <Badge variant="outline" className="mb-2">Paid</Badge>
                      <p className="text-xs text-muted-foreground">Pembayaran diterima</p>
                    </div>
                    <div className="p-3 rounded-lg border text-center">
                      <Badge variant="destructive" className="mb-2">Overdue</Badge>
                      <p className="text-xs text-muted-foreground">Melewati jatuh tempo</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Fitur Invoice</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Template PDF dengan format resmi dan kop surat perusahaan</li>
                    <li>Informasi rekening bank otomatis dari pengaturan</li>
                    <li>Konversi angka ke terbilang dalam bahasa Indonesia</li>
                    <li>TTE dengan QR Code untuk verifikasi keaslian</li>
                    <li>Tracking status pembayaran real-time</li>
                    <li>Notifikasi invoice overdue</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-primary">Invoice Sudah Aktif!</p>
                      <p className="text-sm text-muted-foreground">
                        Fitur pembuatan Invoice sudah dapat digunakan. Buat proyek dengan termin pembayaran, 
                        lalu generate invoice untuk setiap termin.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TTE */}
          <TabsContent value="tte">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-5 w-5" />
                  Tanda Tangan Elektronik (TTE)
                </CardTitle>
                <CardDescription>
                  Tandatangani dokumen secara elektronik dengan QR Code verifikasi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Cara Menggunakan TTE Dokumen</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Buka menu <Badge variant="secondary">TTE Dokumen</Badge></li>
                    <li>Upload file yang akan ditandatangani (PDF, gambar, atau dokumen lain)</li>
                    <li>Pilih posisi QR Code pada dokumen</li>
                    <li>Isi atau konfirmasi nama dan jabatan penandatangan</li>
                    <li>Klik <Badge>Tanda Tangani</Badge></li>
                    <li>Download hasil dokumen yang sudah ditandatangani</li>
                  </ol>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Fitur TTE</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-medium mb-2">Batch Signing</h4>
                      <p className="text-sm text-muted-foreground">
                        Tandatangani beberapa dokumen sekaligus dengan satu kali proses.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-medium mb-2">Regenerate TTE</h4>
                      <p className="text-sm text-muted-foreground">
                        Buat ulang TTE dengan pengaturan baru tanpa upload ulang file asli.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-medium mb-2">Verifikasi Publik</h4>
                      <p className="text-sm text-muted-foreground">
                        Pihak eksternal dapat memverifikasi keaslian dokumen dengan scan QR Code 
                        atau kunjungi halaman <code className="bg-muted px-1 rounded">/verify</code>.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-medium mb-2">Riwayat Dokumen</h4>
                      <p className="text-sm text-muted-foreground">
                        Semua dokumen yang ditandatangani tersimpan dan dapat diakses kembali.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Verifikasi Dokumen</h3>
                  <div className="p-4 rounded-lg border bg-primary/5 border-primary/30">
                    <p className="text-sm text-muted-foreground mb-2">
                      Untuk memverifikasi keaslian dokumen:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Scan QR Code pada dokumen menggunakan kamera smartphone</li>
                      <li>Atau buka halaman <code className="bg-muted px-1 rounded">/verify</code></li>
                      <li>Masukkan ID Verifikasi yang tertera pada QR Code</li>
                      <li>Sistem akan menampilkan informasi dokumen jika valid</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cashflow */}
          <TabsContent value="cashflow">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Proyeksi Cashflow
                </CardTitle>
                <CardDescription>
                  Pantau arus kas berdasarkan jadwal pembayaran termin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Tentang Cashflow</h3>
                  <p className="text-sm text-muted-foreground">
                    Halaman Cashflow menampilkan proyeksi penerimaan kas berdasarkan jadwal jatuh tempo 
                    termin pembayaran dari semua proyek aktif. Ini membantu tim finance untuk:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Memprediksi arus kas masuk</li>
                    <li>Mengidentifikasi periode dengan penerimaan rendah</li>
                    <li>Merencanakan pengeluaran operasional</li>
                    <li>Memantau invoice yang mendekati jatuh tempo</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Fitur Cashflow</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-medium mb-2">Tampilan Kalender</h4>
                      <p className="text-sm text-muted-foreground">
                        Lihat jadwal pembayaran dalam format kalender bulanan.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-medium mb-2">Grafik Proyeksi</h4>
                      <p className="text-sm text-muted-foreground">
                        Visualisasi proyeksi penerimaan per bulan dalam bentuk chart.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Role Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Hak Akses Berdasarkan Role
            </CardTitle>
            <CardDescription>
              Setiap role memiliki akses ke fitur yang berbeda
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
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-3 px-4">Dashboard</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Dashboard PM</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Klien</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Pipeline</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Quotation</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Invoice</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">TTE Dokumen</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Cashflow</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4">-</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Pengaturan & Admin</td>
                    <td className="text-center py-3 px-4"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
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
