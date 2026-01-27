-- Add verification_id column to signed_documents
ALTER TABLE public.signed_documents 
ADD COLUMN verification_id TEXT UNIQUE;

-- Create index for fast lookup
CREATE INDEX idx_signed_documents_verification_id ON public.signed_documents(verification_id);

-- Create a public view for verification (only exposes necessary fields)
CREATE VIEW public.document_verifications
WITH (security_invoker = false) AS
SELECT 
  verification_id,
  original_file_name,
  signer_name,
  signer_position,
  signed_at,
  file_type
FROM public.signed_documents
WHERE verification_id IS NOT NULL;

-- Grant public access to the view
GRANT SELECT ON public.document_verifications TO anon;
GRANT SELECT ON public.document_verifications TO authenticated;