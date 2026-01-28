-- Allow all authenticated users to download from quotations folder
CREATE POLICY "Users can view quotation documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'signed-documents' 
  AND (storage.foldername(name))[1] = 'quotations'
);

-- Allow all authenticated users to download from signed-documents bucket for their own docs OR quotations
CREATE POLICY "Authenticated users can view signed documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'signed-documents' 
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR (storage.foldername(name))[1] = 'quotations'
  )
);