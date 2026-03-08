
-- Drop the existing RESTRICTIVE policy (won't work for anon)
DROP POLICY IF EXISTS "Anyone can verify documents by verification_id" ON public.signed_documents;

-- Create a PERMISSIVE policy for anon to verify documents
CREATE POLICY "Public can verify documents by verification_id"
ON public.signed_documents
FOR SELECT
TO anon, authenticated
USING (verification_id IS NOT NULL);
