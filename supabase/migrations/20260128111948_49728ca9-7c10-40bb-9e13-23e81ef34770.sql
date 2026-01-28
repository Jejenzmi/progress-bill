-- Create contracts table for Surat Perjanjian Kerjasama (SPK)
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number VARCHAR(100) NOT NULL UNIQUE,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  
  -- Contract details from quotation
  project_name VARCHAR(255) NOT NULL,
  project_description TEXT,
  total_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- Duration
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 3,
  
  -- Payment terms snapshot (JSON array)
  payment_terms_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Additional costs and notes
  additional_costs JSONB DEFAULT '[]'::jsonb,
  additional_notes TEXT,
  
  -- Custom pasal/clauses (JSON array for custom sections)
  custom_clauses JSONB DEFAULT '[]'::jsonb,
  
  -- Company settings snapshot (for PDF generation)
  company_settings JSONB,
  
  -- Signing configuration
  signer_type VARCHAR(20) NOT NULL DEFAULT 'ceo', -- 'ceo' or 'coo'
  signer_name VARCHAR(255),
  signer_position VARCHAR(255),
  
  -- Client signing
  client_signer_name VARCHAR(255),
  client_signer_position VARCHAR(255),
  client_signer_nik VARCHAR(50),
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, signed, archived
  
  -- TTE integration (for digital signing)
  tte_enabled BOOLEAN DEFAULT FALSE,
  tte_status VARCHAR(50), -- pending, approved, rejected
  tte_document_id UUID REFERENCES public.signed_documents(id),
  
  -- Audit fields
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by UUID
);

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin full access to contracts"
ON public.contracts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Marketing can view and create contracts"
ON public.contracts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'marketing'));

CREATE POLICY "Marketing can insert contracts"
ON public.contracts FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'marketing'));

CREATE POLICY "BDO can view and manage contracts"
ON public.contracts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'bdo'));

CREATE POLICY "COO can view and manage contracts"
ON public.contracts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'coo'));

CREATE POLICY "Finance can view contracts"
ON public.contracts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'finance'));

CREATE POLICY "PM can view contracts"
ON public.contracts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'project_manager'));

-- Add trigger for updated_at
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add contract_id to projects table to link contract
ALTER TABLE public.projects ADD COLUMN contract_id UUID REFERENCES public.contracts(id);

-- Create index for faster lookups
CREATE INDEX idx_contracts_quotation_id ON public.contracts(quotation_id);
CREATE INDEX idx_contracts_project_id ON public.contracts(project_id);
CREATE INDEX idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);