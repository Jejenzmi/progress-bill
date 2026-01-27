import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShieldCheck, 
  ShieldX, 
  Search, 
  FileSignature, 
  Loader2,
  Calendar,
  User,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface VerificationResult {
  verification_id: string;
  original_file_name: string;
  signer_name: string;
  signer_position: string;
  signed_at: string;
  file_type: string;
}

export default function VerifyDocument() {
  const [searchParams] = useSearchParams();
  const [verificationId, setVerificationId] = useState(searchParams.get('id') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl) {
      setVerificationId(idFromUrl);
      handleVerify(idFromUrl);
    }
  }, [searchParams]);

  const handleVerify = async (id?: string) => {
    const searchId = id || verificationId.trim();
    if (!searchId) {
      setError('Masukkan ID Verifikasi');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSearched(true);

    try {
      const { data, error: queryError } = await supabase
        .from('document_verifications')
        .select('*')
        .eq('verification_id', searchId.toUpperCase())
        .maybeSingle();

      if (queryError) throw queryError;

      if (data) {
        setResult(data);
      } else {
        setError('Dokumen tidak ditemukan. Pastikan ID verifikasi sudah benar.');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError('Terjadi kesalahan saat memverifikasi dokumen.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Verifikasi Dokumen TTE</span>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Aplikasi
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Title Section */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Verifikasi Dokumen</h1>
            <p className="text-muted-foreground">
              Masukkan ID Verifikasi dari QR Code untuk memvalidasi keaslian dokumen
            </p>
          </div>

          {/* Search Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Cari Dokumen
              </CardTitle>
              <CardDescription>
                ID Verifikasi dapat ditemukan dengan memindai QR Code pada dokumen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  placeholder="Masukkan ID Verifikasi (contoh: ABCD1234EFGH)"
                  value={verificationId}
                  onChange={(e) => setVerificationId(e.target.value.toUpperCase())}
                  className="font-mono"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results */}
          {searched && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              {result ? (
                <Card className="border-primary/50 bg-primary/5">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-primary/10">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-primary">Dokumen Terverifikasi</CardTitle>
                        <CardDescription>
                          Dokumen ini telah ditandatangani secara elektronik dan valid
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Document Info */}
                    <div className="grid gap-4">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-background">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Nama Dokumen</p>
                          <p className="font-medium">{result.original_file_name}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-lg bg-background">
                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Ditandatangani Oleh</p>
                          <p className="font-medium">{result.signer_name}</p>
                          <p className="text-sm text-muted-foreground">{result.signer_position}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-lg bg-background">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Tanggal Tanda Tangan</p>
                          <p className="font-medium">
                            {format(new Date(result.signed_at), "EEEE, dd MMMM yyyy 'pukul' HH:mm 'WIB'", { locale: id })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-lg bg-background">
                        <FileSignature className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">ID Verifikasi</p>
                          <p className="font-mono font-medium text-primary">{result.verification_id}</p>
                        </div>
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="text-xs text-muted-foreground border-t pt-4">
                      <p>
                        Dokumen ini telah ditandatangani secara elektronik sesuai dengan ketentuan yang berlaku.
                        Tanda tangan elektronik pada dokumen ini memiliki kekuatan hukum yang sama dengan tanda tangan basah.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : error ? (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-destructive/10">
                        <ShieldX className="h-8 w-8 text-destructive" />
                      </div>
                      <div>
                        <CardTitle className="text-destructive">Verifikasi Gagal</CardTitle>
                        <CardDescription>{error}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Kemungkinan penyebab:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside space-y-1">
                      <li>ID Verifikasi salah atau tidak lengkap</li>
                      <li>Dokumen belum terdaftar dalam sistem</li>
                      <li>QR Code rusak atau tidak terbaca dengan benar</li>
                    </ul>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}

          {/* Info Section */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <h3 className="font-medium mb-3">Cara Verifikasi Dokumen:</h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Scan QR Code yang ada pada dokumen menggunakan kamera smartphone</li>
                <li>Anda akan diarahkan ke halaman ini dengan ID Verifikasi terisi otomatis</li>
                <li>Atau masukkan ID Verifikasi secara manual dari informasi dalam QR Code</li>
                <li>Klik tombol pencarian untuk memverifikasi keaslian dokumen</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground">
        <p>Sistem Verifikasi Tanda Tangan Elektronik (TTE)</p>
      </footer>
    </div>
  );
}