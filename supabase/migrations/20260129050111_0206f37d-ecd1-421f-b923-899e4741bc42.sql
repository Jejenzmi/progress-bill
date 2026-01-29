-- Create contract_templates table for storing reusable contract templates
CREATE TABLE public.contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  party1_obligations JSONB DEFAULT '[]'::jsonb,
  party2_obligations JSONB DEFAULT '[]'::jsonb,
  standard_clauses JSONB DEFAULT '[]'::jsonb,
  maintenance_terms TEXT,
  confidentiality_terms TEXT,
  dispute_terms TEXT,
  force_majeure_terms TEXT,
  sanction_terms TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for contract templates (admin and authenticated users can read, only admin can modify)
CREATE POLICY "Anyone authenticated can view contract templates" 
ON public.contract_templates 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can insert contract templates" 
ON public.contract_templates 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin can update contract templates" 
ON public.contract_templates 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can delete contract templates" 
ON public.contract_templates 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contract_templates_updated_at
BEFORE UPDATE ON public.contract_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default template
INSERT INTO public.contract_templates (name, description, is_default, party1_obligations, party2_obligations, standard_clauses)
VALUES (
  'Template Standar SPK',
  'Template default untuk Surat Perjanjian Kerja proyek IT',
  true,
  '[
    "Melaksanakan pekerjaan sesuai dengan ruang lingkup yang telah disepakati",
    "Menyediakan tenaga ahli yang kompeten untuk pelaksanaan proyek",
    "Memberikan laporan progress secara berkala kepada PIHAK KEDUA",
    "Menjaga kerahasiaan data dan informasi milik PIHAK KEDUA",
    "Menyelesaikan pekerjaan sesuai jadwal yang telah ditentukan"
  ]'::jsonb,
  '[
    "Menyediakan data dan informasi yang diperlukan untuk pelaksanaan proyek",
    "Memberikan akses yang diperlukan kepada tim PIHAK PERTAMA",
    "Melakukan pembayaran sesuai dengan termin yang telah disepakati",
    "Menunjuk PIC (Person In Charge) untuk koordinasi proyek",
    "Memberikan feedback dan approval dalam waktu yang wajar"
  ]'::jsonb,
  '[
    {"title": "Ketentuan Khusus", "content": "Segala perubahan terhadap ruang lingkup pekerjaan harus disetujui secara tertulis oleh kedua belah pihak dan dapat mempengaruhi jadwal serta biaya proyek."}
  ]'::jsonb
);