import { useState } from 'react';
import { useContracts, ContractWithDetails } from '@/hooks/useContracts';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/data/mockData';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Search, FileText, MoreVertical, Download, Eye, CheckCircle, Printer, Pen, Upload } from 'lucide-react';
import { printContractPDF, ContractData, ContractCompanyInfo, ContractClientInfo } from '@/lib/contractPdfGenerator';
import { ContractSigningDialog } from '@/components/contracts/ContractSigningDialog';

export default function Contracts() {
  const { contracts, loading, refetch } = useContracts();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedContract, setSelectedContract] = useState<ContractWithDetails | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [signingOpen, setSigningOpen] = useState(false);
  const [printing, setPrinting] = useState(false);

  const canManage = hasRole('admin') || hasRole('marketing') || hasRole('bdo') || hasRole('coo');

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch = 
      contract.contract_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.client?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string, tteStatus?: string | null) => {
    if (tteStatus === 'pending') {
      return <Badge variant="outline" className="border-primary text-primary">Menunggu TTE</Badge>;
    }
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'signed':
        return <Badge variant="default">Ditandatangani</Badge>;
      case 'archived':
        return <Badge variant="outline">Arsip</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handlePrintContract = async (contract: ContractWithDetails) => {
    setPrinting(true);
    try {
      // Get company settings
      const { data: settings } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'company_profile')
        .maybeSingle();

      const companySettings = settings?.value as Record<string, any> || {};

      // Get bank account
      const { data: bankAccount } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_default', true)
        .maybeSingle();

      const company: ContractCompanyInfo = {
        name: companySettings.name || 'PT Zen Multimedia Indonesia',
        npwp: companySettings.npwp || '41.439.836.2-409.000',
        address: companySettings.address || 'Jl. Taman Pahlawan No.166, Purwamekar, Purwakarta, INDONESIA',
        director_name: 'Jejen Jaenudin, SM., M.Kom',
        director_position: 'Direktur Utama',
        email: companySettings.email || 'info@zenmultimedia.co.id',
        phone: companySettings.phone || '085121045798',
        logo_url: companySettings.logo_url,
      };

      const client: ContractClientInfo = {
        company_name: contract.client?.name || '',
        npwp: contract.client?.npwp_badan || '',
        address: contract.client?.address || '',
        pic_name: contract.client_signer_name || contract.client?.pic_name || '',
        pic_nik: contract.client_signer_nik || '',
        pic_position: contract.client_signer_position || 'Direktur',
        pic_phone: contract.client?.pic_phone || '',
        pic_email: contract.client?.pic_email || '',
      };

      const paymentTerms = (contract.payment_terms_snapshot as any[] || []).map((t: any) => ({
        term_name: t.term_name,
        percentage: t.percentage,
        description: t.description,
      }));

      const contractData: ContractData = {
        contract_number: contract.contract_number,
        contract_date: new Date(contract.created_at),
        project_name: contract.project_name,
        project_description: contract.project_description || '',
        total_value: Number(contract.total_value),
        start_date: new Date(contract.start_date),
        end_date: new Date(contract.end_date),
        duration_months: contract.duration_months,
        payment_terms: paymentTerms,
        bank_info: {
          bank_name: bankAccount?.bank_name || 'BCA',
          account_name: bankAccount?.account_name || 'PT Zen Multimedia Indonesia',
          account_number: bankAccount?.account_number || '2312665213',
          branch: 'Purwakarta',
        },
        additional_costs: (contract.additional_costs as any[] || []),
        additional_notes: contract.additional_notes || undefined,
        custom_clauses: (contract.custom_clauses as any[] || []),
        maintenance_period_months: 6,
        free_server_months: 12,
        free_domain_months: 24,
        max_payment_days: 4,
      };

      await printContractPDF(
        contractData,
        company,
        client,
        contract.signer_name || undefined,
        contract.signer_position || undefined
      );
    } catch (error) {
      console.error('Error printing contract:', error);
      toast({
        title: 'Error',
        description: 'Gagal mencetak kontrak',
        variant: 'destructive',
      });
    } finally {
      setPrinting(false);
    }
  };

  const handleMarkSigned = async (contract: ContractWithDetails) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
        })
        .eq('id', contract.id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Kontrak ditandai sebagai sudah ditandatangani',
      });

      refetch();
    } catch (error: any) {
      console.error('Error updating contract:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengupdate status kontrak',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kontrak Kerjasama</h1>
        <p className="text-muted-foreground">
          Kelola kontrak kerjasama (SPK) dengan klien
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Daftar Kontrak</CardTitle>
              <CardDescription>Total {filteredContracts.length} kontrak</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari kontrak..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="signed">Ditandatangani</SelectItem>
                  <SelectItem value="archived">Arsip</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredContracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Belum ada kontrak</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Kontrak dapat dibuat dari quotation yang sudah disetujui
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor Kontrak</TableHead>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Klien</TableHead>
                  <TableHead className="text-right">Nilai</TableHead>
                  <TableHead>Durasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-mono text-sm">{contract.contract_number}</TableCell>
                    <TableCell className="font-medium">{contract.project_name}</TableCell>
                    <TableCell>{contract.client?.name || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(contract.total_value))}
                    </TableCell>
                    <TableCell>
                      {format(new Date(contract.start_date), 'dd MMM yyyy', { locale: idLocale })} - {format(new Date(contract.end_date), 'dd MMM yyyy', { locale: idLocale })}
                    </TableCell>
                    <TableCell>{getStatusBadge(contract.status, contract.tte_status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedContract(contract);
                            setDetailOpen(true);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Lihat Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrintContract(contract)} disabled={printing}>
                            <Printer className="h-4 w-4 mr-2" />
                            Cetak PDF
                          </DropdownMenuItem>
                          {canManage && contract.status === 'draft' && !contract.tte_status && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                setSelectedContract(contract);
                                setSigningOpen(true);
                              }}>
                                <Pen className="h-4 w-4 mr-2" />
                                Tanda Tangan
                              </DropdownMenuItem>
                            </>
                          )}
                          {canManage && contract.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handleMarkSigned(contract)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Tandai Ditandatangani
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Kontrak</DialogTitle>
            <DialogDescription>
              {selectedContract?.contract_number}
            </DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Proyek</p>
                  <p className="font-medium">{selectedContract.project_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Klien</p>
                  <p className="font-medium">{selectedContract.client?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nilai Kontrak</p>
                  <p className="font-medium">{formatCurrency(Number(selectedContract.total_value))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedContract.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Mulai</p>
                  <p className="font-medium">{format(new Date(selectedContract.start_date), 'dd MMMM yyyy', { locale: idLocale })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Selesai</p>
                  <p className="font-medium">{format(new Date(selectedContract.end_date), 'dd MMMM yyyy', { locale: idLocale })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Penandatangan (Pihak Pertama)</p>
                  <p className="font-medium">{selectedContract.signer_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedContract.signer_position}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Penandatangan (Pihak Kedua)</p>
                  <p className="font-medium">{selectedContract.client_signer_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedContract.client_signer_position}</p>
                </div>
              </div>

              {selectedContract.project_description && (
                <div>
                  <p className="text-sm text-muted-foreground">Deskripsi</p>
                  <p>{selectedContract.project_description}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={() => handlePrintContract(selectedContract)} disabled={printing}>
                  {printing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
                  Cetak PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Signing Dialog */}
      <ContractSigningDialog
        contract={selectedContract}
        open={signingOpen}
        onOpenChange={setSigningOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
