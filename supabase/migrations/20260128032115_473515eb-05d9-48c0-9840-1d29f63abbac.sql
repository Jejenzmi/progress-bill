-- Allow COO to download documents for their approval
CREATE POLICY "COO can download documents for approval"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'signed-documents'
  AND has_role(auth.uid(), 'coo')
);

-- Allow COO to upload signed documents
CREATE POLICY "COO can upload signed documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'signed-documents'
  AND has_role(auth.uid(), 'coo')
);

-- Allow Admin to download all documents
CREATE POLICY "Admin can download all documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'signed-documents'
  AND has_role(auth.uid(), 'admin')
);

-- Allow Admin to upload signed documents
CREATE POLICY "Admin can upload signed documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'signed-documents'
  AND has_role(auth.uid(), 'admin')
);