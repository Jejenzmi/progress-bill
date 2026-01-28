-- Add signed_contract_path to contracts for uploaded wet signature contracts
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS signed_contract_path TEXT,
ADD COLUMN IF NOT EXISTS signed_contract_uploaded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS signed_contract_uploaded_by UUID;

-- Create storage bucket for contract documents if not exists (use documents bucket)
-- Contract files will be stored in documents bucket under contracts/ folder

-- Update RLS on documents bucket to allow contract file access
-- (Documents bucket already exists, just ensure contracts folder access)

-- Add comment for clarity
COMMENT ON COLUMN public.contracts.signed_contract_path IS 'Path to uploaded signed contract (wet signature) in storage';
COMMENT ON COLUMN public.contracts.tte_document_id IS 'Reference to signed_documents for TTE digital signature';
COMMENT ON COLUMN public.contracts.tte_status IS 'Status of TTE: pending, approved, rejected';
COMMENT ON COLUMN public.contracts.tte_enabled IS 'Whether TTE digital signature is used for this contract';