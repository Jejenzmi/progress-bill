import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload, Pen, QrCode, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ContractWithDetails } from '@/hooks/useContracts';
import { 
  generateContractPDF, 
  generateContractPDFWithTTE,
  ContractData, 
  ContractCompanyInfo, 
  ContractClientInfo,
  ContractTTEInfo,
} from '@/lib/contractPdfGenerator';

interface ContractSigningDialogProps {
  contract: ContractWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type SigningMethod = 'tte' | 'wet';
type TTESignerType = 'ceo' | 'coo';

export function ContractSigningDialog({
  contract,
  open,
  onOpenChange,
  onSuccess,
}: ContractSigningDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [signingMethod, setSigningMethod] = useState<SigningMethod>('tte');
  const [tteSignerType, setTteSignerType] = useState<TTESignerType>('ceo');
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);

  const handleTTESigning = async () => {
    if (!contract || !user) return;

    setLoading(true);
    try {
      const signerInfo = tteSignerType === 'ceo'
        ? { name: 'Jejen Jaenudin, SM., M.Kom', position: 'Direktur Utama' }
        : { name: 'Indra Apriana, S.Kom', position: 'Chief Operating Officer' };

      // Generate PDF blob first
      const { data: settings } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'company_profile')
        .maybeSingle();

      const { data: bankAccount } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_default', true)
        .maybeSingle();

      const companySettings = settings?.value as Record<string, any> || {};

      const company: ContractCompanyInfo = {
        name: companySettings.name || 'PT Zen Multimedia Indonesia',
        npwp: companySettings.npwp || '41.439.836.2-409.000',
        address: companySettings.address || 'Jl. Taman Pahlawan No.166, Purwamekar, Purwakarta, INDONESIA',
        director_name: signerInfo.name,
        director_position: signerInfo.position,
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

      // Generate HTML content with TTE QR Code
      const { html: htmlContent, verificationId } = await generateContractPDFWithTTE(
        contractData,
        company,
        client,
        signerInfo.name,
        signerInfo.position
      );

      // Create a Blob from HTML content
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });

      // Upload to storage (HTML file that can be printed to PDF)
      const fileName = `contracts/${contract.id}/contract_${Date.now()}.html`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, htmlBlob, {
          contentType: 'text/html',
        });

      if (uploadError) throw uploadError;

      // Create signed_documents record
      const { data: signedDoc, error: docError } = await supabase
        .from('signed_documents')
        .insert({
          user_id: user.id,
          original_file_name: `SPK_${contract.contract_number}.pdf`,
          original_file_path: fileName,
          file_type: 'application/pdf',
          signer_name: signerInfo.name,
          signer_position: signerInfo.position,
          signer_type: tteSignerType,
          qr_position: 'bottom-right',
          qr_page: 1,
          verification_id: verificationId,
          tte_status: tteSignerType === 'ceo' ? 'pending' : 'pending',
          submitted_at: new Date().toISOString(),
          submitted_by: user.id,
        })
        .select()
        .single();

      if (docError) throw docError;

      // Update contract with TTE info
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          tte_enabled: true,
          tte_status: 'pending',
          tte_document_id: signedDoc.id,
          signer_type: tteSignerType,
          signer_name: signerInfo.name,
          signer_position: signerInfo.position,
        })
        .eq('id', contract.id);

      if (updateError) throw updateError;

      toast({
        title: 'Berhasil',
        description: `Kontrak berhasil diajukan untuk TTE ${tteSignerType.toUpperCase()}. Menunggu persetujuan.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting TTE:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengajukan TTE',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWetSignatureUpload = async () => {
    if (!contract || !user || !uploadingFile) return;

    setLoading(true);
    try {
      // Validate file type
      if (!uploadingFile.type.includes('pdf')) {
        throw new Error('Hanya file PDF yang diperbolehkan');
      }

      // Upload to storage
      const fileName = `contracts/${contract.id}/signed_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, uploadingFile, {
          contentType: 'application/pdf',
        });

      if (uploadError) throw uploadError;

      // Update contract
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          signed_by: user.id,
          signed_contract_path: fileName,
          signed_contract_uploaded_at: new Date().toISOString(),
          signed_contract_uploaded_by: user.id,
          tte_enabled: false,
        })
        .eq('id', contract.id);

      if (updateError) throw updateError;

      toast({
        title: 'Berhasil',
        description: 'Kontrak yang sudah ditandatangani berhasil diupload',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error uploading signed contract:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengupload kontrak',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!contract) return null;

  const isAlreadySigned = contract.status === 'signed';
  const hasPendingTTE = contract.tte_status === 'pending';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="h-5 w-5" />
            Tanda Tangan Kontrak
          </DialogTitle>
          <DialogDescription>
            {contract.contract_number} - {contract.project_name}
          </DialogDescription>
        </DialogHeader>

        {isAlreadySigned ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <p className="text-center text-muted-foreground">
              Kontrak ini sudah ditandatangani
            </p>
          </div>
        ) : hasPendingTTE ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <AlertCircle className="h-12 w-12 text-primary" />
            <p className="text-center text-muted-foreground">
              Kontrak sedang menunggu persetujuan TTE
            </p>
          </div>
        ) : (
          <Tabs value={signingMethod} onValueChange={(v) => setSigningMethod(v as SigningMethod)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tte" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                TTE Digital
              </TabsTrigger>
              <TabsTrigger value="wet" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Basah
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tte" className="space-y-4 pt-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Kontrak akan ditandatangani secara digital dengan TTE (Tanda Tangan Elektronik) 
                  dan QR Code verifikasi.
                </p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Penandatangan (Pihak Pertama)</Label>
                    <Select value={tteSignerType} onValueChange={(v) => setTteSignerType(v as TTESignerType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ceo">CEO - Jejen Jaenudin, SM., M.Kom</SelectItem>
                        <SelectItem value="coo">COO - Indra Apriana, S.Kom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      Kontrak akan menunggu persetujuan dari {tteSignerType.toUpperCase()} sebelum ditandatangani
                    </span>
                  </div>
                </div>
              </div>

              <Button onClick={handleTTESigning} disabled={loading} className="w-full">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Ajukan TTE
              </Button>
            </TabsContent>

            <TabsContent value="wet" className="space-y-4 pt-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Upload kontrak yang sudah ditandatangani secara fisik (tanda tangan basah). 
                  File harus dalam format PDF.
                </p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>File Kontrak (PDF)</Label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setUploadingFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  {uploadingFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{uploadingFile.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleWetSignatureUpload} 
                disabled={loading || !uploadingFile} 
                className="w-full"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Upload Kontrak
              </Button>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
