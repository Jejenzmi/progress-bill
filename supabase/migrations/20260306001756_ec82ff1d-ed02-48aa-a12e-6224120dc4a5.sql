-- Allow anonymous (public) users to verify documents by scanning QR codes
CREATE POLICY "Anyone can verify documents by verification_id"
ON public.signed_documents
FOR SELECT
TO anon
USING (verification_id IS NOT NULL);