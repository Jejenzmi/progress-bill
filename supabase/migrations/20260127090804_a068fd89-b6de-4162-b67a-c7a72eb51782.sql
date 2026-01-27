-- Drop the security definer view and recreate with security invoker
DROP VIEW IF EXISTS public.document_verifications;

-- Recreate view with security_invoker = true (safer approach)
CREATE VIEW public.document_verifications
WITH (security_invoker = true) AS
SELECT 
  verification_id,
  original_file_name,
  signer_name,
  signer_position,
  signed_at,
  file_type
FROM public.signed_documents
WHERE verification_id IS NOT NULL;

-- Add RLS policy for public verification lookup on signed_documents
CREATE POLICY "Anyone can verify documents by verification_id"
ON public.signed_documents
FOR SELECT
USING (verification_id IS NOT NULL);

-- Grant access to the view
GRANT SELECT ON public.document_verifications TO anon;
GRANT SELECT ON public.document_verifications TO authenticated;