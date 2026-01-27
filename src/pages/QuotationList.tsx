import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PDFPreviewDialog } from '@/components/PDFPreviewDialog';
import { generateQuotationPDF, type QuotationItem, type CompanyProfile, type TTESettings } from '@/lib/quotationPdfGenerator';
import { useUserTTE } from '@/hooks/useUserTTE';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DeleteConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Download,
  FileText,
  Loader2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface Quotation {
  id: string;
  project_name: string;
  client_id: string | null;
  man_days: QuotationItem[];
  grand_total: number | null;
  valid_until: string | null;
  status: string | null;
  created_at: string;
  clients?: {
    name: string;
    address: string | null;
  } | null;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function QuotationList() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { fetchTTEForPDF } = useUserTTE();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          clients (
            name,
            address
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setQuotations((data || []) as unknown as Quotation[]);
    } catch (error: any) {
      console.error('Error fetching quotations:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data quotation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCompanyProfile = async (): Promise<CompanyProfile> => {
    const { data: companyData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'company_profile')
      .maybeSingle();

    const value = companyData?.value as Record<string, unknown> | null;

    return {
      name: (value?.name as string) || 'PT. ZEN MULTIMEDIA INDONESIA',
      npwp: (value?.npwp as string) || '-',
      address: (value?.address as string) || 'Jl. Taman Pahlawan No.166, Purwamekar, Purwakarta, Jawa Barat - Indonesia',
      phone: (value?.phone as string) || '085121045798',
      email: (value?.email as string) || 'info@zenmultimedia.co.id',
      website: (value?.website as string) || 'www.zenmultimedia.co.id',
      bank_info: (value?.bank_info as string) || '-',
      logo_url: (value?.logo_url as string) || '',
    };
  };

  // TTE settings now come from useUserTTE hook - fetchTTEForPDF()

  const handlePreview = async (quotation: Quotation) => {
    const company = await getCompanyProfile();
    const tteSettings = await fetchTTEForPDF();
    
    const items = Array.isArray(quotation.man_days) ? quotation.man_days : [];
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const ppnAmount = Math.round(subtotal * 0.11);
    const grandTotal = subtotal + ppnAmount;

    const validUntil = quotation.valid_until 
      ? new Date(quotation.valid_until) 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const quotationData = {
      quotationNumber: `QUO-${quotation.id.substring(0, 8).toUpperCase()}`,
      quotationDate: new Date(quotation.created_at),
      validUntil,
      clientName: quotation.clients?.name || 'Klien',
      clientAddress: quotation.clients?.address || '',
      projectName: quotation.project_name,
      items,
      subtotal,
      ppnPercentage: 11,
      ppnAmount,
      grandTotal,
    };

    const html = await generateQuotationPDF(quotationData, company, tteSettings);
    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  const handleEdit = (quotation: Quotation) => {
    navigate(`/quotation?edit=${quotation.id}`);
  };

  const handleDelete = async () => {
    if (!quotationToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', quotationToDelete);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Quotation berhasil dihapus',
      });

      fetchQuotations();
    } catch (error: any) {
      console.error('Error deleting quotation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus quotation',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setQuotationToDelete(null);
    }
  };

  const confirmDelete = (id: string) => {
    setQuotationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25">Disetujui</Badge>;
      case 'Sent':
        return <Badge className="bg-sky-500/15 text-sky-700 hover:bg-sky-500/25">Terkirim</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Ditolak</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const filteredQuotations = quotations.filter((q) =>
    q.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AppLayout title="Daftar Quotation" subtitle="Memuat...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Daftar Quotation"
      subtitle="Kelola semua quotation yang tersimpan"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari quotation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button asChild>
          <Link to="/quotation">
            <Plus className="h-4 w-4 mr-2" />
            Buat Quotation Baru
          </Link>
        </Button>
      </div>

      {/* Quotation Table */}
      <Card>
        <CardContent className="p-0">
          {filteredQuotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Belum Ada Quotation</h3>
              <p className="text-muted-foreground mb-4">
                Mulai buat quotation pertama Anda
              </p>
              <Button asChild>
                <Link to="/quotation">
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Quotation
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Klien</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Berlaku Hingga</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-medium">
                      {quotation.project_name}
                    </TableCell>
                    <TableCell>
                      {quotation.clients?.name || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {quotation.grand_total
                        ? formatCurrency(quotation.grand_total)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {quotation.valid_until
                        ? format(new Date(quotation.valid_until), 'dd MMM yyyy', {
                            locale: idLocale,
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(quotation.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(quotation)}
                          title="Lihat PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(quotation)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(quotation.id)}
                          className="text-destructive hover:text-destructive"
                          title="Hapus"
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

      {/* Preview Dialog */}
      <PDFPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        html={previewHtml}
        title="Preview Quotation"
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={quotations.find(q => q.id === quotationToDelete)?.project_name || 'Quotation'}
        itemType="Quotation"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </AppLayout>
  );
}
