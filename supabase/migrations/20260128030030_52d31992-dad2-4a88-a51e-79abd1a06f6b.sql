-- Add TTE approval workflow columns to signed_documents table
ALTER TABLE public.signed_documents 
ADD COLUMN IF NOT EXISTS tte_status text DEFAULT 'draft' CHECK (tte_status IN ('draft', 'pending', 'approved', 'rejected', 'signed')),
ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS submitted_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejected_by uuid,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS signer_type text DEFAULT 'self' CHECK (signer_type IN ('self', 'coo', 'ceo'));

-- Update existing documents to have 'signed' status (already signed)
UPDATE public.signed_documents 
SET tte_status = 'signed' 
WHERE tte_status IS NULL OR tte_status = 'draft';

-- Create index for pending approvals
CREATE INDEX IF NOT EXISTS idx_signed_documents_tte_status ON public.signed_documents(tte_status);
CREATE INDEX IF NOT EXISTS idx_signed_documents_signer_type ON public.signed_documents(signer_type);